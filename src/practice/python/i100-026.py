def versionStore(ops):
    history = {}  # key → [time, value] pairs in increasing time
    out = []
    for op in ops:
        if op[0] == 'set':
            if op[1] not in history:
                history[op[1]] = []
            history[op[1]].append([op[3], op[2]])
            out.append(None)
        else:
            records = history.get(op[1], [])
            lo = 0
            hi = len(records)  # lo ends at the first record later than the time
            while lo < hi:
                mid = (lo + hi) // 2
                if records[mid][0] <= op[2]:
                    lo = mid + 1
                else:
                    hi = mid
            out.append('' if lo == 0 else records[lo - 1][1])
    return out
