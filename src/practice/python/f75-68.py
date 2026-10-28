class TrieNode:
    def __init__(self):
        self.children = {}
        self.end = False


def wildcardDictionary(ops):
    root = TrieNode()

    def matches(node, pattern, i):
        if i == len(pattern):
            return node.end
        ch = pattern[i]
        if ch != '.':
            nxt = node.children.get(ch)
            return nxt is not None and matches(nxt, pattern, i + 1)
        for letter in node.children:
            if matches(node.children[letter], pattern, i + 1):
                return True
        return False

    out = []
    for kind, text in ops:
        if kind == 'add':
            node = root
            for ch in text:
                if ch not in node.children:
                    node.children[ch] = TrieNode()
                node = node.children[ch]
            node.end = True
            out.append(None)
        else:
            out.append(matches(root, text, 0))
    return out
