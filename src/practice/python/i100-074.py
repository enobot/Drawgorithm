def bestProductStreak(values):
    high = values[0]
    low = values[0]
    best = values[0]
    for i in range(1, len(values)):
        v = values[i]
        candidates = [v, high * v, low * v]
        high = max(candidates)
        low = min(candidates)
        best = max(best, high)
    return best
