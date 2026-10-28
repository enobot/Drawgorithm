import math


def isOrdered(root):
    def check(node, low, high):
        if node is None:
            return True
        if node.val <= low or node.val >= high:
            return False
        return check(node.left, low, node.val) and check(node.right, node.val, high)

    return check(root, -math.inf, math.inf)
