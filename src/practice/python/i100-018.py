def chainStarts(text, words):
    if len(words) == 0:
        return []
    size = len(words[0])
    need = {}
    for w in words:
        need[w] = need.get(w, 0) + 1
    starts = []
    for offset in range(size):
        seen = {}
        used = 0
        left = offset
        right = offset
        while right + size <= len(text):
            word = text[right:right + size]
            if word not in need:
                seen = {}
                used = 0
                left = right + size
                right += size
                continue
            seen[word] = seen.get(word, 0) + 1
            used += 1
            while seen[word] > need[word]:
                first = text[left:left + size]
                seen[first] -= 1
                used -= 1
                left += size
            if used == len(words):
                starts.append(left)
                first = text[left:left + size]
                seen[first] -= 1
                used -= 1
                left += size
            right += size
    starts.sort()
    return starts
