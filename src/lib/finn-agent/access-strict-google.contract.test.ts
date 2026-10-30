// @vitest-environment node
/**
 * الواجهة تتّفق مع البوّابة في تشديد «Google وحده» (أمر المالك ٢٠٢٦/١٠/٣٠).
 *
 * `getFinnAccess` تقرّر ظهور الصفحة، و`resolveFinnOwner` تقرّر الأمان. لو اختلفا لفُتحت محادثةٌ للمالك بكلمة
 * مرور ثم ردّت 404 على كل رسالة. فالقاعدة نفسها في الموضعين: بعد حكم المالك، إن شُدِّد فالجلسة OAuth أو لا دخول.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ACCESS = readFileSync("src/lib/finn-agent/access.functions.ts", "utf8");
const GATE = readFileSync("src/lib/finn-agent/owner-gate.server.ts", "utf8");

const strip = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

function gaps(source: string, surface: "access" | "gate"): string[] {
  const code = strip(source);
  const out: string[] = [];
  if (!/finnRequiresGoogle\(\s*(process\.)?env\[FINN_REQUIRE_GOOGLE_ENV\]\s*\)/.test(code))
    out.push("لا قراءة لمتغيّر التشديد");
  if (!/sessionIsOAuth\(token\)/.test(code)) out.push("لا فحص لطريقة الدخول");
  const ownerAt = code.search(
    surface === "access" ? /isFinnOwnerUser\(/ : /isFinnOwner\(verified\.userId/,
  );
  const strictAt = code.search(/finnRequiresGoogle\(/);
  if (ownerAt < 0 || strictAt < ownerAt) out.push("التشديد قبل حكم المالك (يوسّع بدل أن يضيّق)");
  return out;
}

describe("تشديد Google وحده: الواجهة والبوّابة بالقاعدة نفسها", () => {
  it("الموضعان يطبّقانها بعد حكم المالك", () => {
    expect(gaps(ACCESS, "access")).toEqual([]);
    expect(gaps(GATE, "gate")).toEqual([]);
  });

  it("وتحمرّ على المزروع (المادة ٣٠)", () => {
    expect(gaps(ACCESS.replace("sessionIsOAuth(token)", "true"), "access")).toEqual([
      "لا فحص لطريقة الدخول",
    ]);
    expect(
      gaps(
        ACCESS.replace("finnRequiresGoogle(process.env[FINN_REQUIRE_GOOGLE_ENV])", "false"),
        "access",
      ),
    ).toContain("لا قراءة لمتغيّر التشديد");
    expect(gaps(GATE.replace("!sessionIsOAuth(token)", "false"), "gate")).toEqual([
      "لا فحص لطريقة الدخول",
    ]);
    // فحصٌ معلَّق لا يُحتسب.
    expect(
      gaps(GATE.replace("!sessionIsOAuth(token)", "false /* !sessionIsOAuth(token) */"), "gate"),
    ).toEqual(["لا فحص لطريقة الدخول"]);
  });
});
