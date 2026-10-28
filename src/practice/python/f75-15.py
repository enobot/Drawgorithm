def countStretches(values, target):
    seen = {0: 1}
    running = 0
    count = 0
    for value in values:
        running += value
        count += seen.get(running - target, 0)
        seen[running] = seen.get(running, 0) + 1
    return count
