def mergeBookings(intervals):
    ordered = sorted(intervals, key=lambda x: x[0])
    merged = []
    for start, end in ordered:
        last = merged[-1] if len(merged) > 0 else None
        if last is not None and start <= last[1]:
            last[1] = max(last[1], end)
        else:
            merged.append([start, end])
    return merged
