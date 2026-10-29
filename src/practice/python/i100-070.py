def circleDonations(donations):
    n = len(donations)
    if n == 1:
        return donations[0]

    def line(first, last):
        prev = 0
        best = 0
        for i in range(first, last + 1):
            take = prev + donations[i]
            prev = best
            best = max(best, take)
        return best

    return max(line(1, n - 1), line(0, n - 2))
