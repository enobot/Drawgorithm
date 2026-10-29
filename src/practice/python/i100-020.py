def evalPostfix(tokens):
    stack = []
    for t in tokens:
        if t == '+' or t == '-' or t == '*' or t == '/':
            b = stack.pop()
            a = stack.pop()
            if t == '+':
                stack.append(a + b)
            elif t == '-':
                stack.append(a - b)
            elif t == '*':
                stack.append(a * b)
            else:
                stack.append(int(a / b))  # rounds toward zero; // would round down
        else:
            stack.append(int(t))
    return stack[0]
