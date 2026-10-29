def finalCapital(k, capital, costs, profits):
    projects = sorted([[c, profits[i]] for i, c in enumerate(costs)], key=lambda p: p[0])
    heap = []  # max-heap of affordable profits

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

    unlocked = 0
    for done in range(k):
        while unlocked < len(projects) and projects[unlocked][0] <= capital:
            push(projects[unlocked][1])
            unlocked += 1
        if len(heap) == 0:
            break
        capital += pop()
    return capital
