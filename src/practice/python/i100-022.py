def largestBillboard(heights):
    stack = []  # indexes with increasing heights
    best = 0
    for i in range(len(heights) + 1):
        h = 0 if i == len(heights) else heights[i]
        while len(stack) > 0 and heights[stack[-1]] >= h:
            top = stack.pop()
            left = -1 if len(stack) == 0 else stack[-1]
            best = max(best, heights[top] * (i - left - 1))
        stack.append(i)
    return best
