def pairWithSum(sorted, target):
    left = 0
    right = len(sorted) - 1
    while left < right:
        total = sorted[left] + sorted[right]
        if total == target:
            return [left, right]
        if total < target:
            left += 1
        else:
            right -= 1
    return []
