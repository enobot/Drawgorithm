def countRegions(grid):
    regions = 0

    def flood(r, c, label):
        if r < 0 or c < 0 or r >= len(grid) or c >= len(grid[r]) or grid[r][c] != 1:
            return
        grid[r][c] = label
        flood(r + 1, c, label)
        flood(r - 1, c, label)
        flood(r, c + 1, label)
        flood(r, c - 1, label)

    for r in range(len(grid)):
        for c in range(len(grid[r])):
            if grid[r][c] == 1:
                regions += 1
                flood(r, c, regions + 1)
    return regions
