from collections import deque


def finishOrder(pages):
    queue = deque()
    for i in range(len(pages)):
        queue.append([i, pages[i]])
    done = []
    while len(queue) > 0:
        job, left = queue.popleft()
        if left == 1:
            done.append(job)
        else:
            queue.append([job, left - 1])
    return done
