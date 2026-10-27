import { useEffect, useState } from 'react';

/** Whether a CSS media query matches, updated as the window changes (resizing, rotating). */
export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

/** Phones in landscape: short and wide enough to put the drawing beside its controls. Matches the `short-wide` CSS variant. */
export const SHORT_WIDE = '(max-height: 519.98px) and (min-width: 600px)';
