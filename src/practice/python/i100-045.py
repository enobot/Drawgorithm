def zigzagLevels(root):
    levels = []
    if root is None:
        return levels
    queue = [root]
    leftToRight = True
    while len(queue) > 0:
        level = []
        nextLevel = []
        for node in queue:
            level.append(node.val)
            if node.left is not None:
                nextLevel.append(node.left)
            if node.right is not None:
                nextLevel.append(node.right)
        if not leftToRight:
            level.reverse()
        levels.append(level)
        leftToRight = not leftToRight
        queue = nextLevel
    return levels
