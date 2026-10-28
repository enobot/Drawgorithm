def searchRotated(archive, target):
    lo = 0
    hi = len(archive) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if archive[mid] == target:
            return mid
        if archive[lo] <= archive[mid]:
            if archive[lo] <= target < archive[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:
            if archive[mid] < target <= archive[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
