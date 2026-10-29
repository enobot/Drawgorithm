def bothSeas(heights):
    rows = len(heights)
    cols = len(heights[0])

    def climb(starts):
        reached = {r * cols + c for r, c in starts}
        stack = list(starts)
        while len(stack) > 0:
            r, c = stack.pop()
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr = r + dr
                nc = c + dc
                if nr < 0 or nc < 0 or nr >= rows or nc >= cols:
                    continue
                if nr * cols + nc in reached or heights[nr][nc] < heights[r][c]:
                    continue
                reached.add(nr * cols + nc)
                stack.append((nr, nc))
        return reached

    north = []
    south = []
    for r in range(rows):
        north.append((r, 0))
        south.append((r, cols - 1))
    for c in range(cols):
        north.append((0, c))
        south.append((rows - 1, c))
    toNorth = climb(north)
    toSouth = climb(south)
    out = []
    for r in range(rows):
        for c in range(cols):
            if r * cols + c in toNorth and r * cols + c in toSouth:
                out.append([r, c])
    return out
