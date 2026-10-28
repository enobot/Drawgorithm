def allArrangements(tokens):
    out = []
    used = [False] * len(tokens)

    def place(arrangement):
        if len(arrangement) == len(tokens):
            out.append(arrangement[:])
            return
        for k in range(len(tokens)):
            if used[k]:
                continue
            used[k] = True
            arrangement.append(tokens[k])
            place(arrangement)
            arrangement.pop()
            used[k] = False

    place([])
    return out
