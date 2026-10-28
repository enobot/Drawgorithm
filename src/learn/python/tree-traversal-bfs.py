from collections import deque


def rightSide(root):
    if root is None:
        return []
    out = []
    queue = deque([root])
    while len(queue) > 0:
        size = len(queue)
        for k in range(size):
            node = queue.popleft()
            if k == size - 1:
                out.append(node.val)
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)
    return out
