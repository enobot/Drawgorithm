def notebook(commands):
    doc = ''
    history = []
    for command in commands:
        if command[0] == 'append':
            history.append(command[1])
            doc += command[1]
        elif len(history) > 0:
            last = history.pop()
            doc = doc[: len(doc) - len(last)]
    return doc
