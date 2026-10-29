def keypadSpellings(digits):
    letters = {'2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl', '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'}
    out = []
    if len(digits) == 0:
        return out

    def spell(i, text):
        if i == len(digits):
            out.append(text)
            return
        for ch in letters[digits[i]]:
            spell(i + 1, text + ch)

    spell(0, '')
    return out
