from collections import deque


def windowPeaks(readings, k):
    dq = deque()
    peaks = []
    for i in range(len(readings)):
        while len(dq) > 0 and readings[dq[-1]] <= readings[i]:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            peaks.append(readings[dq[0]])
    return peaks
