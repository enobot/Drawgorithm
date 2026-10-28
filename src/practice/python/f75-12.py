def longestQuietStretch(signal):
    lastSeen = {}
    left = 0
    best = 0
    for right in range(len(signal)):
        ch = signal[right]
        if ch in lastSeen and lastSeen[ch] >= left:
            left = lastSeen[ch] + 1
        lastSeen[ch] = right
        best = max(best, right - left + 1)
    return best
