def dictionarySplit(text, words):
    known = set(words)
    canCut = [False] * (len(text) + 1)
    canCut[0] = True
    for end in range(1, len(text) + 1):
        for start in range(end):
            if canCut[start] and text[start:end] in known:
                canCut[end] = True
                break
    return canCut[len(text)]
