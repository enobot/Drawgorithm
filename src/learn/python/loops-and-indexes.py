def countRises(readings):
    rises = 0
    for i in range(1, len(readings)):
        if readings[i] > readings[i - 1]:
            rises += 1
    return rises
