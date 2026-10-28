def smallestK(nums, k):
    # heapq.heappush and heapq.heappop do what push and pop do here, in one call each.
    heap = []

    def push(x):
        heap.append(x)
        i = len(heap) - 1
        while i > 0:
            parent = (i - 1) // 2
            if heap[parent] <= heap[i]:
                break
            heap[parent], heap[i] = heap[i], heap[parent]
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
                small = i
                if left < len(heap) and heap[left] < heap[small]:
                    small = left
                if right < len(heap) and heap[right] < heap[small]:
                    small = right
                if small == i:
                    break
                heap[small], heap[i] = heap[i], heap[small]
                i = small
        return top

    for x in nums:
        push(x)
    out = []
    for t in range(k):
        out.append(pop())
    return out
