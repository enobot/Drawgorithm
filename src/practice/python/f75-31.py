def treeFacts(root):
    nodes = 0
    leaves = 0

    def visit(node, depth):
        nonlocal nodes, leaves
        if node is None:
            return 0
        nodes += 1
        if node.left is None and node.right is None:
            leaves += 1
        return max(depth, visit(node.left, depth + 1), visit(node.right, depth + 1))

    depth = visit(root, 1)
    return [nodes, leaves, depth]
