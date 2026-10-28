def productsWithoutOne(values):
    n = len(values)
    result = [1] * n
    before = 1
    for i in range(n):
        result[i] = before
        before *= values[i]
    after = 1
    for i in range(n - 1, -1, -1):
        result[i] *= after
        after *= values[i]
    return result
