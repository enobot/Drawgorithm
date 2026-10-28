def gridPaths(grid):
    rows = len(grid)
    cols = len(grid[0])
    paths = []
    for r in range(rows):
        paths.append([])
        for c in range(cols):
            if grid[r][c] == 1:
                paths[r].append(0)
            elif r == 0 and c == 0:
                paths[r].append(1)
            else:
                paths[r].append((paths[r - 1][c] if r > 0 else 0) + (paths[r][c - 1] if c > 0 else 0))
    return paths[rows - 1][cols - 1]
