import { describe, expect, it } from "vitest";
import { resolveSelfCallOrigin } from "./self-call-origin.server";

const REQ = "https://evil.example/api/x?y=1";

describe("resolveSelfCallOrigin", () => {
  it("الأصل المضبوط يسبق أصل الطلب: PUBLIC_SITE_URL ثم SITE_URL", () => {
    expect(
      resolveSelfCallOrigin(REQ, {
        PUBLIC_SITE_URL: "https://neexios.com/",
        SITE_URL: "https://b",
      }),
    ).toBe("https://neexios.com");
    expect(resolveSelfCallOrigin(REQ, { SITE_URL: "https://sadeed.example/app/path" })).toBe(
      "https://sadeed.example",
    );
  });

  it("بلا ضبطٍ يبقى أصل الطلب — السلوك القديم لا يتغيّر", () => {
    expect(resolveSelfCallOrigin(REQ, {})).toBe("https://evil.example");
    expect(resolveSelfCallOrigin("http://127.0.0.1:8080/x", {})).toBe("http://127.0.0.1:8080");
  });

  it("قيمةٌ مضبوطة غير صالحة (ليست عنوانًا مطلقًا أو بمخطّط غريب) تُتجاهل", () => {
    expect(resolveSelfCallOrigin(REQ, { PUBLIC_SITE_URL: "neexios.com" })).toBe(
      "https://evil.example",
    );
    expect(resolveSelfCallOrigin(REQ, { PUBLIC_SITE_URL: "javascript:alert(1)" })).toBe(
      "https://evil.example",
    );
    expect(
      resolveSelfCallOrigin(REQ, { PUBLIC_SITE_URL: "  ", SITE_URL: "https://ok.example" }),
    ).toBe("https://ok.example");
  });
});
