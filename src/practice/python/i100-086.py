def fairTreats(ratings):
    treats = [1] * len(ratings)
    for i in range(1, len(ratings)):
        if ratings[i] > ratings[i - 1]:
            treats[i] = treats[i - 1] + 1
    for i in range(len(ratings) - 2, -1, -1):
        if ratings[i] > ratings[i + 1]:
            treats[i] = max(treats[i], treats[i + 1] + 1)
    return sum(treats)
