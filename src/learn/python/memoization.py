def tilings(n):
    memo = {}

    def ways(k):
        if k <= 1:
            return 1
        if k in memo:
            return memo[k]
        total = ways(k - 1) + ways(k - 2)
        memo[k] = total
        return total

    return ways(n)
