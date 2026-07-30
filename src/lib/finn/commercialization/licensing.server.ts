import type { LicensingOption } from "./types";
import { LicensingOptionZ } from "./contracts";

export function defineLicensingOption(l: LicensingOption): LicensingOption {
  return LicensingOptionZ.parse(l);
}
