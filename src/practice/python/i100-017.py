import math


def smallestCover(text, required):
    if len(required) == 0:
        return ''
    need = {}
    for ch in required:
        need[ch] = need.get(ch, 0) + 1
    missing = len(required)
    left = 0
    bestStart = 0
    bestLength = math.inf
    for right in range(len(text)):
        ch = text[right]
        if ch in need:
            if need[ch] > 0:
                missing -= 1
            need[ch] -= 1
        while missing == 0:
            if right - left + 1 < bestLength:
                bestLength = right - left + 1
                bestStart = left
            out = text[left]
            if out in need:
                need[out] += 1
                if need[out] > 0:
                    missing += 1
            left += 1
    return '' if bestLength == math.inf else text[bestStart:bestStart + bestLength]
