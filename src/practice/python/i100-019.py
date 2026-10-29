def minStack(ops):
    stack = []
    mins = []
    out = []
    for op in ops:
        if op[0] == 'push':
            stack.append(op[1])
            mins.append(op[1] if len(mins) == 0 else min(op[1], mins[-1]))
            out.append(None)
        elif len(stack) == 0:
            out.append(None)
        elif op[0] == 'pop':
            stack.pop()
            mins.pop()
            out.append(None)
        elif op[0] == 'top':
            out.append(stack[-1])
        else:
            out.append(mins[-1])
    return out
