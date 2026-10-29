from collections import deque


class Vertex:
    def __init__(self, id):
        self.id = id
        self.neighbors = []


def copyMap(graph):
    # The original towns, built from the neighbour lists.
    originals = [Vertex(i) for i in range(len(graph))]
    for i, neighbours in enumerate(graph):
        for j in neighbours:
            originals[i].neighbors.append(originals[j])
    if len(originals) == 0:
        return []

    # Breadth-first copy: each town is copied when first reached.
    copyOf = {originals[0]: Vertex(0)}
    queue = deque([originals[0]])
    while len(queue) > 0:
        v = queue.popleft()
        for w in v.neighbors:
            if w not in copyOf:
                copyOf[w] = Vertex(w.id)
                queue.append(w)
            copyOf[v].neighbors.append(copyOf[w])

    # The copy, written as neighbour lists.
    return [[w.id for w in copyOf[v].neighbors] for v in originals]
