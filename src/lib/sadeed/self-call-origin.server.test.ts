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

  it.each(["neexios.com", "javascript:alert(1)", "ftp://not-http.example"])(
    "fails closed for invalid PUBLIC_SITE_URL %s rather than sending a cron secret to the request Host",
    (raw) => {
      expect(() => resolveSelfCallOrigin(REQ, { PUBLIC_SITE_URL: raw })).toThrow(
        "Invalid configured self-call origin.",
      );
    },
  );

  it("also fails closed when only SITE_URL is malformed", () => {
    expect(() => resolveSelfCallOrigin(REQ, { SITE_URL: "/relative" })).toThrow(
      "Invalid configured self-call origin.",
    );
  });

  it("tries a valid SITE_URL after an invalid PUBLIC_SITE_URL", () => {
    expect(
      resolveSelfCallOrigin(REQ, {
        PUBLIC_SITE_URL: "javascript:alert(1)",
        SITE_URL: "https://safe.example/application",
      }),
    ).toBe("https://safe.example");
  });

  it("treats an empty configured value as absent while retaining a valid fallback", () => {
    expect(
      resolveSelfCallOrigin(REQ, { PUBLIC_SITE_URL: "  ", SITE_URL: "https://ok.example" }),
    ).toBe("https://ok.example");
    expect(resolveSelfCallOrigin(REQ, { PUBLIC_SITE_URL: " " })).toBe("https://evil.example");
  });
});
