def alienOrder(words):
    after = {}
    waiting = {}
    for w in words:
        for ch in w:
            if ch not in after:
                after[ch] = set()
                waiting[ch] = 0
    for i in range(len(words) - 1):
        a = words[i]
        b = words[i + 1]
        j = 0
        while j < len(a) and j < len(b) and a[j] == b[j]:
            j += 1
        if j == len(a) or j == len(b):
            if len(a) > len(b):
                return ''
            continue
        if b[j] not in after[a[j]]:
            after[a[j]].add(b[j])
            waiting[b[j]] += 1
    order = ''
    while len(order) < len(after):
        ready = sorted(ch for ch in waiting if waiting[ch] == 0)
        if len(ready) == 0:
            return ''
        ch = ready[0]
        order += ch
        waiting[ch] = -1
        for later in after[ch]:
            waiting[later] -= 1
    return order
