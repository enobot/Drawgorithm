def flipInGroups(head, k):
    dummy = ListNode(0, head)
    groupPrev = dummy
    while True:
        kth = groupPrev
        i = 0
        while i < k and kth is not None:
            kth = kth.next
            i += 1
        if kth is None:
            break
        groupNext = kth.next
        prev = groupNext
        curr = groupPrev.next
        while curr is not groupNext:
            nxt = curr.next
            curr.next = prev
            prev = curr
            curr = nxt
        first = groupPrev.next
        groupPrev.next = kth
        groupPrev = first
    return dummy.next
