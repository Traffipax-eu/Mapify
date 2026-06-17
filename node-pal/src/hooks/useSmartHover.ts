import { useCallback, useRef, useState } from "react";

const DEFAULT_DELAY_MS = 500;

export function useSmartHover(delayMs = DEFAULT_DELAY_MS) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onMouseEnter = useCallback(
    (event: React.MouseEvent) => {
      clearTimer();
      setPosition({ x: event.clientX, y: event.clientY });
      timerRef.current = setTimeout(() => {
        setVisible(true);
      }, delayMs);
    },
    [clearTimer, delayMs],
  );

  const onMouseMove = useCallback((event: React.MouseEvent) => {
    setPosition({ x: event.clientX, y: event.clientY });
  }, []);

  const onMouseLeave = useCallback(() => {
    clearTimer();
    setVisible(false);
  }, [clearTimer]);

  return {
    visible,
    position,
    hoverHandlers: {
      onMouseEnter,
      onMouseMove,
      onMouseLeave,
    },
  };
}
