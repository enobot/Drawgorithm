def burstOrder(balloons):
    vals = [1, *balloons, 1]
    n = len(vals)
    best = []
    for i in range(n):
        best.append([0] * n)
    for gap in range(2, n):
        for i in range(n - gap):
            j = i + gap
            for last in range(i + 1, j):
                coins = best[i][last] + vals[i] * vals[last] * vals[j] + best[last][j]
                if coins > best[i][j]:
                    best[i][j] = coins
    return best[0][n - 1]
