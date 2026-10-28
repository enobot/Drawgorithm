def minimumCableCost(n, cables):
    edges = sorted(cables, key=lambda x: x[2])
    parent = []
    for i in range(n):
        parent.append(i)

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    total = 0
    used = 0
    for a, b, cost in edges:
        if used == n - 1:
            break
        ra = find(a)
        rb = find(b)
        if ra == rb:
            continue
        parent[ra] = rb
        total += cost
        used += 1
    return total
