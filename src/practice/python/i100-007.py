def mostRequested(orders, k):
    counts = {}
    for item in orders:
        counts[item] = counts.get(item, 0) + 1
    buckets = []
    for c in range(len(orders) + 1):
        buckets.append([])
    for item, count in counts.items():
        buckets[count].append(item)
    top = []
    c = len(orders)
    while c > 0 and len(top) < k:
        buckets[c].sort()
        for item in buckets[c]:
            if len(top) == k:
                break
            top.append(item)
        c -= 1
    return top
