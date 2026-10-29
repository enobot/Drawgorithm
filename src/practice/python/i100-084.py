def bestStreakTotal(values):
    current = values[0]
    best = values[0]
    for i in range(1, len(values)):
        current = max(values[i], current + values[i])
        best = max(best, current)
    return best
