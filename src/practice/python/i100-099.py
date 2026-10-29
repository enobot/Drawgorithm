def zeroSpread(grid):
    rows = len(grid)
    cols = len(grid[0])
    firstRowZero = False
    firstColZero = False
    for c in range(cols):
        if grid[0][c] == 0:
            firstRowZero = True
    for r in range(rows):
        if grid[r][0] == 0:
            firstColZero = True
    for r in range(1, rows):
        for c in range(1, cols):
            if grid[r][c] == 0:
                grid[r][0] = 0
                grid[0][c] = 0
    for r in range(1, rows):
        for c in range(1, cols):
            if grid[r][0] == 0 or grid[0][c] == 0:
                grid[r][c] = 0
    if firstRowZero:
        for c in range(cols):
            grid[0][c] = 0
    if firstColZero:
        for r in range(rows):
            grid[r][0] = 0
    return grid
