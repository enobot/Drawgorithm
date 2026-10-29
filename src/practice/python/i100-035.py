def sameTree(a, b):
    if a is None or b is None:
        return a is b
    return a.val == b.val and sameTree(a.left, b.left) and sameTree(a.right, b.right)
