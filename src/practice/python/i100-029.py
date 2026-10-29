def foldChain(head):
    if head is None:
        return head
    slow = head
    fast = head
    while fast.next is not None and fast.next.next is not None:
        slow = slow.next
        fast = fast.next.next
    prev = None
    curr = slow.next
    slow.next = None
    while curr is not None:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    first = head
    second = prev
    while second is not None:
        nextFirst = first.next
        nextSecond = second.next
        first.next = second
        second.next = nextFirst
        first = nextFirst
        second = nextSecond
    return head
