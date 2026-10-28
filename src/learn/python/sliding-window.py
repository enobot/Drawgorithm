def longestWithin(costs, budget):
    left = 0
    total = 0
    best = 0
    for right in range(len(costs)):
        total += costs[right]
        while total > budget:
            total -= costs[left]
            left += 1
        best = max(best, right - left + 1)
    return best
