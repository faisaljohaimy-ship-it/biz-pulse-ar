import { Composition } from "remotion";
import { MainVideo, FPS, DURATION } from "./MainVideo";

export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={DURATION}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
