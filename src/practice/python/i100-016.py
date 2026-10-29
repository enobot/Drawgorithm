def containsScramble(fragment, text):
    need = {}
    for ch in fragment:
        need[ch] = need.get(ch, 0) + 1
    missing = len(fragment)
    for right in range(len(text)):
        ch = text[right]
        if ch in need:
            if need[ch] > 0:
                missing -= 1
            need[ch] -= 1
        left = right - len(fragment)
        if left >= 0 and text[left] in need:
            need[text[left]] += 1
            if need[text[left]] > 0:
                missing += 1
        if missing == 0:
            return True
    return len(fragment) == 0
