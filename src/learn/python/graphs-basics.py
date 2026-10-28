def reachable(n, links, start):
    adj = []
    for v in range(n):
        adj.append([])
    for a, b in links:
        adj[a].append(b)
        adj[b].append(a)
    seen = {start}
    stack = [start]
    while len(stack) > 0:
        v = stack.pop()
        for w in adj[v]:
            if w not in seen:
                seen.add(w)
                stack.append(w)
    return len(seen)
