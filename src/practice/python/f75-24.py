def daysUntilWarmer(temps):
    answer = [0] * len(temps)
    stack = []
    for i in range(len(temps)):
        while len(stack) > 0 and temps[stack[-1]] < temps[i]:
            j = stack.pop()
            answer[j] = i - j
        stack.append(i)
    return answer
