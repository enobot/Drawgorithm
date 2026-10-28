# Drawgorithms tracer for Python. Runs the learner's code under sys.settrace inside Pyodide
# and records the same trace the JavaScript interpreter records (src/trace/types.ts): one
# step per line that ran, with every user frame's variables, a snapshot of the objects they
# reach, and effects read by comparing each step with the one before. Static hints come
# from the code's syntax tree, so the board picks the same drawings it does for JavaScript.
#
# Python reports lines, calls and returns, not the reads inside an expression, so a Python
# step shows what changed but never which values were only read or compared.
import ast
import json
import keyword
import math
import sys
from collections import deque

USER_FILE = '<your code>'
MAX_ITEMS = 200
MAX_OBJECTS = 600
MAX_CHARS = 200
MAX_OUTPUT_LINES = 1000
# Markers for numbers JSON can't hold; the page turns them back into numbers.
SPECIAL = {math.inf: '\x00Infinity', -math.inf: '\x00-Infinity'}
NAN = '\x00NaN'
BLOCKED_MODULES = {'js', 'pyodide', 'pyodide_js', '_pyodide', 'micropip', 'pyodide.ffi', 'pyodide.http'}


class LimitError(Exception):
    pass


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


PROVIDED = {'TreeNode': TreeNode, 'ListNode': ListNode}


def json_number(v):
    if isinstance(v, float):
        if math.isnan(v):
            return NAN
        if math.isinf(v):
            return SPECIAL[v]
    if isinstance(v, int) and abs(v) > 2**53:
        return float(v)
    return v


def short(text, limit=40):
    return text if len(text) <= limit else text[: limit - 1] + '…'


