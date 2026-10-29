def appearsInOrder(clue, path):
    i = 0
    for j in range(len(path)):
        if i == len(clue):
            break
        if path[j] == clue[i]:
            i += 1
    return i == len(clue)
