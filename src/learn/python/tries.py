class TrieNode:
    def __init__(self):
        self.children = {}
        self.count = 0
        self.end = False


def prefixCounts(words, prefixes):
    root = TrieNode()
    for w in words:
        node = root
        for ch in w:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
            node.count += 1
        node.end = True
    out = []
    for p in prefixes:
        node = root
        for ch in p:
            node = node.children.get(ch)
            if node is None:
                break
        out.append(node.count if node is not None else 0)
    return out
