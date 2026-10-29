// Keeps keyboard and screen-reader focus inside a dialog drawn over the app. The dialog must be
// rendered outside #root (createPortal to document.body): everything inside #root becomes
// `inert` while it is open (https://developer.mozilla.org/docs/Web/HTML/Global_attributes/inert),
// so Tab can't reach controls hidden behind the dialog's backdrop.

/**
 * Call when a dialog opens, before moving focus into it. Returns the function to call when it
 * closes: it makes the app usable again and puts focus back where it was (the opening button).
 */
export function holdFocusInDialog(): () => void {
  const opener = document.activeElement as HTMLElement | null;
  const app = document.getElementById('root');
  app?.setAttribute('inert', '');
  return () => {
    // The app must stop being inert before focus can return to it.
    app?.removeAttribute('inert');
    opener?.focus?.();
  };
}
