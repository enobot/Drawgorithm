def countRoutes(n):
    memo = {}

    def routes(k):
        if k <= 1:
            return 1
        if k in memo:
            return memo[k]
        ways = routes(k - 1) + routes(k - 2)
        memo[k] = ways
        return ways

    return routes(n)
