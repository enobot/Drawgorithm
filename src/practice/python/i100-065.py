import math


def cheapestWithStops(n, flights, src, dst, k):
    price = [math.inf] * n
    price[src] = 0
    for _ in range(k + 1):
        updated = price[:]
        for a, b, cost in flights:
            if price[a] + cost < updated[b]:
                updated[b] = price[a] + cost
        price = updated
    return -1 if price[dst] == math.inf else price[dst]
