def priorityDesk(ops):
    # heapq.heappush and heapq.heappop make these same repairs; here each swap is drawn.
    heap = []
    taken = []
    for op in ops:
        if op[0] == 'add':
            heap.append(op[1])
            i = len(heap) - 1
            while i > 0:
                parent = (i - 1) // 2
                if heap[parent] <= heap[i]:
                    break
                heap[parent], heap[i] = heap[i], heap[parent]
                i = parent
        elif len(heap) == 0:
            taken.append(None)
        else:
            taken.append(heap[0])
            last = heap.pop()
            if len(heap) > 0:
                heap[0] = last
                i = 0
                while True:
                    left = 2 * i + 1
                    right = 2 * i + 2
                    smallest = i
                    if left < len(heap) and heap[left] < heap[smallest]:
                        smallest = left
                    if right < len(heap) and heap[right] < heap[smallest]:
                        smallest = right
                    if smallest == i:
                        break
                    heap[i], heap[smallest] = heap[smallest], heap[i]
                    i = smallest
    return taken
