def payExactly(values, target):
    ordered = sorted(values)
    out = []

    def pick(start, left, chosen):
        if left == 0:
            out.append(chosen[:])
            return
        for i in range(start, len(ordered)):
            if ordered[i] > left:
                break
            chosen.append(ordered[i])
            pick(i, left - ordered[i], chosen)
            chosen.pop()

    pick(0, target, [])
    return out
