def fewestCoins(amount, coins):
    used = []
    rest = amount
    for coin in coins:
        while rest >= coin:
            used.append(coin)
            rest -= coin
    return used
