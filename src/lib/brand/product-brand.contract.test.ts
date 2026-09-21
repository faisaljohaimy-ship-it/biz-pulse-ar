/**
 * هوية المنتج — حارس العلامة.
 *
 * OWNER DIRECTIVE 2026-08-01 (second): the product is «سَدِيد» / «SADEED».
 * Every predecessor — منصة إنجاز الأعمال · NEXIOS · NEEXIOS · Nexus AI OS ·
 * نكسيوس · مِرْقَب — must not appear anywhere a user can read them.
 *
 * ── THREE PASSES, BECAUSE ONE IS NOT ENOUGH ──
 * ① string literals  ② JSX text and markup  ③ a blunt whole-file backstop.
 * Pass ③ exists because ① and ② tokenise with regexes, and a regex cannot
 * reliably tokenise JavaScript — it demonstrably missed `NEXIOS%20Reports`
 * inside a template literal in two files. See the backstop test for detail.
 *
 * ── WHY IT DOES NOT SIMPLY BAN THE TOKEN EVERYWHERE ──
 * The repo legitimately contains hundreds of `nexus-*` CSS class names, React
 * component identifiers (`NexusOrb`), and design-token names. Those are machine
 * identifiers: no user ever sees them, renaming them is pure churn across ~500
 * call sites, and each rename is a chance to break a stylesheet. A guard that
 * banned them would be unkeepable, and an unkeepable guard gets disabled rather
 * than obeyed.
 *
 * So the rule is precise: the banned tokens may not appear inside a STRING
 * LITERAL in application source, nor anywhere in the metadata files the browser
 * reads directly. Comments are stripped first — a comment explaining which name
 * was retired is documentation, not a leak.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRODUCT_BRAND,
  PRODUCT_NAME,
  PRODUCT_NAME_AR,
  PRODUCT_NAME_EN,
  SITE_NAME,
  COMPANY_NAME,
  brandFor,
  brandName,
} from "../domain";

const ROOT = resolve(__dirname, "../../..");

/** Every retired spelling the owner listed, plus the interim Arabic name. */
const RETIRED = [
  /NEXIOS/i,
  /NEEXIOS/i,
  /\bNexus\b/i,
  /نكسيوس/,
  /نيكسيوس/,
  // The immediately previous brand. Banned for the same reason as the others:
  // a restored old file or a copied paragraph puts it straight back on screen.
  /منصة إنجاز الأعمال/,
  /منصة انجاز الأعمال/,
  /نكسس/,
  /نيكسوس/,
  /نكسوس/,
  /مِرْقَب/,
  /\bمرقب\b/,
  /\bMIRQAB\b/i,
  // ARIA as a product/assistant name. The HTML `aria-*` attributes and the
  // `aria` npm-style identifiers are a different thing entirely, which is why
  // this needs the word boundary and the case.
  /(?<![A-Za-z_-])ARIA(?![A-Za-z_-])/,
  /آريا/,
] as const;

/**
 * Category D — external contracts that legitimately keep the old token.
 * Each entry states WHY, because an unexplained allowlist entry is how a guard
 * quietly stops guarding.
 */
