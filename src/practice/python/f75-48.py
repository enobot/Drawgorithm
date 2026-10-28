from collections import deque


def fewestHops(n, links, start, goal):
    graph = []
    for s in range(n):
        graph.append([])
    for a, b in links:
        graph[a].append(b)
        graph[b].append(a)
    dist = [-1] * n
    dist[start] = 0
    queue = deque([start])
    while len(queue) > 0:
        u = queue.popleft()
        if u == goal:
            return dist[u]
        for v in graph[u]:
            if dist[v] == -1:
                dist[v] = dist[u] + 1
                queue.append(v)
    return -1
