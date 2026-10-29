def captureEnclosed(board):
    rows = len(board)
    cols = len(board[0])
    stack = []
    for r in range(rows):
        for c in range(cols):
            onEdge = r == 0 or c == 0 or r == rows - 1 or c == cols - 1
            if onEdge and board[r][c] == 'O':
                board[r][c] = 'S'
                stack.append((r, c))
    while len(stack) > 0:
        r, c = stack.pop()
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr = r + dr
            nc = c + dc
            if nr < 0 or nc < 0 or nr >= rows or nc >= cols or board[nr][nc] != 'O':
                continue
            board[nr][nc] = 'S'
            stack.append((nr, nc))
    for r in range(rows):
        for c in range(cols):
            if board[r][c] == 'O':
                board[r][c] = 'X'
            elif board[r][c] == 'S':
                board[r][c] = 'O'
    return board
