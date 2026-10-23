import React from "react";
import { Composition, registerRoot } from "remotion";
import { GuardSheet, GuardSheet2, GuardSheet3 } from "./GuardSheet";
import { TwinFilmV2 } from "./TwinFilmV2";
import { FPS, FRAMES, H, W } from "./timeline";

const Root: React.FC = () => (
  <>
    <Composition
      id="TwinFilmV2"
      component={TwinFilmV2}
      durationInFrames={FRAMES}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="GuardSheet"
      component={GuardSheet}
      durationInFrames={1}
      fps={30}
      width={1280}
      height={720}
    />
    <Composition
      id="GuardSheet2"
      component={GuardSheet2}
      durationInFrames={1}
      fps={30}
      width={1280}
      height={720}
    />
    <Composition
      id="GuardSheet3"
      component={GuardSheet3}
      durationInFrames={1}
      fps={30}
      width={1280}
      height={720}
    />
  </>
);
registerRoot(Root);
