def widestTank(walls):
    left = 0
    right = len(walls) - 1
    best = 0
    while left < right:
        water = min(walls[left], walls[right]) * (right - left)
        best = max(best, water)
        if walls[left] < walls[right]:
            left += 1
        else:
            right -= 1
    return best
