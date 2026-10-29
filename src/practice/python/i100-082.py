def patternMatches(text, pattern):
    can = []
    for i in range(len(text) + 1):
        can.append([False] * (len(pattern) + 1))
    can[len(text)][len(pattern)] = True
    for i in range(len(text), -1, -1):
        for j in range(len(pattern) - 1, -1, -1):
            first = i < len(text) and (pattern[j] == text[i] or pattern[j] == '.')
            if j + 1 < len(pattern) and pattern[j + 1] == '*':
                can[i][j] = can[i][j + 2] or (first and can[i + 1][j])
            else:
                can[i][j] = first and can[i + 1][j + 1]
    return can[0][0]
