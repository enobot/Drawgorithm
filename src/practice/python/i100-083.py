import math


def limitedTrades(k, prices):
    holding = [-math.inf] * (k + 1)
    free = [0] * (k + 1)
    for p in prices:
        for t in range(1, k + 1):
            holding[t] = max(holding[t], free[t - 1] - p)
            free[t] = max(free[t], holding[t] + p)
    return free[k]
