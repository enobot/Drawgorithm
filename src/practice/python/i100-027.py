import math


def combinedMedian(a, b):
    if len(a) > len(b):
        return combinedMedian(b, a)
    total = len(a) + len(b)
    half = (total + 1) // 2
    lo = 0
    hi = len(a)
    while lo <= hi:
        i = (lo + hi) // 2  # scores taken from a
        j = half - i  # scores taken from b
        aLeft = a[i - 1] if i > 0 else -math.inf
        aRight = a[i] if i < len(a) else math.inf
        bLeft = b[j - 1] if j > 0 else -math.inf
        bRight = b[j] if j < len(b) else math.inf
        if aLeft <= bRight and bLeft <= aRight:
            leftMax = max(aLeft, bLeft)
            if total % 2 == 1:
                return leftMax
            return (leftMax + min(aRight, bRight)) / 2
        if aLeft > bRight:
            hi = i - 1
        else:
            lo = i + 1
    return 0
