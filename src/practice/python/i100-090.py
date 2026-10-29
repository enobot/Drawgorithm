def seatRanges(seats):
    out = []
    i = 0
    while i < len(seats):
        j = i
        while j + 1 < len(seats) and seats[j + 1] == seats[j] + 1:
            j += 1
        out.append(str(seats[i]) if i == j else str(seats[i]) + '..' + str(seats[j]))
        i = j + 1
    return out
