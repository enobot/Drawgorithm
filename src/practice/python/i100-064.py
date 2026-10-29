def canFinish(n, pairs):
    unlocks = []
    for c in range(n):
        unlocks.append([])
    for course, needed in pairs:
        unlocks[needed].append(course)
    state = [0] * n  # 0 not visited, 1 in progress, 2 done

    def visit(c):
        if state[c] == 1:
            return False
        if state[c] == 2:
            return True
        state[c] = 1
        for nextCourse in unlocks[c]:
            if not visit(nextCourse):
                return False
        state[c] = 2
        return True

    for c in range(n):
        if not visit(c):
            return False
    return True