class Tracer:
    def __init__(self, source, limits):
        self.source = source
        self.lines = source.split('\n')
        self.offsets = []
        at = 0
        for line in self.lines:
            self.offsets.append(at)
            at += len(line) + 1
        self.limits = limits
        self.steps = []
        self.output = []
        self.obj_ids = {}
        # Objects that got an id stay alive for the run, so Python never reuses their id().
        self.keep = []
        self.frame_ids = {}
        self.labels = {}
        self.next_frame = 1
        self.pending = {}
        self.raising = set()
        self.stack = []
        self.module_ns = None
        self.module_frame = None
        self.module_line = None
        self.prev_vars = {}
        self.prev_heap = {}
        self.values = 0
        self.error_frames = None
        self.error_line = None
        self.error_exc = None
        self.entry_frame_id = None
        # Set while the runner calls the entry function: its first call is the entry frame.
        self.expect_entry = False

    # ------------------------------------------------------------ locations and values

    def loc(self, line):
        if not line or line < 1 or line > len(self.lines):
            return None
        text = self.lines[line - 1]
        indent = len(text) - len(text.lstrip())
        start = self.offsets[line - 1]
        return {'line': line, 'column': indent, 'endLine': line, 'endColumn': len(text.rstrip()), 'start': start + indent, 'end': start + len(text.rstrip())}

    def oid(self, obj):
        key = id(obj)
        if key not in self.obj_ids:
            self.obj_ids[key] = len(self.obj_ids) + 1
            self.keep.append(obj)
        return self.obj_ids[key]

    def is_heap(self, v):
        if isinstance(v, (list, tuple, dict, set, frozenset, deque)):
            return True
        return hasattr(v, '__dict__') and not isinstance(v, type) and not callable(v)

    def snap(self, v, queue):
        self.values += 1
        if v is None:
            return {'t': 'null'}
        if isinstance(v, bool):
            return {'t': 'boolean', 'v': v}
        if isinstance(v, (int, float)):
            return {'t': 'number', 'v': json_number(v)}
        if isinstance(v, str):
            self.values += min(len(v), MAX_CHARS) // 50
            return {'t': 'string', 'v': v[:MAX_CHARS], 'len': len(v)} if len(v) > MAX_CHARS else {'t': 'string', 'v': v}
        if isinstance(v, type):
            return {'t': 'function', 'name': v.__name__}
        if callable(v):
            return {'t': 'function', 'name': getattr(v, '__name__', 'function')}
        if self.is_heap(v):
            queue.append(v)
            return {'t': 'ref', 'id': self.oid(v)}
        return {'t': 'string', 'v': short(repr(v), MAX_CHARS)}

    def heap_of(self, queue):
        heap = {}
        count = 0
        while queue and count < MAX_OBJECTS:
            obj = queue.pop(0)
            i = self.oid(obj)
            if i in heap:
                continue
            count += 1
            if isinstance(obj, (list, tuple, deque)):
                items = [self.snap(x, queue) for _, x in zip(range(MAX_ITEMS), obj)]
                heap[i] = {'kind': 'array', 'id': i, 'items': items, 'total': len(obj)}
            elif isinstance(obj, dict):
                entries = [[self.snap(k, queue), self.snap(x, queue)] for _, (k, x) in zip(range(MAX_ITEMS), obj.items())]
                heap[i] = {'kind': 'map', 'id': i, 'entries': entries, 'total': len(obj)}
            elif isinstance(obj, (set, frozenset)):
                try:
                    ordered = sorted(obj)
                except TypeError:
                    ordered = list(obj)
                items = [self.snap(x, queue) for x in ordered[:MAX_ITEMS]]
                heap[i] = {'kind': 'set', 'id': i, 'items': items, 'total': len(obj)}
            else:
                fields = [(k, x) for k, x in vars(obj).items() if not k.startswith('__')]
                heap[i] = {'kind': 'object', 'id': i, 'className': type(obj).__name__, 'entries': [[k, self.snap(x, queue)] for k, x in fields]}
        return heap

    def fmt(self, v, depth=0):
        if v is None:
            return 'None'
        if isinstance(v, bool):
            return 'True' if v else 'False'
        if isinstance(v, (int, float)):
            return repr(v)
        if isinstance(v, str):
            return repr(short(v))
        if isinstance(v, (TreeNode, ListNode)):
            return f'node {self.fmt(v.val, depth + 1)}'
        if isinstance(v, (list, tuple, deque)):
            if depth > 1:
                return f'[…{len(v)}]'
            items = [self.fmt(x, depth + 1) for x in list(v)[:6]]
            if len(v) > 6:
                items.append(f'…{len(v) - 6} more')
            inner = ', '.join(items)
            return f'({inner})' if isinstance(v, tuple) else f'[{inner}]'
        if isinstance(v, dict):
            if depth > 1:
                return '{…}'
            items = [f'{self.fmt(k, depth + 1)}: {self.fmt(x, depth + 1)}' for k, x in list(v.items())[:4]]
            return '{' + ', '.join(items) + (', …' if len(v) > 4 else '') + '}'
        if isinstance(v, (set, frozenset)):
            return '{' + ', '.join(self.fmt(x, depth + 1) for x in list(v)[:6]) + (', …' if len(v) > 6 else '') + '}' if v else 'set()'
        if callable(v):
            return f'function {getattr(v, "__name__", "")}'
        return short(repr(v))

    # ------------------------------------------------------------ frames and steps

    def frame_vars(self, frame, fid, queue):
        if fid == 0:
            out = []
            for name, value in self.module_ns.items():
                if name.startswith('__') or (name in PROVIDED and value is PROVIDED[name]):
                    continue
                kind = 'class' if isinstance(value, type) else 'function' if callable(value) else 'let'
                out.append({'name': name, 'value': self.snap(value, queue), 'declKind': kind})
            return out
        code = frame.f_code
        local = dict(frame.f_locals)
        nparams = code.co_argcount + code.co_kwonlyargcount + (1 if code.co_flags & 0x04 else 0) + (1 if code.co_flags & 0x08 else 0)
        params = set(code.co_varnames[:nparams])
        order = [n for n in code.co_varnames if n in local] + [n for n in local if n not in code.co_varnames]
        free = set(code.co_freevars)
        out = []
        for name in order:
            if name in free or name.startswith('.'):
                continue
            out.append({'name': name, 'value': self.snap(local[name], queue), 'declKind': 'param' if name in params else 'let'})
        return out

    def capture(self, extra=()):
        """Frames outermost first (the program, then each user call) and the objects they reach (plus `extra`)."""
        queue = [x for x in extra if self.is_heap(x)]
        frames = []
        prog_line = self.module_line if self.module_frame is not None else None
        frames.append({'id': 0, 'name': 'Program', 'label': 'Program', 'vars': self.frame_vars(None, 0, queue) if self.module_ns is not None else [], 'loc': self.loc(prog_line)})
        for f in self.stack:
            fid = self.frame_ids[f]
            frames.append({'id': fid, 'name': f.f_code.co_name, 'label': self.labels[fid], 'vars': self.frame_vars(f, fid, queue), 'loc': self.loc(f.f_lineno)})
        heap = self.heap_of(queue)
        return frames, heap

    def names_for(self, frames):
        names = {}
        for f in reversed(frames):
            for v in f['vars']:
                if v['value']['t'] == 'ref' and v['value']['id'] not in names:
                    names[v['value']['id']] = v['name']
        return names

    def diff(self, frames, heap, skip_frame=None):
        effects = []
        for f in frames:
            if f['id'] == skip_frame:
                continue
            before = self.prev_vars.get(f['id'], {})
            for v in f['vars']:
                old = before.get(v['name'])
                if old is None:
                    if f['id'] in self.prev_vars:
                        effects.append({'type': 'declare', 'name': v['name'], 'frameId': f['id'], 'value': v['value']})
                elif old != v['value']:
                    effects.append({'type': 'assign', 'name': v['name'], 'frameId': f['id'], 'before': old, 'after': v['value']})
        for i, h in heap.items():
            old = self.prev_heap.get(i)
            if old is None:
                if self.prev_heap or self.steps:
                    effects.append({'type': 'create', 'objId': i, 'className': {'array': 'Array', 'map': 'Map', 'set': 'Set'}.get(h['kind'], h.get('className') or 'Object')})
                continue
            if old == h:
                continue
            effects.extend(self.heap_change(i, old, h))
        return effects

    def heap_change(self, i, old, new):
        kind = new['kind']
        if kind != old['kind']:
            return []
        if kind == 'array':
            a, b = old['items'], new['items']
            if old['total'] == new['total']:
                return [{'type': 'index-write', 'objId': i, 'index': k, 'before': a[k], 'after': b[k]} for k in range(min(len(a), len(b))) if a[k] != b[k]]
            if new['total'] > old['total'] and b[: len(a)] == a:
                return [{'type': 'array-add', 'objId': i, 'end': 'back', 'values': b[len(a):]}]
            if new['total'] > old['total'] and b[new['total'] - old['total']:] == a:
                return [{'type': 'array-add', 'objId': i, 'end': 'front', 'values': b[: new['total'] - old['total']]}]
            if new['total'] == old['total'] - 1 and a[: len(b)] == b:
                return [{'type': 'array-remove', 'objId': i, 'end': 'back', 'value': a[-1]}]
            if new['total'] == old['total'] - 1 and a[1:] == b:
                return [{'type': 'array-remove', 'objId': i, 'end': 'front', 'value': a[0]}]
            return [{'type': 'array-change', 'objId': i, 'method': 'changed'}]
        if kind == 'map':
            before = {json.dumps(k): (k, v) for k, v in old['entries']}
            after = {json.dumps(k): (k, v) for k, v in new['entries']}
            out = []
            for key, (k, v) in after.items():
                if key not in before:
                    out.append({'type': 'map-insert', 'objId': i, 'key': k, 'value': v})
                elif before[key][1] != v:
                    out.append({'type': 'map-insert', 'objId': i, 'key': k, 'value': v, 'before': before[key][1]})
            for key, (k, _) in before.items():
                if key not in after:
                    out.append({'type': 'map-delete', 'objId': i, 'key': k, 'existed': True})
            return out
        if kind == 'set':
            before = {json.dumps(x): x for x in old['items']}
            after = {json.dumps(x): x for x in new['items']}
            return [{'type': 'set-add', 'objId': i, 'value': x, 'existed': False} for key, x in after.items() if key not in before] + [
                {'type': 'set-delete', 'objId': i, 'value': x, 'existed': True} for key, x in before.items() if key not in after
            ]
        before = dict((k, v) for k, v in old['entries'])
        return [{'type': 'prop-write', 'objId': i, 'key': k, 'before': before.get(k, {'t': 'undefined'}), 'after': v} for k, v in new['entries'] if before.get(k) != v]

    def show(self, s, heap):
        t = s['t']
        if t == 'null':
            return 'None'
        if t == 'boolean':
            return 'True' if s['v'] else 'False'
        if t == 'number':
            v = s['v']
            return {'\x00Infinity': 'inf', '\x00-Infinity': '-inf', NAN: 'nan'}.get(v, repr(v)) if isinstance(v, str) else repr(v)
        if t == 'string':
            return repr(short(s['v']))
        if t == 'function':
            return f'function {s["name"]}'
        h = heap.get(s.get('id'))
        if not h:
            return 'an object'
        if h['kind'] == 'object' and h['className'] in ('TreeNode', 'ListNode'):
            val = dict((k, v) for k, v in h['entries']).get('val')
            return f'node {self.show(val, heap)}' if val else 'a node'
        # Short contents, one level deep: [1, 2, …], {2: 0}, {'a', 'b'}.
        inner = lambda x: self.show(x, heap) if x['t'] != 'ref' else '…'  # noqa: E731
        more = lambda shown: ', …' if h['total'] > shown else ''  # noqa: E731
        if h['kind'] == 'array':
            return '[' + ', '.join(inner(x) for x in h['items'][:5]) + more(5) + ']'
        if h['kind'] == 'map':
            return '{' + ', '.join(f'{inner(k)}: {inner(v)}' for k, v in h['entries'][:4]) + more(4) + '}'
        if h['kind'] == 'set':
            return ('{' + ', '.join(inner(x) for x in h['items'][:5]) + more(5) + '}') if h['total'] else 'set()'
        return f'a {h.get("className")}'

    def describe(self, line, effects, frames, heap):
        names = self.names_for(frames)
        name = lambda i: names.get(i, 'a list')  # noqa: E731
        parts = []
        for e in effects:
            t = e['type']
            if t == 'declare':
                parts.append(f'{e["name"]} = {self.show(e["value"], heap)}')
            elif t == 'assign':
                parts.append(f'{e["name"]}: {self.show(e["before"], heap)} → {self.show(e["after"], heap)}')
            elif t == 'index-write':
                parts.append(f'{name(e["objId"])}[{e["index"]}] = {self.show(e["after"], heap)}')
            elif t == 'array-add':
                vals = ', '.join(self.show(v, heap) for v in e['values'])
                parts.append(f'{name(e["objId"])} gets {vals} at the {"end" if e["end"] == "back" else "front"}')
            elif t == 'array-remove':
                parts.append(f'{name(e["objId"])} loses {self.show(e["value"], heap)} from the {"end" if e["end"] == "back" else "front"}')
            elif t == 'map-insert':
                parts.append(f'{name(e["objId"])}[{self.show(e["key"], heap)}] = {self.show(e["value"], heap)}')
            elif t == 'map-delete':
                parts.append(f'{name(e["objId"])} drops {self.show(e["key"], heap)}')
            elif t == 'set-add':
                parts.append(f'{name(e["objId"])} adds {self.show(e["value"], heap)}')
            elif t == 'set-delete':
                parts.append(f'{name(e["objId"])} removes {self.show(e["value"], heap)}')
            elif t == 'prop-write':
                parts.append(f'{name(e["objId"])}.{e["key"]} = {self.show(e["after"], heap)}')
        text = self.lines[line - 1].strip() if line and line <= len(self.lines) else ''
        if parts:
            return f'Line {line}: {"; ".join(parts[:4])}{"; …" if len(parts) > 4 else ""}.'
        return f'Line {line} ran: {short(text, 60)}'

    def limit(self, message, line):
        """Stops the run: the error step shows the state at this moment."""
        self.error_frames = self.capture()
        self.error_line = line
        raise LimitError(message)

    def record(self, kind, line, explanation=None, effects=None, returning_frame=None, returning=None, result=None, finished=False, extra=()):
        if len(self.steps) >= self.limits['maxSteps']:
            self.limit(
                f"Stopped after {self.limits['maxSteps']:,} steps. If you expected it to finish sooner, check that your loop condition eventually becomes false and that recursion reaches its base case.",
                line,
            )
        frames, heap = self.capture(extra)
        if self.values > self.limits['maxTraceValues']:
            self.limit(f'Stopped after {len(self.steps):,} steps because the recorded drawing got too large (big data structures × many steps). Try a smaller input.', line)
        found = self.diff(frames, heap, skip_frame=returning_frame if kind == 'enter' else None)
        all_effects = (effects or []) + ([] if kind == 'enter' else found)
        if returning_frame is not None and kind == 'return':
            for f in frames:
                if f['id'] == returning_frame:
                    f['returning'] = returning
        if finished:
            for f in frames:
                if f['id'] == self.entry_frame_id:
                    f['finished'] = True
        if kind == 'statement':
            if any(e['type'] == 'declare' for e in all_effects):
                kind = 'declare'
            elif any(e['type'] == 'assign' for e in all_effects):
                kind = 'assign'
            else:
                text = self.lines[line - 1].strip() if line and line <= len(self.lines) else ''
                if text.startswith(('if ', 'elif ', 'while ')):
                    kind = 'condition'
                elif text.startswith('for '):
                    kind = 'loop-next'
        step = {
            'index': len(self.steps),
            'kind': kind,
            'loc': self.loc(line),
            'explanation': explanation if explanation is not None else self.describe(line, all_effects, frames, heap),
            'frames': frames,
            'heap': heap,
            'effects': all_effects,
            'outputCount': len(self.output),
        }
        if result is not None:
            step['result'] = result
        self.steps.append(step)
        self.prev_vars = {f['id']: {v['name']: v['value'] for v in f['vars']} for f in frames}
        self.prev_heap = heap

    # ------------------------------------------------------------ sys.settrace hooks

    def global_trace(self, frame, event, arg):
        if frame.f_code.co_filename != USER_FILE or event != 'call':
            return None
        if frame.f_code.co_name == '<module>':
            self.module_frame = frame
            return self.local_trace
        if len(self.stack) >= self.limits['maxDepth']:
            self.limit(f"More than {self.limits['maxDepth']} nested calls. Check that your recursion has a base case and that each call moves toward it.", frame.f_lineno)
        fid = self.next_frame
        self.next_frame += 1
        code = frame.f_code
        args = [self.fmt(frame.f_locals.get(n)) for n in code.co_varnames[: code.co_argcount] if n != 'self']
        label = f'{code.co_name}({", ".join(args)})'
        self.frame_ids[frame] = fid
        self.labels[fid] = label
        if self.expect_entry and self.entry_frame_id is None:
            self.entry_frame_id = fid
        self.stack.append(frame)
        self.record('enter', code.co_firstlineno, f'Call {label}.', [{'type': 'call', 'callee': label, 'frameId': fid}], returning_frame=fid)
        return self.local_trace

    def local_trace(self, frame, event, arg):
        fid = 0 if frame is self.module_frame else self.frame_ids.get(frame)
        if fid is None:
            return self.local_trace
        if event == 'line':
            self.raising.discard(fid)
            if fid in self.pending:
                self.record('statement', self.pending[fid])
            self.pending[fid] = frame.f_lineno
            if fid == 0:
                self.module_line = frame.f_lineno
        elif event == 'exception':
            self.raising.add(fid)
            # The state where it was raised, not where it passed through on the way out.
            if arg[1] is not self.error_exc:
                self.error_exc = arg[1]
                self.error_line = frame.f_lineno
                self.error_frames = self.capture()
        elif event == 'return':
            line = self.pending.pop(fid, None)
            raised = fid in self.raising
            self.raising.discard(fid)
            if fid == 0:
                if line is not None and not raised:
                    self.record('statement', line)
                self.module_line = None
                return self.local_trace
            if not raised:
                text = self.lines[line - 1].strip() if line and line <= len(self.lines) else ''
                # A return line is one step, as in JavaScript; a function that falls off its end shows its last line first.
                if line is not None and not text.startswith('return'):
                    self.record('statement', line)
                value = self.snap(arg, [])
                self.record(
                    'return',
                    line,
                    f'{self.labels[fid]} returns {self.fmt(arg)}.',
                    [{'type': 'return', 'frameId': fid, 'value': value}],
                    returning_frame=fid,
                    returning=value,
                    extra=[arg],
                )
            if self.stack and self.stack[-1] is frame:
                self.stack.pop()
                del self.frame_ids[frame]
        return self.local_trace


