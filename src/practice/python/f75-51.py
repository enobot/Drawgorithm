def communities(n, events):
    parent = []
    size = []
    for i in range(n):
        parent.append(i)
        size.append(1)

    def find(x):
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    answers = []
    for kind, a, b in events:
        ra = find(a)
        rb = find(b)
        if kind == 'ask':
            answers.append(ra == rb)
        elif ra != rb:
            if size[ra] < size[rb]:
                parent[ra] = rb
                size[rb] += size[ra]
            else:
                parent[rb] = ra
                size[ra] += size[rb]
    return answers
