def risingTide(grid):
    n = len(grid)

    def canCross(level):
        if grid[0][0] > level:
            return False
        seen = {0}
        stack = [(0, 0)]
        while len(stack) > 0:
            r, c = stack.pop()
            if r == n - 1 and c == n - 1:
                return True
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr = r + dr
                nc = c + dc
                if nr < 0 or nc < 0 or nr >= n or nc >= n:
                    continue
                if nr * n + nc in seen or grid[nr][nc] > level:
                    continue
                seen.add(nr * n + nc)
                stack.append((nr, nc))
        return False

    lo = 0
    hi = n * n - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if canCross(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
