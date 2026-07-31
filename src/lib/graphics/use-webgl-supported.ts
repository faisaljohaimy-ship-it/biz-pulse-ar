/**
 * WebGL support as a hook — for components that already run hooks.
 *
 * WHY A HOOK AND NOT A BARE CALL
 * `canUseWebGL()` answers false during SSR (there is no document to probe) and
 * possibly true on the client. A component that early-returns on that value
 * therefore runs zero hooks on the server and N on the client, which React
 * rejects at hydration as a hook-order change. Routing the answer through a
 * hook keeps the count identical on both passes: the component always runs
 * every hook, and only the RENDERED OUTPUT changes.
 *
 * The first client paint deliberately reports `false`, so server and client
 * agree on the initial markup; the effect then flips it and the 3D layer fades
 * in one frame later. That one frame is the price of hydration-safety, and it
 * is invisible next to the time three.js takes to initialise anyway.
 */
import { useEffect, useState } from "react";
import { canUseWebGL } from "./webgl-capability";

export function useWebGLSupported(): boolean {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(canUseWebGL());
  }, []);

  return supported;
}
