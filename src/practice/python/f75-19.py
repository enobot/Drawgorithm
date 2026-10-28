def loopStart(head):
    slow = head
    fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            a = head
            b = slow
            position = 0
            while a is not b:
                a = a.next
                b = b.next
                position += 1
            return position
    return -1
