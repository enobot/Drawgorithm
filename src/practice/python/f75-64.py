def minJumps(jumps):
    launches = 0
    layerEnd = 0
    farthest = 0
    for i in range(len(jumps) - 1):
        farthest = max(farthest, i + jumps[i])
        if i == layerEnd:
            if farthest <= i:
                return -1
            launches += 1
            layerEnd = farthest
    return launches
