def isRearrangement(first, second):
    if len(first) != len(second):
        return False
    counts = {}
    for ch in first:
        counts[ch] = counts.get(ch, 0) + 1
    for ch in second:
        left = counts.get(ch, 0)
        if left == 0:
            return False
        counts[ch] = left - 1
    return True
