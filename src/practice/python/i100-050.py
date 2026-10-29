def distinctSets(stickers):
    ordered = sorted(stickers)
    out = []

    def choose(start, chosen):
        out.append(chosen[:])
        for i in range(start, len(ordered)):
            if i > start and ordered[i] == ordered[i - 1]:
                continue
            chosen.append(ordered[i])
            choose(i + 1, chosen)
            chosen.pop()

    choose(0, [])
    return out
