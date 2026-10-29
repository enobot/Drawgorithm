def mirrorBits(n):
    result = 0
    rest = n
    for i in range(32):
        result = result * 2 + (rest & 1)
        rest = rest // 2
    return result
