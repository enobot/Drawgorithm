def roundTrip(root):
    parts = []

    def toText(node):
        if node is None:
            parts.append('#')
            return
        parts.append(str(node.val))
        toText(node.left)
        toText(node.right)

    toText(root)
    text = ','.join(parts)

    tokens = text.split(',')
    pos = 0

    def fromText():
        nonlocal pos
        token = tokens[pos]
        pos += 1
        if token == '#':
            return None
        node = TreeNode(int(token))
        node.left = fromText()
        node.right = fromText()
        return node

    return [text, fromText()]