class Output:
    def __init__(self, tracer, level):
        self.tracer = tracer
        self.level = level
        self.buffer = ''

    def write(self, text):
        self.buffer += text
        while '\n' in self.buffer:
            line, self.buffer = self.buffer.split('\n', 1)
            self.emit(line)
        return len(text)

    def emit(self, line):
        if len(self.tracer.output) >= MAX_OUTPUT_LINES:
            raise LimitError(f'Stopped after {MAX_OUTPUT_LINES:,} lines of console output.')
        self.tracer.output.append({'text': line, 'step': len(self.tracer.steps), 'level': self.level})

    def flush(self):
        if self.buffer:
            self.emit(self.buffer)
            self.buffer = ''


# ---------------------------------------------------------------- inputs and results


def build_tree(items):
    if not items or items[0] is None:
        return None
    root = TreeNode(items[0])
    queue = deque([root])
    i = 1
    while queue and i < len(items):
        node = queue.popleft()
        for side in ('left', 'right'):
            if i >= len(items):
                break
            item = items[i]
            i += 1
            if item is not None:
                child = TreeNode(item)
                setattr(node, side, child)
                queue.append(child)
    return root


def build_list(items, pos=-1):
    nodes = [ListNode(v) for v in items]
    for a, b in zip(nodes, nodes[1:]):
        a.next = b
    if nodes and 0 <= pos < len(nodes):
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None


