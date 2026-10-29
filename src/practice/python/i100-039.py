def containsBranch(tree, branch):
    def same(a, b):
        if a is None or b is None:
            return a is b
        return a.val == b.val and same(a.left, b.left) and same(a.right, b.right)

    if branch is None:
        return True
    if tree is None:
        return False
    return same(tree, branch) or containsBranch(tree.left, branch) or containsBranch(tree.right, branch)
