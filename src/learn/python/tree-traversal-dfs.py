def inOrder(root):
    out = []

    def visit(node):
        if node is None:
            return
        visit(node.left)
        out.append(node.val)
        visit(node.right)

    visit(root)
    return out
