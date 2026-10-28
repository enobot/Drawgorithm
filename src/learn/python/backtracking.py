def sumsTo(nums, target):
    out = []

    def pick(start, left, chosen):
        if left == 0:
            out.append(chosen[:])
            return
        for i in range(start, len(nums)):
            if nums[i] > left:
                continue
            chosen.append(nums[i])
            pick(i + 1, left - nums[i], chosen)
            chosen.pop()

    pick(0, target, [])
    return out
