def firstAndLast(readings, target):
    def lowerBound(value):
        lo = 0
        hi = len(readings)
        while lo < hi:
            mid = (lo + hi) // 2
            if readings[mid] < value:
                lo = mid + 1
            else:
                hi = mid
        return lo

    first = lowerBound(target)
    if first == len(readings) or readings[first] != target:
        return [-1, -1]
    return [first, lowerBound(target + 1) - 1]
