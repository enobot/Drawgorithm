def rotationLow(readings):
    lo = 0
    hi = len(readings) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if readings[mid] > readings[hi]:
            lo = mid + 1
        else:
            hi = mid
    return readings[lo]
