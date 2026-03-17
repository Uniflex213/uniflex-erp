import { useState, useEffect, CSSProperties } from 'react';

/**
 * Returns a function that generates stagger-reveal styles per index.
 * Elements fade in + slide up with increasing delay.
 * @param itemCount - Number of items to animate
 * @param delayPerItem - Delay between each item in ms (default 60)
 * @param translateY - Starting Y offset in px (default 20)
 */
export function useStaggerReveal(
  itemCount: number,
  delayPerItem = 60,
  translateY = 20
): (index: number) => CSSProperties {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (index: number): CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : `translateY(${translateY}px)`,
    transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${index * delayPerItem}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${index * delayPerItem}ms`,
  });
}
