import { useEffect, useRef, useState } from 'react';

/**
 * Counts down to `deadlineAt` (epoch ms) while `active`. Calls `onExpire` once when it hits zero.
 * Returns the milliseconds remaining (or `fallbackMs` when there is no deadline).
 */
export const useCountdown = (
  deadlineAt: number | null,
  active: boolean,
  onExpire: () => void,
  fallbackMs: number
): number => {
  const [msLeft, setMsLeft] = useState(fallbackMs);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (deadlineAt === null || !active) return;

    let frame = 0;
    let expired = false;
    const tick = () => {
      const remaining = Math.max(0, deadlineAt - Date.now());
      setMsLeft(remaining);
      if (remaining <= 0) {
        if (!expired) {
          expired = true;
          onExpireRef.current();
        }
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [deadlineAt, active]);

  return msLeft;
};
