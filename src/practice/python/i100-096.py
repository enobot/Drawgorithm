def happyDigits(n):
    def squareDigits(x):
        total = 0
        while x > 0:
            d = x % 10
            total += d * d
            x = x // 10
        return total

    slow = n
    fast = squareDigits(n)
    while fast != 1 and slow != fast:
        slow = squareDigits(slow)
        fast = squareDigits(squareDigits(fast))
    return fast == 1
