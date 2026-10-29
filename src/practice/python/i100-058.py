def miniFeed(ops):
    posts = {}  # user → [time, id] pairs in posting order
    follows = {}  # user → users they follow
    time = 0
    out = []
    for op in ops:
        kind, user = op[0], op[1]
        if kind == 'post':
            if user not in posts:
                posts[user] = []
            posts[user].append([time, op[2]])
            time += 1
            out.append(None)
        elif kind == 'follow' or kind == 'unfollow':
            if user not in follows:
                follows[user] = set()
            if kind == 'follow' and op[2] != user:
                follows[user].add(op[2])
            if kind == 'unfollow':
                follows[user].discard(op[2])
            out.append(None)
        else:
            sources = [u for u in [user, *follows.get(user, set())] if u in posts]
            cursor = [len(posts[u]) - 1 for u in sources]
            feed = []
            while len(feed) < 10:
                pick = -1
                for s in range(len(sources)):
                    if cursor[s] < 0:
                        continue
                    if pick == -1 or posts[sources[s]][cursor[s]][0] > posts[sources[pick]][cursor[pick]][0]:
                        pick = s
                if pick == -1:
                    break
                feed.append(posts[sources[pick]][cursor[pick]][1])
                cursor[pick] -= 1
            out.append(feed)
    return out
