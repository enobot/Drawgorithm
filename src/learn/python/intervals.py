def mergeSpans(spans):
    ordered = sorted(spans, key=lambda span: span[0])
    out = []
    for start, end in ordered:
        last = out[-1] if len(out) > 0 else None
        if last is not None and start <= last[1]:
            last[1] = max(last[1], end)
        else:
            out.append([start, end])
    return out
