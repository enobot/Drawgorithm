def trappedWater(heights):
    left = 0
    right = len(heights) - 1
    leftMax = 0
    rightMax = 0
    water = 0
    while left < right:
        if heights[left] < heights[right]:
            leftMax = max(leftMax, heights[left])
            water += leftMax - heights[left]
            left += 1
        else:
            rightMax = max(rightMax, heights[right])
            water += rightMax - heights[right]
            right -= 1
    return water