def plain(v, seen=None):
    seen = seen or set()
    if v is None or isinstance(v, (bool, str)):
        return v
    if isinstance(v, (int, float)):
        return json_number(v)
    if id(v) in seen:
        return '[cycle]'
    if isinstance(v, ListNode):
        out = []
        visited = set()
        while isinstance(v, ListNode):
            if id(v) in visited:
                out.append('[cycle]')
                break
            visited.add(id(v))
            out.append(plain(v.val))
            v = v.next
        return out
    if isinstance(v, TreeNode):
        out = []
        queue = deque([v])
        while queue:
            node = queue.popleft()
            if node is None:
                out.append(None)
                continue
            out.append(plain(node.val))
            queue.append(node.left)
            queue.append(node.right)
        while out and out[-1] is None:
            out.pop()
        return out
    seen = seen | {id(v)}
    if isinstance(v, (list, tuple, deque)):
        return [plain(x, seen) for x in v]
    if isinstance(v, (set, frozenset)):
        try:
            return [plain(x, seen) for x in sorted(v)]
        except TypeError:
            return [plain(x, seen) for x in v]
    if isinstance(v, dict):
        if all(isinstance(k, str) for k in v):
            return {k: plain(x, seen) for k, x in v.items()}
        return [[plain(k, seen), plain(x, seen)] for k, x in v.items()]
    if callable(v):
        return f'[function {getattr(v, "__name__", "")}]'
    if hasattr(v, '__dict__'):
        return {k: plain(x, seen) for k, x in vars(v).items()}
    return repr(v)


