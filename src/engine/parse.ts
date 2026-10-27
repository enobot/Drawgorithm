import { parse as acornParse } from 'acorn';
import type * as ES from 'estree';
import type { EngineError, SourceLoc } from '../trace/types';

/** acorn adds character offsets to every node. */
export type Positioned = ES.Node & { start: number; end: number };

export function locOf(node: ES.Node): SourceLoc {
  const n = node as Positioned;
  const loc = node.loc!;
  return {
    line: loc.start.line,
    column: loc.start.column,
    endLine: loc.end.line,
    endColumn: loc.end.column,
    start: n.start,
    end: n.end,
  };
}

export function sourceOf(source: string, node: ES.Node): string {
  const n = node as Positioned;
  return source.slice(n.start, n.end);
}

export type ParseOutcome = { ok: true; program: ES.Program } | { ok: false; error: EngineError };

export function parseProgram(source: string): ParseOutcome {
  try {
    const program = acornParse(source, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      locations: true,
    }) as unknown as ES.Program;
    return { ok: true, program };
  } catch (e) {
    const err = e as SyntaxError & { loc?: { line: number; column: number }; pos?: number };
    const line = err.loc?.line ?? 1;
    const column = err.loc?.column ?? 0;
    const pos = err.pos ?? 0;
    // acorn appends "(line:col)" to its messages; the editor already shows the position.
    let message = String(err.message).replace(/\s*\(\d+:\d+\)$/, '');
    if (/'import' and 'export'/.test(message)) {
      message = 'import and export are not supported. Write everything in this one file.';
    }
    return {
      ok: false,
      error: {
        kind: 'syntax',
        name: 'SyntaxError',
        message,
        loc: { line, column, endLine: line, endColumn: column + 1, start: pos, end: pos + 1 },
      },
    };
  }
}

/**
 * Finds the first piece of syntax the interpreter does not support yet,
 * so Run can explain it before executing anything.
 */
export function findUnsupported(program: ES.Program): { node: ES.Node; feature: string } | null {
  let found: { node: ES.Node; feature: string } | null = null;

  const visit = (node: ES.Node | null | undefined): void => {
    if (!node || found) return;
    const feature = unsupportedFeature(node);
    if (feature) {
      found = { node, feature };
      return;
    }
    // Property names such as `obj.arguments` or `{ arguments: 1 }` are not variable references.
    if (node.type === 'MemberExpression' && !node.computed) return visit(node.object);
    if ((node.type === 'Property' || node.type === 'MethodDefinition' || node.type === 'PropertyDefinition') && !node.computed) {
      return visit(node.value as ES.Node | null);
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end') continue;
      const child = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const c of child) if (c && typeof c === 'object' && 'type' in c) visit(c as ES.Node);
      } else if (child && typeof child === 'object' && 'type' in child) {
        visit(child as ES.Node);
      }
    }
  };
  visit(program);
  return found;
}

export function unsupportedFeature(node: ES.Node): string | null {
  switch (node.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      if (node.async) return 'async functions';
      if ('generator' in node && node.generator) return 'generator functions (function*)';
      return null;
    case 'AwaitExpression':
      return 'await';
    case 'YieldExpression':
      return 'yield';
    case 'Literal':
      if ('regex' in node && node.regex) return 'regular expressions (/.../)';
      if ('bigint' in node && node.bigint) return 'BigInt numbers';
      return null;
    case 'TaggedTemplateExpression':
      return 'tagged templates';
    case 'ClassDeclaration':
    case 'ClassExpression':
      return node.superClass ? 'class inheritance (extends)' : null;
    case 'Super':
      return 'super';
    case 'MethodDefinition':
      if (node.kind === 'get' || node.kind === 'set') return 'getters and setters';
      if (node.static) return 'static methods';
      return null;
    case 'PropertyDefinition':
      return node.static ? 'static class fields' : null;
    case 'Property':
      return node.kind === 'get' || node.kind === 'set' ? 'getters and setters' : null;
    case 'PrivateIdentifier':
      return 'private fields (#name)';
    case 'StaticBlock':
      return 'static blocks';
    case 'WithStatement':
      return 'with statements';
    case 'DebuggerStatement':
      return 'debugger statements';
    case 'MetaProperty':
      return 'new.target / import.meta';
    case 'ImportExpression':
      return 'import()';
    case 'ForOfStatement':
      return node.await ? 'for await' : null;
    case 'Identifier':
      return node.name === 'arguments' ? 'the arguments object (use rest parameters: ...args)' : null;
    default:
      return null;
  }
}
