def fewestSlots(tasks, gap):
    counts = {}
    for t in tasks:
        counts[t] = counts.get(t, 0) + 1
    most = 0
    for c in counts.values():
        most = max(most, c)
    tied = 0
    for c in counts.values():
        if c == most:
            tied += 1
    return max(len(tasks), (most - 1) * (gap + 1) + tied)
