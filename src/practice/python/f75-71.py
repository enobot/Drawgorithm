def raisedAlarms(flags):
    count = 0
    rest = flags
    while rest != 0:
        rest &= rest - 1
        count += 1
    return count
