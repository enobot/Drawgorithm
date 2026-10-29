def majorityVote(ballots):
    candidate = ballots[0]
    count = 0
    for b in ballots:
        if count == 0:
            candidate = b
        count += 1 if b == candidate else -1
    return candidate
