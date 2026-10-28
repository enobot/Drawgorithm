def bestWindowSum(readings, k):
    windowSum = 0
    for i in range(k):
        windowSum += readings[i]
    best = windowSum
    for right in range(k, len(readings)):
        left = right - k + 1
        windowSum += readings[right] - readings[left - 1]
        best = max(best, windowSum)
    return best
