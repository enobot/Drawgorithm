def countMirrors(text):
    count = 0

    def expand(lo, hi):
        nonlocal count
        while lo >= 0 and hi < len(text) and text[lo] == text[hi]:
            count += 1
            lo -= 1
            hi += 1

    for center in range(len(text)):
        expand(center, center)
        expand(center, center + 1)
    return count
