import { Composition } from "remotion";
import { MainVideo, FPS, DURATION } from "./MainVideo";
import { Part2Video, PART2_DURATION } from "./Part2Video";
import { Part3Video, PART3_DURATION } from "./Part3Video";
import { Part4Video, PART4_DURATION } from "./Part4Video";
import { Part5Video, PART5_DURATION } from "./Part5Video";
import { Part6VideoAR, PART6_DURATION } from "./Part6VideoAR";
import { DocumentaryAR, DOC_DURATION, DOC_FPS } from "./DocumentaryAR";
import { DocumentaryEN, DOC_EN_DURATION, DOC_EN_FPS } from "./DocumentaryEN";
import { StepsAR, STEPS_AR_DURATION, STEPS_AR_FPS } from "./StepsAR";
import { StepsAR3D, STEPS_AR3D_DURATION, STEPS_AR3D_FPS } from "./StepsAR3D";
import { SimAR3D, SIM_AR3D_DURATION, SIM_AR3D_FPS } from "./SimAR3D";
import { NeexiosCinematic, NX_DURATION, NX_FPS } from "./NeexiosCinematic";

export const RemotionRoot = () => (
  <>
    <Composition id="main" component={MainVideo} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
    <Composition id="part2" component={Part2Video} durationInFrames={PART2_DURATION} fps={FPS} width={1920} height={1080} />
    <Composition id="part3" component={Part3Video} durationInFrames={PART3_DURATION} fps={FPS} width={1920} height={1080} />
    <Composition id="part4" component={Part4Video} durationInFrames={PART4_DURATION} fps={FPS} width={1920} height={1080} />
    <Composition id="part5" component={Part5Video} durationInFrames={PART5_DURATION} fps={FPS} width={1920} height={1080} />
    <Composition id="part6ar" component={Part6VideoAR} durationInFrames={PART6_DURATION} fps={FPS} width={1920} height={1080} />
    <Composition id="docar" component={DocumentaryAR} durationInFrames={DOC_DURATION} fps={DOC_FPS} width={1920} height={1080} />
    <Composition id="docen" component={DocumentaryEN} durationInFrames={DOC_EN_DURATION} fps={DOC_EN_FPS} width={1920} height={1080} />
    <Composition id="stepsar" component={StepsAR} durationInFrames={STEPS_AR_DURATION} fps={STEPS_AR_FPS} width={1920} height={1080} />
    <Composition id="stepsar3d" component={StepsAR3D} durationInFrames={STEPS_AR3D_DURATION} fps={STEPS_AR3D_FPS} width={1920} height={1080} />
    <Composition id="simar3d" component={SimAR3D} durationInFrames={SIM_AR3D_DURATION} fps={SIM_AR3D_FPS} width={1920} height={1080} />
    <Composition id="neexios" component={NeexiosCinematic} durationInFrames={NX_DURATION} fps={NX_FPS} width={1920} height={1080} />
  </>
);
