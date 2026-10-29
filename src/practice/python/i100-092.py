def evenLines(words, width):
    lines = []
    i = 0
    while i < len(words):
        j = i
        length = 0
        while j < len(words) and length + len(words[j]) + (j - i) <= width:
            length += len(words[j])
            j += 1
        gaps = j - i - 1
        line = ''
        if j == len(words) or gaps == 0:
            line = ' '.join(words[i:j])
            line += ' ' * (width - len(line))
        else:
            spaces = width - length
            for k in range(i, j):
                line += words[k]
                if k < j - 1:
                    line += ' ' * (spaces // gaps + (1 if k - i < spaces % gaps else 0))
        lines.append(line)
        i = j
    return lines
