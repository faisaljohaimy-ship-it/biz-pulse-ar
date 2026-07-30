/**
 * Document (PDF page) vision — accepts pre-extracted per-page text + regions.
 * Produces one finding per page. No synthesis.
 */
import type { MultimodalFinding, MultimodalInput } from "./types";
import { analyzeImage } from "./image-analysis.server";
import type { LayoutRegion } from "./layout-analysis.server";

export interface PdfPageInput {
  readonly page: number;
  readonly text_hint?: string;
  readonly regions?: readonly LayoutRegion[];
}

export function analyzeDocument(
  input: MultimodalInput,
  pages: readonly PdfPageInput[],
): readonly MultimodalFinding[] {
  if (pages.length === 0) return [];
  return pages.map((p) =>
    analyzeImage(
      {
        ...input,
        source_id: `${input.source_id}#p${p.page}`,
        declared_modality: "pdf_page",
        text_hint: p.text_hint,
        evidence: {
          ...input.evidence,
          locator: `page:${p.page}`,
        },
      },
      { regions: p.regions },
    ),
  );
}
