def rangeSums(values, queries):
    prefix = [0]
    for i in range(len(values)):
        prefix.append(prefix[i] + values[i])
    answers = []
    for lo, hi in queries:
        answers.append(prefix[hi + 1] - prefix[lo])
    return answers
