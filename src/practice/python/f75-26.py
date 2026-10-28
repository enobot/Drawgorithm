def findReading(readings, target):
    low = 0
    high = len(readings) - 1
    while low <= high:
        mid = (low + high) // 2
        if readings[mid] == target:
            return mid
        if readings[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1
