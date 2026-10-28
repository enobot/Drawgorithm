def maxReward(rewards):
    dp = [0] * (len(rewards) + 1)
    for i in range(1, len(rewards) + 1):
        opened = (dp[i - 2] if i >= 2 else 0) + rewards[i - 1]
        dp[i] = max(dp[i - 1], opened)
    return dp[len(rewards)]
