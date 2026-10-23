import React from "react";
import { Composition, registerRoot } from "remotion";
import { TwinFilmV3 } from "./TwinFilmV3";
import { FPS, FRAMES, H, W } from "./timeline";

const Root: React.FC = () => (
  <Composition
    id="TwinFilmV3"
    component={TwinFilmV3}
    durationInFrames={FRAMES}
    fps={FPS}
    width={W}
    height={H}
  />
);
registerRoot(Root);
