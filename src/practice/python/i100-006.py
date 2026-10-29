def groupRearrangements(words):
    groups = {}  # sorted letters → words
    for w in words:
        key = ''.join(sorted(w))
        if key not in groups:
            groups[key] = []
        groups[key].append(w)
    shelves = []
    for key in groups:
        shelves.append(groups[key])
    return shelves
