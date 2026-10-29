def zeroTriples(charges):
    ordered = sorted(charges)
    triples = []
    for i in range(len(ordered) - 2):
        if i > 0 and ordered[i] == ordered[i - 1]:
            continue
        lo = i + 1
        hi = len(ordered) - 1
        while lo < hi:
            total = ordered[i] + ordered[lo] + ordered[hi]
            if total < 0:
                lo += 1
            elif total > 0:
                hi -= 1
            else:
                triples.append([ordered[i], ordered[lo], ordered[hi]])
                lo += 1
                hi -= 1
                while lo < hi and ordered[lo] == ordered[lo - 1]:
                    lo += 1
    return triples
