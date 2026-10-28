import math


def maxMeetings(meetings):
    byEnd = sorted(meetings, key=lambda x: x[1])
    count = 0
    freeAt = -math.inf
    for start, end in byEnd:
        if start >= freeAt:
            count += 1
            freeAt = end
    return count
