def minStairCost(cost):
    n = len(cost)
    best = [0] * n
    for i in range(n):
        fromBelow = best[i - 1] if i >= 1 else 0
        fromTwoBelow = best[i - 2] if i >= 2 else 0
        best[i] = cost[i] + min(fromBelow, fromTwoBelow)
    if n <= 1:
        return 0
    return min(best[n - 1], best[n - 2])
