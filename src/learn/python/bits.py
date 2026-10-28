def binaryDigits(n):
    if n == 0:
        return '0'
    digits = ''
    rest = n
    while rest > 0:
        digits = str(rest & 1) + digits
        rest = rest >> 1
    return digits
