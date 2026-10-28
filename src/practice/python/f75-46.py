from collections import deque


def canReach(n, roads, start, goal):
    graph = []
    for town in range(n):
        graph.append([])
    for a, b in roads:
        graph[a].append(b)
        graph[b].append(a)
    visited = {start}
    queue = deque([start])
    while len(queue) > 0:
        town = queue.popleft()
        if town == goal:
            return True
        for nxt in graph[town]:
            if nxt not in visited:
                visited.add(nxt)
                queue.append(nxt)
    return False
