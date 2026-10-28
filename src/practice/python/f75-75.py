class Entry:
    def __init__(self, key, value):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


def runCache(capacity, ops):
    head = Entry(0, 0)
    tail = Entry(0, 0)
    head.next = tail
    tail.prev = head
    index = {}

    def unlink(entry):
        entry.prev.next = entry.next
        entry.next.prev = entry.prev

    def addFront(entry):
        entry.next = head.next
        entry.prev = head
        head.next.prev = entry
        head.next = entry

    out = []
    for op in ops:
        if op[0] == 'get':
            entry = index.get(op[1])
            if entry is None:
                out.append(-1)
            else:
                unlink(entry)
                addFront(entry)
                out.append(entry.value)
        else:
            key = op[1]
            value = op[2]
            if key in index:
                entry = index[key]
                entry.value = value
                unlink(entry)
                addFront(entry)
            else:
                if len(index) == capacity:
                    oldest = tail.prev
                    unlink(oldest)
                    del index[oldest.key]
                entry = Entry(key, value)
                index[key] = entry
                addFront(entry)
            out.append(None)
    return out