const ALLOWED_TECHNICAL = new Set([
  // The production domain. Live DNS + the Supabase OAuth issuer + every
  // canonical URL already published. Renaming it is a migration, not a rename,
  // and the domain is never displayed as the product name.
  "src/lib/domain.ts",
  // This guard names the retired strings in order to ban them.
  "src/lib/brand/product-brand.contract.test.ts",
  // The SADEED identity guard, same reason.
  "src/lib/brand/sadeed-identity.contract.test.ts",
  // Speech normalisation must still recognise the old spoken forms in stored
  // text so SADEED pronounces legacy records correctly.
  "src/lib/sadeed/sadeed-speech-normalize.ts",
  "src/lib/sadeed/sadeed-speech-normalize.test.ts",
  "src/lib/sadeed/output/finalize.ts",
  // Same reason: the pronunciation map converts a legacy spelling that still
  // exists in stored rows into correct Arabic speech. Deleting the entry would
  // make SADEED spell the old name letter by letter instead of hiding it.
  "src/lib/sadeed/pronunciation.ts",
  "src/lib/sadeed/pronunciation.test.ts",
  // A regression test whose whole job is to assert the retired greeting is
  // rejected. It must be able to write the string it bans.
  "src/lib/brand/sadeed-greeting-regression.test.ts",
  // Category D — the HMAC domain separator `nexios:aria:outbound:v1` is a
  // SIGNING INPUT. Renaming it invalidates every approval token already issued
  // and still in flight, silently breaking outbound approvals in production.
  "src/lib/sadeed/outbound-messaging.server.ts",
  "src/lib/sadeed/outbound-messaging.crypto.test.ts",
  // Category D — `nexios://workspace/<id>` is a persisted deep-link scheme and
  // `nexios.shell` is the localStorage prefix under which every saved workspace
  // already lives. Renaming either orphans existing user state.
  "src/sadeed/runtime/executive/workspace.ts",
  "src/sadeed/runtime/executive/persistence.ts",
  "src/sadeed/runtime/executive/executive.test.ts",
  // ── الاستثناء المُلغى ٢٠٢٦/٠٨/٠٦ ──
  // كانت أربعة ملفات معفاة هنا لأجل مجلّد SharePoint «NEXIOS Reports»: تقرأ
  // الإعفاء أنه «مسار تخزين لا اسم عرض»، وكان نصفه صحيحًا — والنصف الآخر أن
  // الاسم كان **يُطبع على الشاشة** في نموذج النشر. أُخرجت الأربعة من الإعفاء
  // بعد أن صار المجلّد قيمة واحدة في `src/lib/sharepoint-report-folder.ts`،
  // فالحارس صار يحميها بدل أن يستثنيها. ما نُشر سابقًا لم يُنقل ولم يُحذف،
  // وروابطه المطلقة المحفوظة تعمل كما هي.
  // Matches text inside an existing constitution document by its literal
  // heading. The matcher must keep the document's actual wording.
  "src/lib/sadeed/self-evolution/engine.server.ts",
  // Asserts the Supabase project ref against the historical Lovable host.
  "src/lib/mcp/project-ref.test.ts",
]);

const CODE_EXT = /\.(ts|tsx)$/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (CODE_EXT.test(entry)) out.push(full);
  }
  return out;
}

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

/**
 * Pull out string and template literals.
 *
 * NOTE its limit, proven in practice: quote pairing drifts over a whole file,
 * so this pass DOES miss literals. It is the cheap first sweep, not the
 * guarantee — the backstop test is the guarantee.
 */
function stringLiterals(src: string): string[] {
  const out: string[] = [];
  const re = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[1] ?? m[2] ?? m[3] ?? "");
  return out;
}

/**
 * Machine-facing forms of the token, in the four shapes this repo actually
 * uses. Each is a namespace separator, never prose:
 *   `nexus-card`         CSS class / design token
 *   `nexios.region`      storage key
 *   `nexios:demo-status` DOM event name
 *   `nexios://workspace` internal URI scheme
 *
 * **ولا يشمل اسمَ ملفٍّ يُنزَّل.** كان النمط يبتلع `nexios-executive-…`
 * في `live-dashboard.tsx` فيمرّ اسمُ تصديرٍ **يراه المالك في تنزيلاته
 * ويحيله** كأنه مفتاحُ آلة. والفئاتُ المعلنة أعلاه — مفتاحُ تخزين ·
 * حدثُ DOM · مخطّطُ URI — لا واحدةَ منها اسمُ ملفّ. فاستُثنيت صراحةً.
 */
