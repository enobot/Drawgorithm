def longestRecolor(stripes, k):
    counts = {}
    left = 0
    most = 0
    best = 0
    for right in range(len(stripes)):
        ch = stripes[right]
        counts[ch] = counts.get(ch, 0) + 1
        most = max(most, counts[ch])
        while right - left + 1 - most > k:
            counts[stripes[left]] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best
