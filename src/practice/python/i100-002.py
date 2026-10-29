def canClipNote(note, magazine):
    supply = {}
    for ch in magazine:
        supply[ch] = supply.get(ch, 0) + 1
    for ch in note:
        left = supply.get(ch, 0)
        if left == 0:
            return False
        supply[ch] = left - 1
    return True
