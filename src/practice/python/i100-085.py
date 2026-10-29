def sectionSizes(text):
    last = {}
    for i in range(len(text)):
        last[text[i]] = i
    sizes = []
    start = 0
    end = 0
    for i in range(len(text)):
        end = max(end, last[text[i]])
        if i == end:
            sizes.append(end - start + 1)
            start = i + 1
    return sizes
