from collections import deque


def courseOrder(n, before):
    unlocks = []
    waiting = []
    for v in range(n):
        unlocks.append([])
        waiting.append(0)
    for a, b in before:
        unlocks[a].append(b)
        waiting[b] += 1
    ready = deque()
    for v in range(n):
        if waiting[v] == 0:
            ready.append(v)
    order = []
    while len(ready) > 0:
        v = ready.popleft()
        order.append(v)
        for w in unlocks[v]:
            waiting[w] -= 1
            if waiting[w] == 0:
                ready.append(w)
    return order if len(order) == n else []
