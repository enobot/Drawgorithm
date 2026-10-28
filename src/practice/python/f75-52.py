def firstCycleEdge(n, edges):
    parent = []
    for i in range(n):
        parent.append(i)

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b in edges:
        ra = find(a)
        rb = find(b)
        if ra == rb:
            return [a, b]
        parent[ra] = rb
    return []
