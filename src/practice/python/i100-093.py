def bitTally(n):
    counts = [0]
    for i in range(1, n + 1):
        counts.append(counts[i >> 1] + (i & 1))
    return counts
