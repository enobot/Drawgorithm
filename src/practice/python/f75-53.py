def regionsAfterEach(rows, cols, positions):
    parent = []
    for i in range(rows * cols):
        parent.append(i)
    land = []
    for r in range(rows):
        land.append([False] * cols)

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    regions = 0
    counts = []
    for r, c in positions:
        if not land[r][c]:
            land[r][c] = True
            regions += 1
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nr = r + dr
                nc = c + dc
                if nr < 0 or nc < 0 or nr >= rows or nc >= cols or not land[nr][nc]:
                    continue
                a = find(r * cols + c)
                b = find(nr * cols + nc)
                if a != b:
                    parent[a] = b
                    regions -= 1
        counts.append(regions)
    return counts
