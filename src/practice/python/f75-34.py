from collections import deque


def groupByLevel(root):
    levels = []
    if root is None:
        return levels
    queue = deque([root])
    while len(queue) > 0:
        size = len(queue)
        level = []
        for i in range(size):
            node = queue.popleft()
            level.append(node.val)
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)
        levels.append(level)
    return levels
