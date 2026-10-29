def removeFromEnd(head, n):
    dummy = ListNode(0, head)
    fast = dummy
    slow = dummy
    for i in range(n + 1):
        fast = fast.next
    while fast is not None:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next
    return dummy.next
