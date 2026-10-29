def hiddenCopies(source, target):
    ways = [0] * (len(target) + 1)
    ways[0] = 1
    for ch in source:
        for j in range(len(target), 0, -1):
            if target[j - 1] == ch:
                ways[j] += ways[j - 1]
    return ways[len(target)]