def guarded_import(real_import):
    def importer(name, globals=None, locals=None, fromlist=(), level=0):
        if name.split('.')[0] in BLOCKED_MODULES or name in BLOCKED_MODULES:
            raise ImportError(f'import {name} is not available in Drawgorithms: code runs without access to the page or the network.')
        return real_import(name, globals, locals, fromlist, level)

    return importer


def no_input(*_args):
    raise RuntimeError('input() is not available: Run passes the inputs from the Problem panel to your function.')


def run_json(request_json):
    """run() as JSON text, the form the page receives."""
    return json.dumps(run(request_json), allow_nan=False, default=str)


def live_json(source):
    """Live Build for Python: a syntax check (nothing runs), so Run as I type only runs code that parses."""
    result = {
        'status': 'ok',
        'step': None,
        'lines': [],
        'objects': {},
        'allNodeIds': [],
        'pending': None,
        'stoppedAt': None,
        'error': None,
        'hints': collect_hints(source),
        'drawnThroughLine': 0,
    }
    try:
        compile(source, USER_FILE, 'exec')
    except SyntaxError as e:
        line = e.lineno or 1
        lines = source.split('\n')
        result['status'] = 'pending'
        result['pending'] = {'line': line, 'text': lines[line - 1] if line <= len(lines) else '', 'message': e.msg}
    return json.dumps(result)


def run(request_json):
    req = json.loads(request_json)
    limits = req['limits']
    source = req['code']
    tracer = Tracer(source, limits)
    hints = collect_hints(source)
    entry = None
    notes = []
    result = {'status': 'finished', 'steps': tracer.steps, 'output': tracer.output, 'error': None, 'hints': hints, 'entry': None, 'notes': notes}

    def fail(kind, name, message, line):
        frames, heap = tracer.error_frames if tracer.error_frames and kind != 'setup' else tracer.capture()
        tracer.steps.append({
            'index': len(tracer.steps),
            'kind': 'error',
            'loc': tracer.loc(line),
            'explanation': message if kind in ('limit', 'setup') or name == 'LimitError' else f'{name}: {message}',
            'frames': frames,
            'heap': heap,
            'effects': [],
            'outputCount': len(tracer.output),
        })
        result['status'] = 'error'
        result['error'] = {'kind': kind, 'name': name, 'message': message, 'loc': tracer.loc(line)}
        result['entry'] = entry
        return result

    try:
        code = compile(source, USER_FILE, 'exec')
    except SyntaxError as e:
        result['status'] = 'error'
        message = f'Line {e.lineno}: {e.msg}.' if e.lineno else f'{e.msg}.'
        loc = tracer.loc(e.lineno)
        if loc and e.offset:
            loc = dict(loc, column=max(e.offset - 1, 0))
        result['error'] = {'kind': 'syntax', 'name': 'SyntaxError', 'message': message, 'loc': loc}
        return result

    import builtins

    safe_builtins = dict(vars(builtins))
    safe_builtins['__import__'] = guarded_import(builtins.__import__)
    safe_builtins['input'] = no_input
    ns = {'__name__': '__main__', '__builtins__': safe_builtins, **PROVIDED}
    tracer.module_ns = ns
    old_out, old_err = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = Output(tracer, 'log'), Output(tracer, 'error')
    old_limit = sys.getrecursionlimit()
    sys.setrecursionlimit(max(old_limit, limits['maxDepth'] * 4 + 100))
    try:
        functions = [f['name'] for f in hints['functions']]
        if req['mode'] == 'function':
            entry = req.get('entry') or (functions[0] if functions else None)
            tracer.record('start', None, f'Your code defines {entry}. Next, Run calls it with the inputs.' if entry else 'Ready to run your code.')
        else:
            tracer.record('start', None, 'Ready to run your code from the top.')
        sys.settrace(tracer.global_trace)
        try:
            exec(code, ns)
        finally:
            sys.settrace(None)
        if req['mode'] != 'function':
            frames, heap = tracer.capture()
            tracer.steps.append({'index': len(tracer.steps), 'kind': 'done', 'loc': None, 'explanation': 'Finished. Every line has run.', 'frames': frames, 'heap': heap, 'effects': [], 'outputCount': len(tracer.output)})
            result['plainGlobals'] = {k: plain(v) for k, v in ns.items() if not k.startswith('__') and k not in PROVIDED and not callable(v)}
            return result
        fn = lookup_entry(ns, entry)
        inputs = [i for i in req['inputs'] if i['kind'] != 'pos']
        if fn is None:
            names = ', '.join(i['name'] for i in inputs)
            message = (
                f'Define a function named {entry}({names}). Run calls it with the inputs.'
                if req.get('entry')
                else 'Write a function at the top level of your code. Run calls the first one it finds with the inputs.'
            )
            return fail('setup', 'Setup', message, None)
        import inspect

        try:
            params = [p for p in inspect.signature(fn).parameters if p != 'self']
        except (TypeError, ValueError):
            params = []

        def param_of(name):
            # A reserved word can't be a parameter: Python's habit is a trailing underscore (from → from_).
            if name in params:
                return name
            return name + '_' if keyword.iskeyword(name) and name + '_' in params else None

        by_name = bool(inputs) and all(param_of(i['name']) for i in inputs)
        ordered = sorted(inputs, key=lambda i: params.index(param_of(i['name']))) if by_name else inputs
        if not by_name and inputs and params:
            notes.append(f"Inputs were passed in order because their names ({', '.join(i['name'] for i in inputs)}) don't match the parameters ({', '.join(params)}).")
        pos_input = next((i for i in req['inputs'] if i['kind'] == 'pos'), None)
        list_input = next((i for i in ordered if i['kind'] == 'list'), None)
        pos = -1
        if pos_input is not None:
            if list_input is None:
                return fail('setup', 'Setup', f"Input {pos_input['name']} is a cycle position, but no input is drawn as a linked list for it to link.", None)
            length = len(list_input['value']) if isinstance(list_input['value'], list) else 0
            p = pos_input['value']
            if not isinstance(p, int) or isinstance(p, bool) or p < -1 or p >= length:
                return fail('setup', 'Setup', f"Input {pos_input['name']} must be -1 (no cycle) or a node position from 0 to {length - 1}: the last node of {list_input['name']} links back to that node.", None)
            pos = p
        args = []
        for i in ordered:
            v = i['value']
            if i['kind'] == 'tree':
                args.append(build_tree(v) if isinstance(v, list) else None)
            elif i['kind'] == 'list':
                args.append(build_list(v, pos if i is list_input else -1) if isinstance(v, list) else None)
            else:
                args.append(v)
        tracer.module_frame = None
        tracer.expect_entry = True
        sys.settrace(tracer.global_trace)
        try:
            value = fn(*args)
        finally:
            sys.settrace(None)
        snap = tracer.snap(value, [])
        label = tracer.labels.get(tracer.entry_frame_id, entry)
        result['plainResult'] = [] if value is None and req.get('resultKind') else plain(value)
        frames, heap = tracer.capture([value])
        # The final state keeps the entry call's last variables, marked finished.
        last = next((st for st in reversed(tracer.steps) if any(f['id'] == tracer.entry_frame_id for f in st['frames'])), None)
        if last is not None:
            frames = [dict(f, finished=True) if f['id'] == tracer.entry_frame_id else f for f in last['frames']]
            heap = {**last['heap'], **heap}
        tracer.steps.append({
            'index': len(tracer.steps),
            'kind': 'done',
            'loc': None,
            'explanation': f'Finished. {label} returned {tracer.fmt(value)}.',
            'frames': frames,
            'heap': heap,
            'effects': [],
            'outputCount': len(tracer.output),
            'result': snap,
        })
        result['entry'] = entry
        return result
    except LimitError as e:
        return fail('limit', 'LimitError', str(e), tracer.error_line)
    except RecursionError:
        return fail('limit', 'RecursionError', 'The calls went too deep for Python. Check that your recursion has a base case.', tracer.error_line)
    except Exception as e:  # the learner's own error, reported with its line
        tb = e.__traceback__
        line = None
        while tb is not None:
            if tb.tb_frame.f_code.co_filename == USER_FILE:
                line = tb.tb_lineno
            tb = tb.tb_next
        return fail('runtime', type(e).__name__, str(e) or type(e).__name__, line)
    finally:
        for stream in (sys.stdout, sys.stderr):
            if isinstance(stream, Output):
                try:
                    stream.flush()
                except LimitError:
                    pass
        sys.stdout, sys.stderr = old_out, old_err
        sys.setrecursionlimit(old_limit)


