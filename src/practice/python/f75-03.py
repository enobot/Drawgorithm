def countCodes(codes):
    counts = {}
    order = []
    for code in codes:
        if code not in counts:
            counts[code] = 0
            order.append(code)
        counts[code] += 1
    result = []
    for code in order:
        result.append([code, counts[code]])
    return result
