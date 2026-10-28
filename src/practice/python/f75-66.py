class TrieNode:
    def __init__(self):
        self.children = {}
        self.end = False


def runDictionary(ops):
    root = TrieNode()
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
            node = root
            for ch in text:
                node = node.children.get(ch)
                if node is None:
                    break
            if kind == 'has':
                out.append(node is not None and node.end)
            else:
                out.append(node is not None)
    return out
