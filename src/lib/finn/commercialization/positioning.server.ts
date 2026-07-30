import type { Positioning } from "./types";
import { PositioningZ } from "./contracts";

export function definePositioning(p: Positioning): Positioning {
  return PositioningZ.parse(p);
}
