def columnTotals(grid):
    totals = []
    for c in range(len(grid[0])):
        total = 0
        for r in range(len(grid)):
            total += grid[r][c]
        totals.append(total)
    return totals
