def couldBeCode(plain, coded):
    forward = {}
    backward = {}
    for i in range(len(plain)):
        p = plain[i]
        c = coded[i]
        if p in forward and forward[p] != c:
            return False
        if c in backward and backward[c] != p:
            return False
        forward[p] = c
        backward[c] = p
    return True
