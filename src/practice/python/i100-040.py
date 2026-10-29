def routeTotal(root, target):
    if root is None:
        return False
    rest = target - root.val
    if root.left is None and root.right is None:
        return rest == 0
    return routeTotal(root.left, rest) or routeTotal(root.right, rest)
