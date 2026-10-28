def closestPairSum(weights, target):
    left = 0
    right = len(weights) - 1
    best = weights[left] + weights[right]
    while left < right:
        total = weights[left] + weights[right]
        gap = abs(total - target)
        bestGap = abs(best - target)
        if gap < bestGap or (gap == bestGap and total < best):
            best = total
        if total == target:
            return total
        if total < target:
            left += 1
        else:
            right -= 1
    return best
