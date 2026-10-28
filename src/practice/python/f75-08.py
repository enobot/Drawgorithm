def compactReadings(readings):
    if len(readings) == 0:
        return 0
    write = 1
    for read in range(1, len(readings)):
        if readings[read] != readings[write - 1]:
            readings[write] = readings[read]
            write += 1
    return write
