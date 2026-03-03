import { useEffect, useRef } from "react";

export function useUnmount(unmount: () => void) {
  const pending = useRef<boolean>(false);
  // eslint-disable-next-line react-hooks/refs
  pending.current = true;
  useEffect(() => {
    pending.current = false;
    return () => {
      if (!pending.current) unmount();
    };
  });
}
