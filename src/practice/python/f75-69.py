class TrieNode:
    def __init__(self):
        self.children = {}
        self.end = False


def replaceWithRoots(roots, sentence):
    trie = TrieNode()
    for root in roots:
        node = trie
        for ch in root:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.end = True
    words = sentence.split(' ')
    for w in range(len(words)):
        node = trie
        prefix = ''
        for ch in words[w]:
            node = node.children.get(ch)
            if node is None:
                break
            prefix += ch
            if node.end:
                words[w] = prefix
                break
    return ' '.join(words)
