def squeeze(text):
    out = ''
    i = 0
    while i < len(text):
        j = i
        while j < len(text) and text[j] == text[i]:
            j += 1
        out += text[i] + str(j - i)
        i = j
    return out
