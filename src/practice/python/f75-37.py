def allSelections(items):
    out = []

    def decide(i, picked):
        if i == len(items):
            out.append(picked[:])
            return
        picked.append(items[i])
        decide(i + 1, picked)
        picked.pop()
        decide(i + 1, picked)

    decide(0, [])
    return out
