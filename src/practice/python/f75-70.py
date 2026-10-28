class TrieNode:
    def __init__(self):
        self.children = {}
        self.word = ''


def findWords(board, words):
    root = TrieNode()
    for w in words:
        node = root
        for ch in w:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.word = w
    found = []

    def explore(r, c, node):
        if r < 0 or c < 0 or r >= len(board) or c >= len(board[0]):
            return
        letter = board[r][c]
        nxt = node.children.get(letter)
        if nxt is None:
            return
        if nxt.word != '':
            found.append(nxt.word)
            nxt.word = ''
        board[r][c] = '#'
        explore(r + 1, c, nxt)
        explore(r - 1, c, nxt)
        explore(r, c + 1, nxt)
        explore(r, c - 1, nxt)
        board[r][c] = letter

    for r in range(len(board)):
        for c in range(len(board[0])):
            explore(r, c, root)
    found.sort()
    return found
