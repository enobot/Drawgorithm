def nextGreater(values):
    answer = [-1] * len(values)
    stack = []
    for i in range(len(values)):
        while len(stack) > 0 and values[stack[-1]] < values[i]:
            answer[stack.pop()] = values[i]
        stack.append(i)
    return answer
