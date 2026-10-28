class TrieNode:
    def __init__(self):
        self.children = {}
        self.end = False


def suggestions(contacts, typed):
    root = TrieNode()
    for name in contacts:
        node = root
        for ch in name:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.end = True
    result = []
    node = root
    prefix = ''
    for ch in typed:
        prefix += ch
        node = None if node is None else node.children.get(ch)
        found = []

        def collect(at, word):
            if len(found) == 3:
                return
            if at.end:
                found.append(word)
            for letter in sorted(at.children):
                collect(at.children[letter], word + letter)

        if node is not None:
            collect(node, prefix)
        result.append(found)
    return result
