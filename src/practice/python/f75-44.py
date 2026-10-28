def runningMedian(values):
    # heapq keeps only min-heaps; these helpers take the order, so one pair serves both halves.
    lowHeap = []
    highHeap = []

    def push(heap, value, before):
        heap.append(value)
        i = len(heap) - 1
        while i > 0:
            parent = (i - 1) // 2
            if not before(heap[i], heap[parent]):
                break
            heap[i], heap[parent] = heap[parent], heap[i]
            i = parent

    def pop(heap, before):
        top = heap[0]
        last = heap.pop()
        if len(heap) > 0:
            heap[0] = last
            i = 0
            while True:
                left = 2 * i + 1
                right = 2 * i + 2
                best = i
                if left < len(heap) and before(heap[left], heap[best]):
                    best = left
                if right < len(heap) and before(heap[right], heap[best]):
                    best = right
                if best == i:
                    break
                heap[i], heap[best] = heap[best], heap[i]
                i = best
        return top

    def larger(a, b):
        return a > b

    def smaller(a, b):
        return a < b

    medians = []
    for value in values:
        if len(lowHeap) == 0 or value <= lowHeap[0]:
            push(lowHeap, value, larger)
        else:
            push(highHeap, value, smaller)
        if len(lowHeap) > len(highHeap) + 1:
            push(highHeap, pop(lowHeap, larger), smaller)
        elif len(highHeap) > len(lowHeap):
            push(lowHeap, pop(highHeap, smaller), larger)
        medians.append(lowHeap[0] if len(lowHeap) > len(highHeap) else (lowHeap[0] + highHeap[0]) / 2)
    return medians
