def insertBooking(bookings, fresh):
    out = []
    start, end = fresh
    i = 0
    while i < len(bookings) and bookings[i][1] < start:
        out.append(bookings[i])
        i += 1
    while i < len(bookings) and bookings[i][0] <= end:
        start = min(start, bookings[i][0])
        end = max(end, bookings[i][1])
        i += 1
    out.append([start, end])
    while i < len(bookings):
        out.append(bookings[i])
        i += 1
    return out
