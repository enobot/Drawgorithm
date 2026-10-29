def risingLength(values):
    tails = []
    for v in values:
        lo = 0
        hi = len(tails)
        while lo < hi:
            mid = (lo + hi) // 2
            if tails[mid] < v:
                lo = mid + 1
            else:
                hi = mid
        if lo == len(tails):
            tails.append(v)
        else:
            tails[lo] = v
    return len(tails)
