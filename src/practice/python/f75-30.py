def shipWithinDays(weights, days):
    def daysNeeded(capacity):
        count = 1
        load = 0
        for w in weights:
            if load + w > capacity:
                count += 1
                load = 0
            load += w
        return count

    lo = max(weights)
    hi = sum(weights)
    while lo < hi:
        mid = (lo + hi) // 2
        if daysNeeded(mid) <= days:
            hi = mid
        else:
            lo = mid + 1
    return lo
