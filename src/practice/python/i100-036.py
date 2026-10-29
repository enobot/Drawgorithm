def isMirrorImage(root):
    def mirrored(a, b):
        if a is None or b is None:
            return a is b
        return a.val == b.val and mirrored(a.left, b.right) and mirrored(a.right, b.left)

    return root is None or mirrored(root.left, root.right)
