def balancedPair(weights, target):
    firstIndex = {}  # weight → first index seen
    for j in range(len(weights)):
        partner = target - weights[j]
        if partner in firstIndex:
            return [firstIndex[partner], j]
        if weights[j] not in firstIndex:
            firstIndex[weights[j]] = j
    return []
