def hasRepeat(log):
    seen = set()
    for i in range(len(log)):
        if log[i] in seen:
            return True
        seen.add(log[i])
    return False
