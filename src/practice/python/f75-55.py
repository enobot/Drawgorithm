def mergeProfiles(profiles):
    parent = []
    for i in range(len(profiles)):
        parent.append(i)

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    owner = {}
    for i in range(len(profiles)):
        for k in range(1, len(profiles[i])):
            email = profiles[i][k]
            if email not in owner:
                owner[email] = i
            else:
                a = find(i)
                b = find(owner[email])
                if a != b:
                    parent[max(a, b)] = min(a, b)
    groups = {}
    for i in range(len(profiles)):
        root = find(i)
        if root not in groups:
            groups[root] = set()
        for k in range(1, len(profiles[i])):
            groups[root].add(profiles[i][k])
    result = []
    for root, emails in groups.items():
        result.append([profiles[root][0]] + sorted(emails))
    return result
