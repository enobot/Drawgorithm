def sharedOpening(names):
    if len(names) == 0:
        return ''
    prefix = ''
    for i in range(len(names[0])):
        ch = names[0][i]
        for name in names:
            if i >= len(name) or name[i] != ch:
                return prefix
        prefix += ch
    return prefix
