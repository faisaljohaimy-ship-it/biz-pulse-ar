import { useEffect } from "react";

/** CinematicBoot — audio boot sequence removed. Immediately completes so
 *  downstream UI hydrates without any sound producer running. */
export function CinematicBoot({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    onComplete();
  }, [onComplete]);
  return null;
}

export default CinematicBoot;
