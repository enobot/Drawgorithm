def lastStone(stones):
    heap = []  # max-heap

    def push(x):
        heap.append(x)
        i = len(heap) - 1
        while i > 0:
            parent = (i - 1) // 2
            if heap[parent] >= heap[i]:
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
                largest = i
                if left < len(heap) and heap[left] > heap[largest]:
                    largest = left
                if right < len(heap) and heap[right] > heap[largest]:
                    largest = right
                if largest == i:
                    break
                heap[i], heap[largest] = heap[largest], heap[i]
                i = largest
        return top

    for s in stones:
        push(s)
    while len(heap) > 1:
        a = pop()
        b = pop()
        if a != b:
            push(a - b)
    return 0 if len(heap) == 0 else heap[0]
