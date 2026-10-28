def countGroups(n, pairs):
    parent = []
    size = []
    for i in range(n):
        parent.append(i)
        size.append(1)

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    groups = n
    for a, b in pairs:
        ra = find(a)
        rb = find(b)
        if ra == rb:
            continue
        if size[ra] < size[rb]:
            ra, rb = rb, ra
        parent[rb] = ra
        size[ra] += size[rb]
        groups -= 1
    return groups
