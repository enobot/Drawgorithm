from collections import deque


def wordSteps(start, end, words):
    if end not in words:
        return -1

    def oneApart(a, b):
        differ = 0
        for i in range(len(a)):
            if a[i] != b[i]:
                differ += 1
        return differ == 1

    used = {start}
    queue = deque([(start, 0)])
    while len(queue) > 0:
        word, steps = queue.popleft()
        if word == end:
            return steps
        for w in words:
            if w not in used and oneApart(word, w):
                used.add(w)
                queue.append((w, steps + 1))
    return -1
