def largestK(readings, k):
    # heapq does these repairs in one call; here each swap is drawn.
    heap = []

    def swap(a, b):
        heap[a], heap[b] = heap[b], heap[a]

    def siftUp(i):
        while i > 0:
            parent = (i - 1) // 2
            if heap[parent] <= heap[i]:
                return
            swap(parent, i)
            i = parent

    def siftDown(i):
        while True:
            left = 2 * i + 1
            right = 2 * i + 2
            smallest = i
            if left < len(heap) and heap[left] < heap[smallest]:
                smallest = left
            if right < len(heap) and heap[right] < heap[smallest]:
                smallest = right
            if smallest == i:
                return
            swap(i, smallest)
            i = smallest

    for reading in readings:
        if len(heap) < k:
            heap.append(reading)
            siftUp(len(heap) - 1)
        elif k > 0 and reading > heap[0]:
            heap[0] = reading
            siftDown(0)
    result = []
    while len(heap) > 0:
        result.append(heap[0])
        last = heap.pop()
        if len(heap) > 0:
            heap[0] = last
            siftDown(0)
    result.reverse()
    return result
