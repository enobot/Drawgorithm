def missingBadge(badges):
    acc = len(badges)
    for i in range(len(badges)):
        acc ^= i ^ badges[i]
    return acc
