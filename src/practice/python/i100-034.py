def mirrorTree(root):
    if root is None:
        return None
    left = mirrorTree(root.left)
    root.left = mirrorTree(root.right)
    root.right = left
    return root
