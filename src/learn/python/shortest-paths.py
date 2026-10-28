import math


def cheapest(n, roads, from_):
    adj = []
    dist = []
    done = []
    for v in range(n):
        adj.append([])
        dist.append(math.inf)
        done.append(False)
    for a, b, cost in roads:
        adj[a].append([b, cost])
        adj[b].append([a, cost])
    dist[from_] = 0
    for _ in range(n):
        u = -1
        for v in range(n):
            if not done[v] and (u == -1 or dist[v] < dist[u]):
                u = v
        if dist[u] == math.inf:
            break
        done[u] = True
        for w, cost in adj[u]:
            if dist[u] + cost < dist[w]:
                dist[w] = dist[u] + cost
    return [-1 if d == math.inf else d for d in dist]
