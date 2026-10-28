def listSummary(head):
    count = 0
    total = 0
    node = head
    while node is not None:
        count += 1
        total += node.val
        node = node.next
    return [count, total]