def lookup_entry(ns, entry):
    """The entry function: by its name, its snake_case spelling, or a method of class Solution."""
    if not entry:
        return None
    snake = ''.join('_' + c.lower() if c.isupper() else c for c in entry).lstrip('_')
    for name in (entry, snake):
        fn = ns.get(name)
        if callable(fn) and not isinstance(fn, type):
            return fn
    solution = ns.get('Solution')
    if isinstance(solution, type):
        for name in (entry, snake):
            if callable(getattr(solution, name, None)):
                return getattr(solution(), name)
    return None


# ---------------------------------------------------------------- static hints from the syntax tree


def collect_hints(source):
    empty = {'pointers': {}, 'indexed': [], 'queues': [], 'stacks': [], 'deques': [], 'indexInto': {}, 'functions': [], 'usage': empty_usage()}
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return empty
    return HintReader(tree).hints()


def empty_usage():
    return {'heaps': [], 'parents': [], 'adjacency': [], 'edgeLists': [], 'trieWalk': False, 'walkers': [], 'bits': [], 'vertices': [], 'visited': [], 'distances': [], 'predecessors': []}


def name_of(node):
    return node.id if isinstance(node, ast.Name) else None


def num(node, value):
    return isinstance(node, ast.Constant) and not isinstance(node.value, bool) and node.value == value


def identifiers(node):
    """Plain variables used as values inside an index expression (not inside a[...] or a.b)."""
    out = set()

    def visit(n):
        if isinstance(n, ast.Name):
            out.add(n.id)
        elif isinstance(n, (ast.Subscript, ast.Attribute)):
            return
        else:
            for c in ast.iter_child_nodes(n):
                visit(c)

    visit(node)
    return out


def is_index_math(n):
    if isinstance(n, ast.Name):
        return True
    if isinstance(n, ast.Constant):
        return isinstance(n.value, int) and not isinstance(n.value, bool)
    if isinstance(n, ast.BinOp):
        return isinstance(n.op, (ast.Add, ast.Sub, ast.Mult, ast.FloorDiv, ast.Mod, ast.RShift, ast.LShift)) and is_index_math(n.left) and is_index_math(n.right)
    if isinstance(n, ast.UnaryOp):
        return isinstance(n.op, ast.USub) and is_index_math(n.operand)
    return False


