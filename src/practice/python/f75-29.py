def insertionSort(cards):
    for i in range(1, len(cards)):
        card = cards[i]
        j = i - 1
        while j >= 0 and cards[j] > card:
            cards[j + 1] = cards[j]
            j -= 1
        cards[j + 1] = card
    return cards
