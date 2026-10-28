def editDistance(source, target):
    table = []
    for i in range(len(source) + 1):
        row = [0] * (len(target) + 1)
        row[0] = i
        table.append(row)
    for j in range(len(target) + 1):
        table[0][j] = j
    for i in range(1, len(source) + 1):
        for j in range(1, len(target) + 1):
            if source[i - 1] == target[j - 1]:
                table[i][j] = table[i - 1][j - 1]
            else:
                table[i][j] = 1 + min(table[i - 1][j - 1], table[i - 1][j], table[i][j - 1])
    return table[len(source)][len(target)]
