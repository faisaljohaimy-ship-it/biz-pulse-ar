/**
 * R3F Avatar Provider — registers the Three.js / React Three Fiber renderer
 * with the global avatar provider registry under the `readyplayerme` id
 * (the architecture is Ready Player Me-compatible: today it uses a procedural
 * bust, tomorrow swap to a RPM GLB by setting VITE_ARIA_AVATAR_URL).
 *
 * Importing this module has the side effect of registering the provider.
 */
import { lazy, Suspense } from "react";
import {
  registerAvatarProvider,
  type AvatarRenderProps,
} from "@/lib/digital-humans/avatar-provider";

const AriaScene = lazy(() => import("./AriaScene").then((m) => ({ default: m.AriaScene })));

function R3FRender(props: AvatarRenderProps) {
  const size = props.size ?? 96;
  return (
    <Suspense
      fallback={
        <div
          style={{ width: size, height: size }}
          className="rounded-full bg-[#04111f] border border-cyan-400/20 animate-pulse shrink-0"
        />
      }
    >
      <AriaScene
        spec={props.spec}
        state={props.state}
        mouthAmplitude={props.mouthAmplitude ?? 0}
        size={size}
      />
    </Suspense>
  );
}

registerAvatarProvider({
  id: "readyplayerme",
  label: "Executive 3D (R3F)",
  capabilities: {
    realtimeLipSync: true,
    photorealistic: false,
    streamingVideo: false,
    requiresNetwork: false,
  },
  Render: R3FRender,
});
