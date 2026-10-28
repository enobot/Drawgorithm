def placeTowers(n, blocked):
    out = []
    board = []
    for r in range(n):
        board.append([])
        for c in range(n):
            board[r].append('.')
    for r, c in blocked:
        board[r][c] = 'x'
    cols = set()
    downs = set()
    ups = set()

    def place(placed):
        r = len(placed)
        if r == n:
            out.append(placed[:])
            return
        for c in range(n):
            if board[r][c] == 'x' or c in cols or r + c in downs or r - c in ups:
                continue
            cols.add(c)
            downs.add(r + c)
            ups.add(r - c)
            placed.append(c)
            board[r][c] = 'T'
            place(placed)
            board[r][c] = '.'
            placed.pop()
            cols.remove(c)
            downs.remove(r + c)
            ups.remove(r - c)

    place([])
    return out
