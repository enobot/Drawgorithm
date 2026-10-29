def rebuildTree(preorder, inorder):
    position = {}
    for i, v in enumerate(inorder):
        position[v] = i
    nextIndex = 0

    def build(lo, hi):
        nonlocal nextIndex
        if lo > hi:
            return None
        value = preorder[nextIndex]
        nextIndex += 1
        node = TreeNode(value)
        mid = position[value]
        node.left = build(lo, mid - 1)
        node.right = build(mid + 1, hi)
        return node

    return build(0, len(inorder) - 1)
