def survivors(asteroids):
    stack = []
    for rock in asteroids:
        alive = True
        while alive and rock < 0 and len(stack) > 0 and stack[-1] > 0:
            top = stack[-1]
            if top < -rock:
                stack.pop()
            elif top == -rock:
                stack.pop()
                alive = False
            else:
                alive = False
        if alive:
            stack.append(rock)
    return stack
