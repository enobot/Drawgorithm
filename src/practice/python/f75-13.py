import math


def shortestStretch(quantities, target):
    left = 0
    total = 0
    best = math.inf
    for right in range(len(quantities)):
        total += quantities[right]
        while total >= target:
            best = min(best, right - left + 1)
            total -= quantities[left]
            left += 1
    return 0 if best == math.inf else best
