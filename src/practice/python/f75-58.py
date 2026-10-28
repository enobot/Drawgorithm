import math


def fewestTokens(denominations, target):
    best = [math.inf] * (target + 1)
    best[0] = 0
    for total in range(1, target + 1):
        for d in denominations:
            if d <= total and best[total - d] + 1 < best[total]:
                best[total] = best[total - d] + 1
    return -1 if best[target] == math.inf else best[target]
