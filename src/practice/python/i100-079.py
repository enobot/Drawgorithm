def steepestClimb(grid):
    rows = len(grid)
    cols = len(grid[0])
    memo = {}

    def longest(r, c):
        key = r * cols + c
        if key in memo:
            return memo[key]
        best = 1
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr = r + dr
            nc = c + dc
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] > grid[r][c]:
                best = max(best, 1 + longest(nr, nc))
        memo[key] = best
        return best

    answer = 0
    for r in range(rows):
        for c in range(cols):
            answer = max(answer, longest(r, c))
    return answer
