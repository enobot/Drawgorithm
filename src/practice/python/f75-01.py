def findFirst(shelf, wanted):
    for i in range(len(shelf)):
        if shelf[i] == wanted:
            return i
    return -1
