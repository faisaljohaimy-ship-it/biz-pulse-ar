import { lazy, Suspense } from "react";
import type { RegionId } from "@/lib/regions";
import { TwinExecutiveExperience } from "./TwinExecutiveExperience";
import { TwinLoadState } from "./TwinLoadState";

const TwinFilmPlayer = lazy(() =>
  import("@/components/twin/TwinFilmPlayer")
    .then((m) => ({ default: m.TwinFilmPlayer }))
    .catch(() => ({ default: FilmUnavailable })),
);

function FilmUnavailable() {
  return <TwinLoadState failed />;
}

/** Reference imagery is separate from operational asset-tree data. */
const scene = {
  src: "/media/refinery/refinery-scene-1280.webp",
  srcSet:
    "/media/refinery/refinery-scene-640.webp 640w, /media/refinery/refinery-scene-1280.webp 1280w",
  sizes: "(min-width: 1024px) calc(100vw - 280px), calc(100vw - 48px)",
  width: 1280,
  height: 720,
} as const;

export function TwinReferencePanel({ initialRegionId }: { initialRegionId: RegionId }) {
  return (
    <TwinExecutiveExperience
      initialRegionId={initialRegionId}
      poster={scene}
      renderBroadcast={() => (
        <Suspense fallback={<TwinLoadState />}>
          <TwinFilmPlayer film="reference" manual controlsMode="native" />
        </Suspense>
      )}
    />
  );
}
