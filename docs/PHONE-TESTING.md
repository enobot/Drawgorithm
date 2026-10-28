# Testing on a real phone

Automated checks so far use desktop Chromium with phone-sized windows. Real phones differ in ways an emulator doesn't show: Safari on iPhone, the on-screen keyboard, touch and pinch, and the system "Reduce Motion" setting. This page is the short path to checking them yourself.

## Open the app on your phone

1. Phone and computer on the same Wi-Fi.
2. On the computer, in the project folder:

   ```bash
   npm run dev -- --host
   ```

   Vite prints a **Network** address such as `http://192.168.1.23:5173/`. If Windows asks whether Node.js may use the network, allow **private networks** only.

3. Open that address on the phone. Demo links work too, e.g. `http://192.168.1.23:5173/?example=serve-line&view=visual`.
4. Stop the server (Ctrl+C) when you're done: `--host` makes it reachable by other devices on your network while it runs.

To test the production build instead: `npm run build`, then `npm run preview -- --host` (port 4173).

## What to check

Note the phone, browser and orientation for anything that looks wrong.

- **First open**: the Visual tab shows a drawing straight away; the Problem / Code / Visual tabs are easy to tap.
- **Rotate**: portrait to landscape and back. In landscape the step controls sit beside the drawing. Code, cursor and playback position survive the rotation.
- **Code tab with the keyboard open**: the editor stays visible above the keyboard, the page doesn't zoom in when you tap the editor or an input field, and nothing is hidden under the keyboard.
- **Drawing board**: one finger scrolls the board, two fingers pinch to zoom it (the page itself shouldn't zoom), and the zoom pill expands into − / % / + / Fit.
- **Illustrated scenes** (Serve the Line, Reverse a Linked List, Binary Search): people walk smoothly when the line moves, ropes swing, labels are readable without zooming.
- **Reduce Motion**: turn it on (iPhone: Settings › Accessibility › Motion › Reduce Motion; Android: Settings › Accessibility › Remove animations). Stepping should change the drawing at once, with no walking or swinging.
- **Practice**: the Practice list scrolls inside its window, an exercise opens, hints reveal one at a time, and Check all tests reports results.
