def searchGrid(grid, target):
    if len(grid) == 0:
        return False
    r = 0
    c = len(grid[0]) - 1
    while r < len(grid) and c >= 0:
        value = grid[r][c]
        if value == target:
            return True
        if value > target:
            c -= 1
        else:
            r += 1
    return False
