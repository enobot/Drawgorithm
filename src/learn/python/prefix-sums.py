def rangeTotals(nums, queries):
    prefix = [0]
    for i in range(len(nums)):
        prefix.append(prefix[i] + nums[i])
    out = []
    for lo, hi in queries:
        out.append(prefix[hi + 1] - prefix[lo])
    return out
