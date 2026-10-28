def assignJobs(n, durations):
    # heapq would do push and pop in one call each; here each swap is drawn.
    heap = []

    def before(a, b):
        return a[0] < b[0] or (a[0] == b[0] and a[1] < b[1])

    def swap(a, b):
        heap[a], heap[b] = heap[b], heap[a]

    def push(entry):
        heap.append(entry)
        i = len(heap) - 1
        while i > 0:
            parent = (i - 1) // 2
            if not before(heap[i], heap[parent]):
                break
            swap(i, parent)
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
                swap(i, first)
                i = first
        return top

    for w in range(n):
        push([0, w])
    plan = []
    for duration in durations:
        freeAt, worker = pop()
        plan.append([worker, freeAt])
        push([freeAt + duration, worker])
    return plan
