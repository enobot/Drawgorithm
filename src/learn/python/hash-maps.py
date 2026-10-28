def mostCommon(words):
    counts = {}
    best = None
    for w in words:
        counts[w] = (counts[w] if w in counts else 0) + 1
        if best is None or counts[w] > counts[best]:
            best = w
    return best
