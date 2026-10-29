def wovenMessages(a, b, text):
    if len(a) + len(b) != len(text):
        return False
    can = []
    for i in range(len(a) + 1):
        can.append([False] * (len(b) + 1))
    can[0][0] = True
    for i in range(len(a) + 1):
        for j in range(len(b) + 1):
            if i > 0 and can[i - 1][j] and a[i - 1] == text[i + j - 1]:
                can[i][j] = True
            if j > 0 and can[i][j - 1] and b[j - 1] == text[i + j - 1]:
                can[i][j] = True
    return can[len(a)][len(b)]
