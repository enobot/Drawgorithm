def romanToNumber(numeral):
    value = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}
    total = 0
    for i in range(len(numeral)):
        v = value[numeral[i]]
        if i + 1 < len(numeral) and v < value[numeral[i + 1]]:
            total -= v
        else:
            total += v
    return total
