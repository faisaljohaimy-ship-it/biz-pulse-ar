// RTL/LTR helpers.
import type { Lang, Direction } from "./types";
import { directionOf } from "./language.server";

export function htmlAttrs(lang: Lang): { lang: Lang; dir: Direction } {
  return { lang, dir: directionOf(lang) };
}

export function textAlignFor(lang: Lang): "right" | "left" {
  return directionOf(lang) === "rtl" ? "right" : "left";
}

export function isRtl(lang: Lang): boolean {
  return directionOf(lang) === "rtl";
}
