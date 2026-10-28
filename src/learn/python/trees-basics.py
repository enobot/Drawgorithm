def countLeaves(node):
    if node is None:
        return 0
    if node.left is None and node.right is None:
        return 1
    return countLeaves(node.left) + countLeaves(node.right)
