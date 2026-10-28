def isNested(text):
    opener = {')': '(', ']': '[', '}': '{'}
    stack = []
    for c in text:
        if c == '(' or c == '[' or c == '{':
            stack.append(c)
        else:
            if len(stack) == 0 or stack.pop() != opener[c]:
                return False
    return len(stack) == 0
