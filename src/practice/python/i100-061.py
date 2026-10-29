def minutesToSpoil(grid):
    rows = len(grid)
    cols = len(grid[0])
    queue = []
    fresh = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2:
                queue.append((r, c))
            elif grid[r][c] == 1:
                fresh += 1
    minutes = 0
    while len(queue) > 0 and fresh > 0:
        spreading = []
        for r, c in queue:
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr = r + dr
                nc = c + dc
                if nr < 0 or nc < 0 or nr >= rows or nc >= cols or grid[nr][nc] != 1:
                    continue
                grid[nr][nc] = 2
                fresh -= 1
                spreading.append((nr, nc))
        queue = spreading
        minutes += 1
    return minutes if fresh == 0 else -1
