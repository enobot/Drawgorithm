from functools import cmp_to_key


def nearestBeacons(points, k):
    def dist(p):
        return p[0] * p[0] + p[1] * p[1]

    def after(a, b):
        return (dist(a) - dist(b)) or (a[0] - b[0]) or (a[1] - b[1])

    heap = []  # the best k so far, the one that comes last on top

    def swap(a, b):
        heap[a], heap[b] = heap[b], heap[a]

    def siftUp(i):
        while i > 0:
            parent = (i - 1) // 2
            if after(heap[i], heap[parent]) <= 0:
                return
            swap(i, parent)
            i = parent

    def siftDown(i):
        while True:
            left = 2 * i + 1
            right = 2 * i + 2
            last = i
            if left < len(heap) and after(heap[left], heap[last]) > 0:
                last = left
            if right < len(heap) and after(heap[right], heap[last]) > 0:
                last = right
            if last == i:
                return
            swap(i, last)
            i = last

    for p in points:
        if len(heap) < k:
            heap.append(p)
            siftUp(len(heap) - 1)
        elif after(p, heap[0]) < 0:
            heap[0] = p
            siftDown(0)
    return sorted(heap, key=cmp_to_key(after))
