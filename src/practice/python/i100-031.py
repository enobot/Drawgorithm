def addDigitChains(a, b):
    dummy = ListNode(0)
    tail = dummy
    carry = 0
    while a is not None or b is not None or carry > 0:
        total = (a.val if a is not None else 0) + (b.val if b is not None else 0) + carry
        carry = total // 10
        tail.next = ListNode(total % 10)
        tail = tail.next
        if a is not None:
            a = a.next
        if b is not None:
            b = b.next
    return dummy.next
