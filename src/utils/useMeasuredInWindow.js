import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Measure a view's rect using `measureInWindow()` with retry.
 *
 * - `active`가 true일 때만 측정/리트라이를 수행합니다.
 * - `active`가 false로 바뀌면 `rect`를 null로 초기화해서 stale hole을 방지합니다.
 *
 * Usage:
 * const { ref, rect, measure, ensureMeasure } = useMeasuredInWindow({ active });
 * <View ref={ref} collapsable={false} onLayout={measure} />
 */
export function useMeasuredInWindow({
  active,
  initialDelayMs = 0,
  retryCount = 10,
  retryDelayMs = 80,
  deps = [],
} = {}) {
  const ref = useRef(null);
  const [rect, setRect] = useState(null);

  const timerRef = useRef(null);
  const activeRef = useRef(!!active);

  useEffect(() => {
    activeRef.current = !!active;
  }, [active]);

  const clearTimer = useCallback(() => {
    try {
      if (timerRef.current) clearTimeout(timerRef.current);
    } catch (e) {}
    timerRef.current = null;
  }, []);

  const measure = useCallback(() => {
    try {
      const node = ref.current;
      if (!node || typeof node.measureInWindow !== 'function') return;
      node.measureInWindow((x, y, width, height) => {
        if (typeof x === 'number' && typeof y === 'number') {
          setRect({ x, y, width, height });
        }
      });
    } catch (e) {}
  }, []);

  const ensureMeasure = useCallback(() => {
    clearTimer();

    let tries = 0;
    const tick = () => {
      if (!activeRef.current) return;
      tries += 1;
      try {
        measure();
      } catch (e) {}
      if (tries >= retryCount) return;
      timerRef.current = setTimeout(tick, retryDelayMs);
    };

    timerRef.current = setTimeout(tick, initialDelayMs);
  }, [clearTimer, initialDelayMs, measure, retryCount, retryDelayMs]);

  useEffect(() => {
    if (!active) {
      setRect(null);
      clearTimer();
      return;
    }
    ensureMeasure();
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ensureMeasure, clearTimer, ...deps]);

  return {
    ref,
    rect,
    setRect,
    measure,
    ensureMeasure,
  };
}

