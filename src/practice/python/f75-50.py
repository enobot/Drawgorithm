import math


def shortestDistances(n, roads, source):
    graph = []
    for v in range(n):
        graph.append([])
    for a, b, cost in roads:
        graph[a].append([b, cost])
        graph[b].append([a, cost])
    dist = [math.inf] * n
    dist[source] = 0
    # heapq would do push and pop in one call each; here each swap is drawn.
    heap = [[0, source]]

    def before(x, y):
        return x[0] < y[0] or (x[0] == y[0] and x[1] < y[1])

    def push(entry):
        heap.append(entry)
        i = len(heap) - 1
        while i > 0:
            parent = (i - 1) // 2
            if not before(heap[i], heap[parent]):
                break
            heap[i], heap[parent] = heap[parent], heap[i]
            i = parent

    def pop():
        top = heap[0]
        last = heap.pop()
        if len(heap) > 0:
            heap[0] = last
            i = 0
            while True:
                left = 2 * i + 1
                right = 2 * i + 2
                first = i
                if left < len(heap) and before(heap[left], heap[first]):
                    first = left
                if right < len(heap) and before(heap[right], heap[first]):
                    first = right
                if first == i:
                    break
                heap[i], heap[first] = heap[first], heap[i]
                i = first
        return top

    while len(heap) > 0:
        d, u = pop()
        if d > dist[u]:
            continue
        for v, cost in graph[u]:
            if d + cost < dist[v]:
                dist[v] = d + cost
                push([dist[v], v])
    return [-1 if d == math.inf else d for d in dist]
