def ticketTrail(tickets, start):
    targets = {}  # airport → destinations, the smallest last
    for frm, to in tickets:
        if frm not in targets:
            targets[frm] = []
        targets[frm].append(to)
    for dests in targets.values():
        dests.sort(reverse=True)
    route = []
    stack = [start]
    while len(stack) > 0:
        airport = stack[-1]
        dests = targets.get(airport)
        if dests is not None and len(dests) > 0:
            stack.append(dests.pop())
        else:
            route.append(stack.pop())
    route.reverse()
    return route
