def fastPower(x, n):
    if n < 0:
        return 1 / fastPower(x, -n)
    if n == 0:
        return 1
    half = fastPower(x, n // 2)
    return half * half if n % 2 == 0 else half * half * x
