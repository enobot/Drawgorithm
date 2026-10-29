def longestMirror(text):
    bestStart = 0
    bestLength = 0

    def expand(lo, hi):
        nonlocal bestStart, bestLength
        while lo >= 0 and hi < len(text) and text[lo] == text[hi]:
            lo -= 1
            hi += 1
        if hi - lo - 1 > bestLength:
            bestLength = hi - lo - 1
            bestStart = lo + 1

    for center in range(len(text)):
        expand(center, center)
        expand(center, center + 1)
    return text[bestStart:bestStart + bestLength]
