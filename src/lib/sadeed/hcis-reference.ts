export type HcisReferenceRow = {
  title_ar: string;
  content_ar: string;
  source: string;
};

function promptData(value: unknown, maxLength: number): string {
  return String(value)
    .replace(/[<>\0]/g, (character) => (character === "<" ? "‹" : character === ">" ? "›" : " "))
    .slice(0, maxLength);
}

export function isHcisReferenceQuery(text: string): boolean {
  return /\bhcis\b|الهيئ[ةه]\s+العليا\s+للأمن\s+الصناعي|\b(?:SEC|SAF)-?\d+\b|امتثال\s+(?:الهيئ|hcis)/i.test(
    text,
  );
}

export function formatHcisReference(rows: HcisReferenceRow[]): string {
  return rows
    .map((row) => {
      const title = promptData(row.title_ar, 160)
        .replace(/[[\]\r\n]/g, " ")
        .trim();
      const content = promptData(row.content_ar, 2_200);
      const source = promptData(row.source, 180).replace(/[\r\n]/g, " ");
      return `[KB:${title}] ${content} (المصدر: ${source})`;
    })
    .join("\n\n")
    .slice(0, 16_000);
}
