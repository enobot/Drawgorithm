def queryWindows(intervals, queries):
    byStart = sorted(intervals, key=lambda iv: iv[0])
    order = sorted(range(len(queries)), key=lambda i: queries[i])
    heap = []  # [length, end], the shortest on top

    def before(a, b):
        return (a[0] - b[0]) or (a[1] - b[1])

    def push(entry):
        heap.append(entry)
        i = len(heap) - 1
        while i > 0:
            parent = (i - 1) // 2
            if before(heap[i], heap[parent]) >= 0:
                break
            heap[i], heap[parent] = heap[parent], heap[i]
            i = parent

    def pop():
        last = heap.pop()
        if len(heap) == 0:
            return
        heap[0] = last
        i = 0
        while True:
            left = 2 * i + 1
            right = 2 * i + 2
            first = i
            if left < len(heap) and before(heap[left], heap[first]) < 0:
                first = left
            if right < len(heap) and before(heap[right], heap[first]) < 0:
                first = right
            if first == i:
                break
            heap[i], heap[first] = heap[first], heap[i]
            i = first

    answers = [-1] * len(queries)
    added = 0
    for qi in order:
        q = queries[qi]
        while added < len(byStart) and byStart[added][0] <= q:
            lo, hi = byStart[added]
            added += 1
            push([hi - lo + 1, hi])
        while len(heap) > 0 and heap[0][1] < q:
            pop()
        if len(heap) > 0:
            answers[qi] = heap[0][0]
    return answers
