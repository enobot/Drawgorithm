def pointsInRow(points):
    if len(points) <= 2:
        return len(points)

    def gcd(a, b):
        return a if b == 0 else gcd(b, a % b)

    best = 1
    for i in range(len(points)):
        slopes = {}
        for j in range(i + 1, len(points)):
            dx = points[j][0] - points[i][0]
            dy = points[j][1] - points[i][1]
            g = gcd(abs(dx), abs(dy))
            dx //= g
            dy //= g
            if dx < 0 or (dx == 0 and dy < 0):
                dx = -dx
                dy = -dy
            key = f'{dx}/{dy}'
            slopes[key] = slopes.get(key, 0) + 1
            best = max(best, slopes[key] + 1)
    return best
