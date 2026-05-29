import { Composition } from "remotion";
import { MainVideo, FPS, DURATION } from "./MainVideo";
import { Part2Video, PART2_DURATION } from "./Part2Video";
import { Part3Video, PART3_DURATION } from "./Part3Video";

export const RemotionRoot = () => (
  <>
    <Composition id="main" component={MainVideo} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
    <Composition id="part2" component={Part2Video} durationInFrames={PART2_DURATION} fps={FPS} width={1920} height={1080} />
    <Composition id="part3" component={Part3Video} durationInFrames={PART3_DURATION} fps={FPS} width={1920} height={1080} />
  </>
);
