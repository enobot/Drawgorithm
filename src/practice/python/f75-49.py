def taskOrder(n, deps):
    graph = []
    indegree = []
    for t in range(n):
        graph.append([])
        indegree.append(0)
    for before, after in deps:
        graph[before].append(after)
        indegree[after] += 1
    # heapq would do push and pop in one call each; here each swap is drawn.
    readyHeap = []

    def push(task):
        readyHeap.append(task)
        i = len(readyHeap) - 1
        while i > 0:
            parent = (i - 1) // 2
            if readyHeap[parent] <= readyHeap[i]:
                break
            readyHeap[parent], readyHeap[i] = readyHeap[i], readyHeap[parent]
            i = parent

    def pop():
        top = readyHeap[0]
        last = readyHeap.pop()
        if len(readyHeap) > 0:
            readyHeap[0] = last
            i = 0
            while True:
                left = 2 * i + 1
                right = 2 * i + 2
                smallest = i
                if left < len(readyHeap) and readyHeap[left] < readyHeap[smallest]:
                    smallest = left
                if right < len(readyHeap) and readyHeap[right] < readyHeap[smallest]:
                    smallest = right
                if smallest == i:
                    break
                readyHeap[i], readyHeap[smallest] = readyHeap[smallest], readyHeap[i]
                i = smallest
        return top

    for t in range(n):
        if indegree[t] == 0:
            push(t)
    order = []
    while len(readyHeap) > 0:
        task = pop()
        order.append(task)
        for nxt in graph[task]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                push(nxt)
    return order if len(order) == n else []
