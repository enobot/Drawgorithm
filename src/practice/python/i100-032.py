def repeatedTicket(tickets):
    slow = tickets[0]
    fast = tickets[0]
    while True:
        slow = tickets[slow]
        fast = tickets[tickets[fast]]
        if slow == fast:
            break
    slow = tickets[0]
    while slow != fast:
        slow = tickets[slow]
        fast = tickets[fast]
    return slow
