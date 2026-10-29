def longestRun(badges):
    have = set(badges)
    best = 0
    for b in have:
        if b - 1 in have:
            continue  # not the start of a run
        length = 1
        while b + length in have:
            length += 1
        best = max(best, length)
    return best
