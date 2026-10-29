def convoyCount(target, position, speed):
    cars = sorted(zip(position, speed), reverse=True)
    fleets = []
    for p, s in cars:
        time = (target - p) / s
        if len(fleets) == 0 or time > fleets[-1]:
            fleets.append(time)
    return len(fleets)
