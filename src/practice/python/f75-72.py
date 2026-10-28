def loneBadge(ids):
    acc = 0
    for badge in ids:
        acc ^= badge
    return acc
