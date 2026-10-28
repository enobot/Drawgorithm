def changeWays(amount, coins):
    ways = [1]
    for a in range(1, amount + 1):
        ways.append(0)
    for coin in coins:
        for a in range(coin, amount + 1):
            ways[a] += ways[a - coin]
    return ways[amount]
