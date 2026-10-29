def calculate(expression):
    stack = []  # [total, sign] saved at each "("
    total = 0
    sign = 1
    i = 0
    while i < len(expression):
        ch = expression[i]
        if '0' <= ch <= '9':
            n = 0
            while i < len(expression) and '0' <= expression[i] <= '9':
                n = n * 10 + int(expression[i])
                i += 1
            total += sign * n
            continue
        if ch == '+':
            sign = 1
        elif ch == '-':
            sign = -1
        elif ch == '(':
            stack.append([total, sign])
            total = 0
            sign = 1
        elif ch == ')':
            before, outer = stack.pop()
            total = before + outer * total
        i += 1
    return total
