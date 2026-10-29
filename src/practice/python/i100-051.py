def mirrorCuts(text):
    out = []

    def isMirror(lo, hi):
        while lo < hi:
            if text[lo] != text[hi]:
                return False
            lo += 1
            hi -= 1
        return True

    def cut(start, pieces):
        if start == len(text):
            out.append(pieces[:])
            return
        for end in range(start, len(text)):
            if not isMirror(start, end):
                continue
            pieces.append(text[start:end + 1])
            cut(end + 1, pieces)
            pieces.pop()

    cut(0, [])
    return out
