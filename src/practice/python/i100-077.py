def evenSplit(weights):
    total = sum(weights)
    if total % 2 != 0:
        return False
    half = total // 2
    reachable = {0}
    for w in weights:
        grown = set(reachable)
        for s in reachable:
            if s + w <= half:
                grown.add(s + w)
        reachable = grown
        if half in reachable:
            return True
    return half in reachable
