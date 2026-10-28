def mergeLogs(first, second):
    merged = []
    i = 0
    j = 0
    while i < len(first) and j < len(second):
        if first[i] <= second[j]:
            merged.append(first[i])
            i += 1
        else:
            merged.append(second[j])
            j += 1
    while i < len(first):
        merged.append(first[i])
        i += 1
    while j < len(second):
        merged.append(second[j])
        j += 1
    return merged
