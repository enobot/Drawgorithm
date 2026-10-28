def largestAt(nums):
    best = 0
    for i in range(1, len(nums)):
        if nums[i] > nums[best]:
            best = i
    return best
