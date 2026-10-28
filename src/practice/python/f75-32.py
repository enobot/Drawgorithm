def containsValue(root, target):
    if root is None:
        return False
    if root.val == target:
        return True
    return containsValue(root.left, target) or containsValue(root.right, target)
