def mergeStreams(streams):
    # heapq would do push and pop in one call each; here each swap is drawn.
    heap = []

    def less(a, b):
        return heap[a][0] < heap[b][0] or (heap[a][0] == heap[b][0] and heap[a][1] < heap[b][1])

    def swap(a, b):
        heap[a], heap[b] = heap[b], heap[a]

    def push(entry):
        heap.append(entry)
        i = len(heap) - 1
        while i > 0:
            parent = (i - 1) // 2
            if not less(i, parent):
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
                smallest = i
                if left < len(heap) and less(left, smallest):
                    smallest = left
                if right < len(heap) and less(right, smallest):
                    smallest = right
                if smallest == i:
                    break
                swap(i, smallest)
                i = smallest
        return top

    for s in range(len(streams)):
        if len(streams[s]) > 0:
            push([streams[s][0], s, 0])
    merged = []
    while len(heap) > 0:
        value, s, position = pop()
        merged.append(value)
        if position + 1 < len(streams[s]):
            push([streams[s][position + 1], s, position + 1])
    return merged