def is_heap_math(n):
    """2 * i + 1, i * 2 + 2, (i - 1) // 2, (i - 1) >> 1."""
    if not isinstance(n, ast.BinOp):
        return False
    minus_one = lambda x: isinstance(x, ast.BinOp) and isinstance(x.op, ast.Sub) and name_of(x.left) and num(x.right, 1)  # noqa: E731
    if isinstance(n.op, ast.Add) and (num(n.right, 1) or num(n.right, 2)):
        m = n.left
        return isinstance(m, ast.BinOp) and isinstance(m.op, ast.Mult) and ((num(m.left, 2) and name_of(m.right)) or (name_of(m.left) and num(m.right, 2)))
    if isinstance(n.op, ast.FloorDiv) and num(n.right, 2):
        return bool(minus_one(n.left))
    if isinstance(n.op, ast.RShift) and num(n.right, 1):
        return bool(minus_one(n.left))
    return False


def used_as_key(body, name, stores):
    for node in body:
        for n in ast.walk(node):
            if isinstance(n, ast.Subscript) and name_of(n.slice) == name:
                return True
            if isinstance(n, ast.Call) and any(name_of(a) == name for a in n.args):
                f = n.func
                owner = name_of(f.value) if isinstance(f, ast.Attribute) else None
                fname = f.attr if isinstance(f, ast.Attribute) else name_of(f)
                if owner == 'math' or fname in ('print', 'len', 'min', 'max', 'abs', 'str', 'int', 'float', 'sum'):
                    continue
                if not stores and fname in ('append', 'appendleft'):
                    continue
                return True
            if isinstance(n, ast.Compare) and any(isinstance(op, (ast.In, ast.NotIn)) for op in n.ops) and name_of(n.left) == name:
                return True
    return False


