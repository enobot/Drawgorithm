def existsPath(board, word):
    rows = len(board)
    cols = len(board[0]) if rows > 0 else 0

    def walk(r, c, i):
        if i == len(word):
            return True
        if r < 0 or c < 0 or r >= rows or c >= cols or board[r][c] != word[i]:
            return False
        letter = board[r][c]
        board[r][c] = '#'
        found = walk(r + 1, c, i + 1) or walk(r - 1, c, i + 1) or walk(r, c + 1, i + 1) or walk(r, c - 1, i + 1)
        board[r][c] = letter
        return found

    for r in range(rows):
        for c in range(cols):
            if walk(r, c, 0):
                return True
    return False
