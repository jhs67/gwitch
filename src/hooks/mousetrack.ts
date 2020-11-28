import { useRef } from "react";
import { useUnmount } from "./unmount";

export function useMouseTrack(onMove: (ev: MouseEvent) => void): [() => void] {
  // ref to track the window event listeners
  interface MouseTrack {
    mover?: (ev: MouseEvent) => void;
    upper?: (ev: MouseEvent) => void;
  }
  const mouseTrack = useRef<MouseTrack>({});

  useUnmount(() => stopTrack());

  const startTrack = () => {
    if (mouseTrack.current.mover) return;
    mouseTrack.current.mover = onMove;
    mouseTrack.current.upper = () => stopTrack();
    window.addEventListener("mousemove", mouseTrack.current.mover);
    window.addEventListener("mouseup", mouseTrack.current.upper);
  };

  const stopTrack = () => {
    if (!mouseTrack.current.mover) return;
    window.removeEventListener("mouseup", mouseTrack.current.upper);
    window.removeEventListener("mousemove", mouseTrack.current.mover);
    mouseTrack.current.upper = null;
    mouseTrack.current.mover = null;
  };

  return [startTrack];
}
