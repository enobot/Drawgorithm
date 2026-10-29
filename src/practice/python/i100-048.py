def balancedBrackets(n):
    out = []

    def build(text, opened, closed):
        if len(text) == 2 * n:
            out.append(text)
            return
        if opened < n:
            build(text + '(', opened + 1, closed)
        if closed < opened:
            build(text + ')', opened, closed + 1)

    build('', 0, 0)
    return out
