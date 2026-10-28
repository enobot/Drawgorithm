def readsSameBothWays(message):
    def counts(c):
        return ('a' <= c <= 'z') or ('A' <= c <= 'Z') or ('0' <= c <= '9')

    left = 0
    right = len(message) - 1
    while left < right:
        if not counts(message[left]):
            left += 1
        elif not counts(message[right]):
            right -= 1
        else:
            if message[left].lower() != message[right].lower():
                return False
            left += 1
            right -= 1
    return True
