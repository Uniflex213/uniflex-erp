import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from 0 (or previous value) to target.
 * @param target - The target number to animate to
 * @param duration - Animation duration in ms (default 1200)
 * @param realtime - If true, keeps incrementing with random variation after reaching target
 */
export function useAnimatedNumber(
  target: number,
  duration = 1200,
  realtime = false
): number {
  const [value, setValue] = useState(0);
  const startRef = useRef(0);
  const startTimeRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    startRef.current = value;
    startTimeRef.current = performance.now();
    const from = startRef.current;
    const diff = target - from;

    const easeOutExpo = (t: number) =>
      t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const current = from + diff * eased;
      setValue(Math.round(current));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else if (realtime) {
        // Realtime mode: keep ticking with small random increments
        const tick = () => {
          setValue(prev => prev + Math.floor(Math.random() * 3) + 1);
          rafRef.current = requestAnimationFrame(() => {
            setTimeout(tick, 50 + Math.random() * 100);
          });
        };
        setTimeout(tick, 50);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, realtime]);

  return value;
}
