def gridIsValid(board):
    seen = set()
    for r in range(9):
        for c in range(9):
            d = board[r][c]
            if d == '.':
                continue
            box = (r // 3) * 3 + c // 3
            inRow = f'row {r}: {d}'
            inCol = f'col {c}: {d}'
            inBox = f'box {box}: {d}'
            if inRow in seen or inCol in seen or inBox in seen:
                return False
            seen.add(inRow)
            seen.add(inCol)
            seen.add(inBox)
    return True