const MACHINE_TOKEN = /(?:nexus|nexios)(?:[-.:]{1,3}\/?\/?[a-z0-9_-]+)+/gi;
/** أسماءُ الملفّات المصدَّرة نصُّ عرضٍ لا معرّف — لا يُعفيها `MACHINE_TOKEN`. */
const EXPORT_FILENAME =
  /(?:nexus|nexios)-[a-z0-9-]*\$\{|(?:nexus|nexios)-[a-z0-9-]*\.(?:xlsx|pdf|csv|docx|pptx)/gi;
/** The production domain and any URL on it. Category D — a live contract. */
const DOMAIN_TOKEN =
  /(?:https?:\/\/|[a-z0-9._%+-]+@)?[a-z0-9-]*\.?n[e]?exios\.(?:com|lovable\.cloud)[^\s"'<]*/gi;
/** Repo-relative source paths quoted inside tests. */
const SOURCE_PATH = /[\w/.-]+\.(?:ts|tsx|mjs|json|md|sql)\b/g;
/** React component identifiers, including inside JSX-in-a-string test names. */
const COMPONENT_ID = /<?\b(?:Nexus|Nexios)[A-Z][A-Za-z]*\b\s*\/?>?/g;

const isIdentifierish = (lit: string) => {
  // **قبل أيّ إعفاء — بلا استثناء.** كُتبت هذه الجملة وتحتها إعفاءُ
  // «مُحدِّد الوحدة» سابقٌ لها، فأفلت `"./nexios-export.csv"` و
  // `"~/nexios-report.pdf"`. جملةٌ أوسع من فعلها، وهي العلّة نفسها
  // التي نُقضت مرارًا — فصار الفحص أوّلَ سطرٍ فعلًا.
  EXPORT_FILENAME.lastIndex = 0;
  if (!lit.startsWith("/") && EXPORT_FILENAME.test(lit)) return false;
  if (/^[@./~]/.test(lit)) return true; // module specifier
  const residue = lit
    .replace(DOMAIN_TOKEN, " ")
    .replace(SOURCE_PATH, " ")
    .replace(COMPONENT_ID, " ")
    .replace(MACHINE_TOKEN, " ");
  return !RETIRED.some((re) => re.test(residue));
};

describe("the brand is what the owner set", () => {
  // Written as literals. Deriving the expectation from the module under test
  // would pass whatever the module said (article ٣٠).
  it("is «سَدِيد» in Arabic and «SADEED» in Latin", () => {
    expect(PRODUCT_BRAND.ar.name).toBe("سَدِيد");
    expect(PRODUCT_BRAND.en.name).toBe("SADEED");
  });

  it("carries the descriptor and tagline in both languages", () => {
    expect(PRODUCT_BRAND.ar.descriptor).toBe("منظومة القرار والإنجاز الذكي");
    expect(PRODUCT_BRAND.en.descriptor).toBe("Intelligent Decision & Execution System");
    expect(PRODUCT_BRAND.ar.tagline).toBe("قرار أدق. إنجاز أسرع.");
    expect(PRODUCT_BRAND.en.tagline).toBe("Smarter Decisions. Faster Execution.");
  });

  it("the Latin form is upper-case — it is a wordmark, not a word", () => {
    expect(PRODUCT_BRAND.en.name).toBe(PRODUCT_BRAND.en.name.toUpperCase());
  });

  it("the plain Arabic form drops the diacritics and nothing else", () => {
    // PDF shaping, TTS input and search indexes all mangle combining marks.
    // The plain form must still be the SAME word — strip the marks from the
    // display name and the two have to meet.
    expect(PRODUCT_BRAND.arPlain).toBe("سديد");
    expect(PRODUCT_BRAND.ar.name.replace(/[ً-ْ]/g, "")).toBe(PRODUCT_BRAND.arPlain);
  });

  it("brandFor / brandName pick the right language", () => {
    expect(brandName(true)).toBe("سَدِيد");
    expect(brandName(false)).toBe("SADEED");
    expect(brandFor(true).tagline).toBe(PRODUCT_BRAND.ar.tagline);
    expect(brandFor(false).tagline).toBe(PRODUCT_BRAND.en.tagline);
  });

  it("names the assistant with the brand — one name, by owner directive", () => {
    // OWNER DIRECTIVE 2026-08-09 («توحيد اسم Sadeed إلى سَدِيد») REVERSES the
    // earlier rule this test used to encode. SADEED was a separate identity that
    // survived three product renames; the owner has now merged it, so the
    // assistant is displayed as the product brand and nothing else.
    //
    // Written as a literal, not derived from PRODUCT_BRAND.ar.name: deriving it
    // would pass whatever the module said (article ٣٠).
    expect(PRODUCT_BRAND.assistantName).toBe("سَدِيد");
    // The merge is DISPLAY-ONLY. `sadeed-core`, `/sadeed`, `/api/sadeed/*`,
    // `finn_knowledge`, `SadeedCopilot` and `public/sadeed-portrait.*` keep their
    // identifiers — renaming them orphans live user state and breaks routing.
    // That boundary is the rule in CLAUDE.md: ban display text, not identifiers.
  });

  it("every compatibility alias resolves to the new brand", () => {
    expect(PRODUCT_NAME).toBe(PRODUCT_BRAND.ar.name);
    expect(PRODUCT_NAME_AR).toBe(PRODUCT_BRAND.ar.name);
    expect(PRODUCT_NAME_EN).toBe(PRODUCT_BRAND.en.name);
    expect(SITE_NAME).toContain(PRODUCT_BRAND.ar.name);
    expect(COMPANY_NAME).toBe(PRODUCT_BRAND.ar.descriptor);
  });

  it("the internal slug is ASCII and is never a display name", () => {
    expect(PRODUCT_BRAND.slug).toMatch(/^[a-z0-9-]+$/);
    expect(PRODUCT_BRAND.slug).not.toBe(PRODUCT_BRAND.ar.name);
    expect(PRODUCT_BRAND.slug).not.toBe(PRODUCT_BRAND.en.name);
  });
});

describe("no retired brand in any user-visible string", () => {
  const files = walk(join(ROOT, "src"));

  it("scans a non-trivial number of files — an empty sweep proves nothing", () => {
    // Article ٣٠: a green check over an empty set is not evidence.
    expect(files.length).toBeGreaterThan(300);
  });

  it("finds no retired spelling in application string literals", () => {
    const leaks: string[] = [];
    for (const file of files) {
      const rel = file.slice(ROOT.length + 1);
      if (ALLOWED_TECHNICAL.has(rel)) continue;
      const lits = stringLiterals(stripComments(readFileSync(file, "utf8")));
      for (const lit of lits) {
        if (isIdentifierish(lit)) continue;
        for (const re of RETIRED) {
          if (re.test(lit)) {
            leaks.push(`${rel} → ${JSON.stringify(lit.slice(0, 70))}`);
            break;
          }
        }
      }
    }
    expect(leaks, `retired brand still reachable by a user:\n${leaks.join("\n")}`).toEqual([]);
  });

  /**
   * JSX TEXT IS NOT A STRING LITERAL.
   *
   * The literal scan above missed `<p>لوحة القيادة العليا لنظام نكسيوس …</p>`
   * in the cockpit header, because JSX children are markup, not quoted
   * strings — and that is precisely the kind of place a brand name lives.
   * This pass removes the literals (already covered), the identifiers and the
   * imports, and asks what prose is left.
   */
  it("finds no retired spelling in JSX text either", () => {
    const leaks: string[] = [];
    for (const file of files) {
      const rel = file.slice(ROOT.length + 1);
      if (ALLOWED_TECHNICAL.has(rel)) continue;
      const residue = stripComments(readFileSync(file, "utf8"))
        .replace(/^\s*import[\s\S]*?from\s+["'][^"']+["'];?$/gm, " ")
        .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g, " ")
        .replace(DOMAIN_TOKEN, " ")
        .replace(COMPONENT_ID, " ")
        .replace(MACHINE_TOKEN, " ");
      for (const re of RETIRED) {
        const hit = re.exec(residue);
        if (hit) {
          const at = residue.slice(Math.max(0, hit.index - 40), hit.index + 40);
          leaks.push(`${rel} → …${at.replace(/\s+/g, " ").trim()}…`);
          break;
        }
      }
    }
    expect(leaks, `retired brand in markup:\n${leaks.join("\n")}`).toEqual([]);
  });

  /**
   * BACKSTOP — whole file, no tokenising.
   *
   * The two passes above split the file into "string literals" and "everything
   * else" with regexes, and a regex cannot reliably tokenise JavaScript: one
   * unbalanced apostrophe inside a string shifts the quote pairing and a later
   * literal gets swallowed into the wrong match. That is not hypothetical —
   * `src/lib/sharepoint.functions.ts` carries `NEXIOS%20Reports` in a template
   * literal and BOTH passes missed it, which is how I found this.
   *
   * So this pass reads the raw file, subtracts only the things that are
   * provably machine-facing, and fails on anything left. It cannot be fooled by
   * quoting, at the cost of a slightly longer allowlist — the right trade for a
   * guard whose whole value is that it cannot be quietly bypassed.
   */
  it("backstop: no retired spelling survives anywhere in a source file", () => {
    const leaks: string[] = [];
    for (const file of files) {
      const rel = file.slice(ROOT.length + 1);
      if (ALLOWED_TECHNICAL.has(rel)) continue;
      const residue = stripComments(readFileSync(file, "utf8"))
        .replace(/^\s*import[\s\S]*?from\s+["'][^"']+["'];?$/gm, " ")
        .replace(DOMAIN_TOKEN, " ")
        .replace(SOURCE_PATH, " ")
        .replace(COMPONENT_ID, " ")
        .replace(MACHINE_TOKEN, " ");
      for (const re of RETIRED) {
        const hit = re.exec(residue);
        if (hit) {
          leaks.push(
            `${rel} → …${residue
              .slice(Math.max(0, hit.index - 30), hit.index + 40)
              .replace(/\s+/g, " ")
              .trim()}…`,
          );
          break;
        }
      }
    }
    expect(leaks, `retired brand survives:\n${leaks.join("\n")}`).toEqual([]);
  });

  it("the scanner actually detects a leak — a silent scanner would fake this", () => {
    const lits = stringLiterals(`const a = "Welcome to Nexus AI OS";`);
    expect(lits.some((l) => RETIRED.some((r) => r.test(l)))).toBe(true);
    // …and does not fire on a CSS class, which is the case that would make the
    // guard unkeepable if it were wrong.
    expect(isIdentifierish("nexus-card flex items-center")).toBe(true);
  });
});

describe("browser-read metadata carries the new brand", () => {
  const readPublic = (p: string) => readFileSync(join(ROOT, "public", p), "utf8");

  it("the PWA manifest names the platform correctly", () => {
    const m = JSON.parse(readPublic("manifest.webmanifest"));
    expect(m.name).toBe(PRODUCT_BRAND.ar.name);
    expect(m.short_name).toBe(PRODUCT_BRAND.ar.name);
    expect(m.description).toBe(PRODUCT_BRAND.ar.descriptor);
    expect(m.lang).toBe("ar");
    expect(m.dir).toBe("rtl");
  });

  it("no retired spelling anywhere in the manifest, robots or sitemap", () => {
    for (const f of ["manifest.webmanifest", "robots.txt", "sitemap.xml"]) {
      const raw = readPublic(f);
      for (const re of RETIRED) {
        // The domain is allowed to appear in robots/sitemap URLs; the /Nexus/
        // and /NEXIOS/ product spellings are not.
        if (re.source.includes("NEEXIOS")) continue;
        expect(re.test(raw), `${f} still contains ${re}`).toBe(false);
      }
    }
  });

  it("the service worker cache key uses the internal slug, not a brand name", () => {
    const sw = readPublic("sw.js");
    const key = /CACHE_NAME\s*=\s*"([^"]+)"/.exec(sw)?.[1] ?? "";
    expect(key).toContain(PRODUCT_BRAND.slug);
    // A stale cache key is how an old title survives a deploy for existing
    // users: the shell is served from cache and never re-fetched.
    expect(key).not.toMatch(/nexios|nexus/i);
  });
});
