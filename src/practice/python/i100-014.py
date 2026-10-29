import math


def bestTrade(prices):
    lowest = math.inf
    best = 0
    for p in prices:
        lowest = min(lowest, p)
        best = max(best, p - lowest)
    return best
