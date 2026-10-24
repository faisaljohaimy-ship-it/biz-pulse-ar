import React from "react";
import { Composition } from "remotion";
import { FPS, FRAMES, SIZE } from "./kit";
import {
  StateDanger,
  StateWarning,
  StateOk,
  StateInfo,
  TrendUp,
  TrendDown,
  TrendFlat,
} from "./glyphs";

const common = { durationInFrames: FRAMES, fps: FPS, width: SIZE, height: SIZE } as const;

export const Root: React.FC = () => (
  <>
    <Composition id="state-danger" component={StateDanger} {...common} />
    <Composition id="state-warning" component={StateWarning} {...common} />
    <Composition id="state-ok" component={StateOk} {...common} />
    <Composition id="state-info" component={StateInfo} {...common} />
    <Composition id="trend-up" component={TrendUp} {...common} />
    <Composition id="trend-down" component={TrendDown} {...common} />
    <Composition id="trend-flat" component={TrendFlat} {...common} />
  </>
);
