def firstAtLeast(sorted, target):
    lo = 0
    hi = len(sorted)
    while lo < hi:
        mid = (lo + hi) // 2
        if sorted[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo
