/**
 * ARIA visual signature — the canonical «ARIA@nexios.com» wordmark and a
 * React-free SVG generator, shared across every touchpoint (chat backdrop via
 * the AriaSignatureBackdrop component, generated PDFs, and the loading screen)
 * so the brand identity stays unified. This module imports nothing from React
 * so it is safe to use in server code (PDF builders, edge functions).
 */

/** The one canonical ARIA wordmark. Never hardcode this string elsewhere. */
export const ARIA_SIGNATURE_WORDMARK = "ARIA@nexios.com";

/**
 * Static SVG markup of the ARIA signature for NON-DOM surfaces — embedded in
 * generated PDF backgrounds and the loading screen. Returns a self-contained
 * `<svg>` string (no external refs). `opacity` is the peak white opacity of the
 * wordmark tiles (keep ≤0.06 for AA-safe overlays).
 */
export function ariaSignatureSvgMarkup(opts?: {
  width?: number;
  height?: number;
  opacity?: number;
  /** Render the deep-navy gradient plate behind the wordmark. Default true. */
  plate?: boolean;
}): string {
  const w = opts?.width ?? 1240;
  const h = opts?.height ?? 1754; // A4 portrait @150dpi-ish
  const op = opts?.opacity ?? 0.05;
  const plate = opts?.plate ?? true;
  const word = ARIA_SIGNATURE_WORDMARK;
  const rows: string[] = [];
  const stepY = Math.round(h / 7);
  for (let i = 0, y = -20; y < h + stepY; y += stepY, i++) {
    const dx = i % 2 === 0 ? 0 : -180;
    rows.push(
      `<text x="${dx}" y="${y}" font-family="'Space Grotesk','DM Sans',sans-serif" font-weight="800" font-size="140" letter-spacing="4" fill="#ffffff" fill-opacity="${op}">${word}   ${word}   ${word}   ${word}</text>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  ${
    plate
      ? `<defs><radialGradient id="ariaPlate" cx="50%" cy="0%" r="120%"><stop offset="0%" stop-color="#0A1B33"/><stop offset="45%" stop-color="#06101F"/><stop offset="100%" stop-color="#04070F"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#ariaPlate)"/>`
      : ""
  }
  <g transform="rotate(-19 ${w / 2} ${h / 2})">
    ${rows.join("\n    ")}
  </g>
</svg>`;
}
