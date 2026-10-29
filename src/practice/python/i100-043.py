def kthInOrder(root, k):
    stack = []
    node = root
    count = 0
    while node is not None or len(stack) > 0:
        while node is not None:
            stack.append(node)
            node = node.left
        node = stack.pop()
        count += 1
        if count == k:
            return node.val
        node = node.right
    return None
