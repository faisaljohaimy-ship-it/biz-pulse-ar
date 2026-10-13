import { describe, expect, it } from "vitest";
import { attachmentAsText } from "./-chat-guard";

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));

describe("attachmentAsText", () => {
  it("decodes CSV into a framed table block", () => {
    const out = attachmentAsText(
      "a.csv",
      "text/csv",
      `data:text/csv;base64,${b64("الموقع,العدد\nجدة,5")}`,
    );
    expect(out).toContain('kind="table (CSV)"');
    expect(out).toContain("جدة,5");
  });
  it("leaves images as files", () => {
    expect(attachmentAsText("a.png", "image/png", "data:image/png;base64,AAAA")).toBeNull();
  });
});
