import React from "react";
import { Composition } from "remotion";
import { Aurora } from "./Aurora";
import { FPS, FRAMES, H, W } from "./field";

const dark: React.FC = () => <Aurora theme="dark" />;
const light: React.FC = () => <Aurora theme="light" />;

export const Root: React.FC = () => (
  <>
    <Composition
      id="aurora-dark"
      component={dark}
      durationInFrames={FRAMES}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="aurora-light"
      component={light}
      durationInFrames={FRAMES}
      fps={FPS}
      width={W}
      height={H}
    />
  </>
);