class HintReader:
    def __init__(self, tree):
        self.tree = tree

    def hints(self):
        tree = self.tree
        pointers = {}
        indexed = []
        pops, pops_front, pushes_front = set(), set(), set()
        index_into = {}
        assignments = []
        usage = empty_usage()
        heap_slots = set()
        heap_indexed = []
        bits = []

        def add(lst, x):
            if x is not None and x not in lst:
                lst.append(x)

        for n in ast.walk(tree):
            if isinstance(n, ast.Subscript):
                depth, base = 0, n
                inner = n
                while isinstance(base, ast.Subscript):
                    depth += 1
                    base = base.value
                name = name_of(base)
                if name:
                    add(indexed, name)
                    axis = 0
                    chain = []
                    while isinstance(inner, ast.Subscript):
                        chain.append(inner.slice)
                        inner = inner.value
                    for axis, sl in enumerate(reversed(chain)):
                        for ident in identifiers(sl):
                            if ident != name:
                                pointers.setdefault(name, {}).setdefault(ident, axis)
                    # nums[dq[k]]: the items of dq are indexes into nums.
                    inner_base = name_of(n.slice.value) if isinstance(n.slice, ast.Subscript) else None
                    if inner_base and inner_base != name:
                        add(index_into.setdefault(inner_base, []), name)
                    heap_indexed.append((name, n.slice))
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and name_of(n.func.value):
                owner, method = name_of(n.func.value), n.func.attr
                if method == 'pop' and not n.args:
                    pops.add(owner)
                if (method == 'pop' and n.args and num(n.args[0], 0)) or method == 'popleft':
                    pops_front.add(owner)
                if method == 'appendleft':
                    pushes_front.add(owner)
                if owner == 'heapq' and method in ('heappush', 'heappop', 'heapify', 'heappushpop', 'heapreplace') and n.args and name_of(n.args[0]):
                    add(usage['heaps'], name_of(n.args[0]))
            if isinstance(n, ast.Call) and name_of(n.func) in ('heappush', 'heappop', 'heapify', 'heappushpop', 'heapreplace') and n.args and name_of(n.args[0]):
                add(usage['heaps'], name_of(n.args[0]))
            if isinstance(n, ast.BinOp) and isinstance(n.op, (ast.BitAnd, ast.BitOr, ast.BitXor)):
                if not (isinstance(n.op, ast.BitOr) and num(n.right, 0)):
                    add(bits, name_of(n.left))
                    add(bits, name_of(n.right))
            if isinstance(n, ast.UnaryOp) and isinstance(n.op, ast.Invert):
                add(bits, name_of(n.operand))
            if isinstance(n, ast.AugAssign) and isinstance(n.op, (ast.BitAnd, ast.BitOr, ast.BitXor)):
                add(bits, name_of(n.target))
                add(bits, name_of(n.value))
            if isinstance(n, ast.While) and isinstance(n.test, ast.Compare) and len(n.test.ops) == 1:
                a, b = n.test.left, n.test.comparators[0]
                for x, y in ((a, b), (b, a)):
                    if isinstance(x, ast.Subscript) and name_of(x.value) and name_of(x.slice) and name_of(x.slice) == name_of(y):
                        add(usage['parents'], name_of(x.value))
            targets = []
            value = None
            if isinstance(n, ast.Assign) and len(n.targets) == 1:
                targets, value = [n.targets[0]], n.value
            elif isinstance(n, ast.AugAssign):
                targets, value = [n.target], n.value
            for t in targets:
                tn = name_of(t)
                if tn and value is not None:
                    if is_heap_math(value):
                        heap_slots.add(tn)
                    if is_index_math(value):
                        ids = identifiers(value)
                        if isinstance(n, ast.AugAssign):
                            ids.add(tn)
                        assignments.append((tn, ids))
                    if isinstance(value, ast.Subscript) and name_of(value.slice) == tn and name_of(value.value) and name_of(value.value) != tn:
                        add(usage['parents'], name_of(value.value))
                    if isinstance(value, ast.Attribute) and name_of(value.value) == tn:
                        add(usage['walkers'], tn)
                    # node = node[ch], node = node.children[ch], node = node.get(ch), node = node.setdefault(ch, {})
                    src = None
                    if isinstance(value, ast.Subscript) and not (isinstance(value.slice, ast.Constant) and isinstance(value.slice.value, int)):
                        src = value.value
                    elif isinstance(value, ast.Call) and isinstance(value.func, ast.Attribute) and value.func.attr in ('get', 'setdefault'):
                        src = value.func.value
                    if src is not None:
                        owner = src.value if isinstance(src, ast.Attribute) else src
                        if name_of(owner) == tn:
                            usage['trieWalk'] = True
                if isinstance(t, ast.Subscript) and name_of(t.value) and value is not None:
                    base = name_of(t.value)
                    if isinstance(value, ast.Subscript) and name_of(value.value) == base and isinstance(value.slice, ast.Subscript) and name_of(value.slice.value) == base:
                        add(usage['parents'], base)

        # find(p[x]) inside def find(x): recursion up the parent links.
        for fn in ast.walk(tree):
            if isinstance(fn, (ast.FunctionDef, ast.AsyncFunctionDef)):
                params = {a.arg for a in fn.args.args}
                for c in ast.walk(fn):
                    if isinstance(c, ast.Call):
                        callee = c.func.attr if isinstance(c.func, ast.Attribute) else name_of(c.func)
                        if callee == fn.name:
                            for a in c.args:
                                if isinstance(a, ast.Subscript) and name_of(a.value) and name_of(a.slice) in params:
                                    add(usage['parents'], name_of(a.value))

        # a[2 * i + 1], or a[left] where left was computed that way.
        for base, sl in heap_indexed:
            if is_heap_math(sl) or name_of(sl) in heap_slots:
                add(usage['heaps'], base)

        # Graphs: neighbor lists walked with each neighbor used as a key, and pairs split into two keys.
        vertex_vars = []
        for n in ast.walk(tree):
            if not isinstance(n, ast.For):
                continue
            it = n.iter
            if isinstance(it, ast.BoolOp):
                it = it.values[0]
            entry_base, key = None, None
            if isinstance(it, ast.Subscript) and name_of(it.value):
                entry_base, key = name_of(it.value), it.slice
            elif isinstance(it, ast.Call) and isinstance(it.func, ast.Attribute) and it.func.attr == 'get' and name_of(it.func.value) and it.args:
                entry_base, key = name_of(it.func.value), it.args[0]
            target = n.target
            item = name_of(target) or (name_of(target.elts[0]) if isinstance(target, ast.Tuple) and target.elts else None)
            if entry_base and item and used_as_key(n.body, item, False):
                add(usage['adjacency'], entry_base)
                add(vertex_vars, item)
                add(vertex_vars, name_of(key))
            if name_of(it) and isinstance(target, ast.Tuple) and len(target.elts) >= 2:
                a, b = name_of(target.elts[0]), name_of(target.elts[1])
                if a and b and used_as_key(n.body, a, True) and used_as_key(n.body, b, True):
                    add(usage['edgeLists'], name_of(it))
                    add(vertex_vars, a)
                    add(vertex_vars, b)
        usage['vertices'] = vertex_vars

        # Per-vertex state, by what the code writes for a vertex.
        graph_like = set(usage['adjacency']) | set(usage['edgeLists']) | set(usage['parents'])
        if vertex_vars:
            for n in ast.walk(tree):
                if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Subscript):
                    t = n.targets[0]
                    base = name_of(t.value)
                    if base and base not in graph_like and name_of(t.slice) in vertex_vars:
                        v = n.value
                        if isinstance(v, ast.Constant) and (v.value is True or v.value == 1):
                            add(usage['visited'], base)
                        elif name_of(v) in vertex_vars:
                            add(usage['predecessors'], base)
                        elif isinstance(v, ast.BinOp) and any(isinstance(x, ast.Subscript) and name_of(x.value) == base for x in ast.walk(v)):
                            add(usage['distances'], base)
                if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == 'add' and name_of(n.func.value) and n.args:
                    if name_of(n.args[0]) in vertex_vars and name_of(n.func.value) not in graph_like:
                        add(usage['visited'], name_of(n.func.value))

        # Index arithmetic links variables: mid = (lo + hi) // 2 makes lo and hi indexes of what mid indexes.
        changed = True
        while changed:
            changed = False
            for arr, m in pointers.items():
                for target, ids in assignments:
                    related = [target, *ids]
                    axis = next((m[x] for x in related if x in m), None)
                    if axis is None:
                        continue
                    for x in related:
                        if x not in m and x != arr:
                            m[x] = axis
                            changed = True

        functions = []
        for stmt in tree.body:
            if isinstance(stmt, ast.FunctionDef):
                params = [a.arg for a in stmt.args.args] + (['...' + stmt.args.vararg.arg] if stmt.args.vararg else [])
                functions.append({'name': stmt.name, 'params': params, 'line': stmt.lineno})
            if isinstance(stmt, ast.ClassDef) and stmt.name == 'Solution':
                for m in stmt.body:
                    if isinstance(m, ast.FunctionDef) and not m.name.startswith('_'):
                        functions.append({'name': m.name, 'params': [a.arg for a in m.args.args if a.arg != 'self'], 'line': m.lineno})

        usage['bits'] = bits
        return {
            'pointers': {arr: [{'name': k, 'axis': a} for k, a in m.items()] for arr, m in pointers.items()},
            'indexed': indexed,
            'queues': sorted(pops_front),
            'stacks': sorted(pops - pops_front),
            'deques': sorted(pops_front & (pops | pushes_front)),
            'indexInto': index_into,
            'functions': functions,
            'usage': usage,
        }
