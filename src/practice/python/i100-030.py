class Card:
    def __init__(self, val):
        self.val = val
        self.next = None
        self.random = None


def shadowCopy(entries):
    # The original route, built from [value, see-also index] pairs.
    originals = [Card(e[0]) for e in entries]
    for i in range(len(originals)):
        originals[i].next = originals[i + 1] if i + 1 < len(originals) else None
        originals[i].random = None if entries[i][1] is None else originals[entries[i][1]]
    head = originals[0] if len(originals) > 0 else None

    # One new card per original, then the same links between the copies.
    copyOf = {}
    card = head
    while card is not None:
        copyOf[card] = Card(card.val)
        card = card.next
    card = head
    while card is not None:
        copy = copyOf[card]
        copy.next = None if card.next is None else copyOf[card.next]
        copy.random = None if card.random is None else copyOf[card.random]
        card = card.next
    copyHead = None if head is None else copyOf[head]

    # The copy, written in the same format.
    position = {}
    index = 0
    card = copyHead
    while card is not None:
        position[card] = index
        index += 1
        card = card.next
    out = []
    card = copyHead
    while card is not None:
        out.append([card.val, None if card.random is None else position[card.random]])
        card = card.next
    return out
