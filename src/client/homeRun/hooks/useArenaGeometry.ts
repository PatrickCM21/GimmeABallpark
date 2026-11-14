import { useCallback, useEffect, useState, type PointerEvent, type RefObject } from 'react';

export type Point = { x: number; y: number };

/**
 * Tracks the pointer (mouse or touch) relative to an element's top-left corner.
 * Returns the latest point (or null before the first move) and handlers to attach to the element.
 */
export const usePointerPosition = (ref: RefObject<HTMLElement | null>) => {
  const [point, setPoint] = useState<Point | null>(null);

  const update = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      setPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [ref]
  );

  return { point, handlers: { onPointerMove: update, onPointerDown: update } };
};

export type Size = { width: number; height: number };

/** Observes an element's size. */
export const useElementSize = (ref: RefObject<HTMLElement | null>): Size => {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
};

/** Where the ball launches from (near the bat), in arena coordinates. */
export const getLaunchPoint = (arenaHeight: number): Point => ({ x: 84, y: arenaHeight - 70 });
