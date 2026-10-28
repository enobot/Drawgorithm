def reverseWords(sentence):
    stack = []
    for word in sentence.split(' '):
        stack.append(word)
    out = []
    while len(stack) > 0:
        out.append(stack.pop())
    return ' '.join(out)
