def decodeWays(digits):
    twoBack = 1
    oneBack = 0 if digits[0] == '0' else 1
    for i in range(2, len(digits) + 1):
        ways = 0
        if digits[i - 1] != '0':
            ways += oneBack
        pair = int(digits[i - 2:i])
        if 10 <= pair <= 26:
            ways += twoBack
        twoBack = oneBack
        oneBack = ways
    return oneBack
