import { useCallback, useEffect, useRef } from "react";

export function useMouseTrack(
  onMove: (ev: MouseEvent) => void,
  onUp?: (ev: MouseEvent) => void,
): [() => void] {
  // ref to track the window event listeners
  interface MouseTrack {
    mover?: (ev: MouseEvent) => void;
    upper?: (ev: MouseEvent) => void;
  }
  const mouseTrack = useRef<MouseTrack>({});

  const stopTrack = useCallback(() => {
    if (!mouseTrack.current.mover || !mouseTrack.current.upper) return;
    window.removeEventListener("mouseup", mouseTrack.current.upper);
    window.removeEventListener("mousemove", mouseTrack.current.mover);
    mouseTrack.current.upper = void 0;
    mouseTrack.current.mover = void 0;
  }, []);

  useEffect(() => stopTrack, [stopTrack]);

  const startTrack = () => {
    if (mouseTrack.current.mover) return;
    mouseTrack.current.mover = onMove;
    mouseTrack.current.upper = (ev) => (stopTrack(), onUp && onUp(ev));
    window.addEventListener("mousemove", mouseTrack.current.mover);
    window.addEventListener("mouseup", mouseTrack.current.upper);
  };

  return [startTrack];
}
