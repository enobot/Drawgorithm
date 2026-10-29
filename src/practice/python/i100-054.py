def kthHighest(k, scores):
    heap = []  # min-heap of the k highest scores so far

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

    out = []
    for score in scores:
        if len(heap) < k:
            heap.append(score)
            siftUp(len(heap) - 1)
        elif score > heap[0]:
            heap[0] = score
            siftDown(0)
        out.append(heap[0] if len(heap) == k else None)
    return out
