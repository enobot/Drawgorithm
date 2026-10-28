def bstSearch(root, target):
    node = root
    while node is not None:
        if target == node.val:
            return True
        node = node.left if target < node.val else node.right
    return False
