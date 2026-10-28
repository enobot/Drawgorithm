def canReachEnd(jumps):
    farthest = 0
    for i in range(len(jumps)):
        if i > farthest:
            return False
        farthest = max(farthest, i + jumps[i])
    return True
