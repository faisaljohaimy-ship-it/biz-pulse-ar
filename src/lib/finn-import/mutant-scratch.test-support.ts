/**
 * أرضية النسخ المُضعَّفة (براهين التحمير، المادة ٣٠) — مشتركة بين اختبارات التضعيف الثلاثة.
 *
 * **لماذا خارج `src/`؟** كانت النسخ المُضعَّفة تُكتب بجوار الأصل داخل `src/` وتُحذف فور استيرادها،
 * بينما حرّاس عقد أخرى في المستودع تفعل `globSync("src/**\/*.{ts,tsx}")` ثم `readFile` تحت التوازي: ملفٌّ
 * يُدرَج ثم يُحذف قبل قراءته ⇒ ENOENT عشوائي يُحمّر البوابة دون سبب (قِيس: ٨ من ٨ تشغيلات حمراء للمجموعة
 * الثلاثية). فالنسخ الآن تُكتب في `<جذر المستودع>/.mutant-scratch/` (مُتجاهَل في git)، لا يمسّها
 * أيّ glob على `src/`.
 *
 * **ما يتغيّر في النسخة:** محدِّدات الاستيراد النسبية (`from "./x"` · `from "../x"` · `import("./x")` ·
 * `import "./x"`) تُعاد كتابتها إلى مسارات مطلقة لملفات الأصل، فيحلّ المحمِّل النسخة على الوحدات الحقيقية
 * نفسها (وتنطبق عليها `vi.mock` كما على الأصل). أمّا الأسماء المستعارة `@/` فتعمل كما هي. ومحدِّدٌ نسبيّ
 * يفلت من إعادة الكتابة يُفشل الاختبار بصوتٍ عالٍ بدل أن ينكسر استيرادٌ بصمت.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const MUTANT_REPO_ROOT = path.resolve(HERE, "../../..");
export const MUTANT_SCRATCH_DIR = path.join(MUTANT_REPO_ROOT, ".mutant-scratch");

/** هل هذا اسم ملفٍّ مُضعَّف؟ (`__mutant_` · `__routemutant_` · `__pii_mutant_` … في أي مستوى من المسار) */
export function isMutantFileName(relativePath: string): boolean {
  return /(^|[\\/])__[a-z_]*mutant_/.test(relativePath);
}

/** ملفات مُضعَّفة داخل `src/` (يجب ألا يوجد أيٌّ منها أبدًا: هذا بالذات ما كان يكسر globSync الحرّاس). */
export function mutantFilesInsideSrc(): string[] {
  try {
    return (fs.readdirSync(path.join(MUTANT_REPO_ROOT, "src"), { recursive: true }) as string[])
      .map(String)
      .filter(isMutantFileName);
  } catch {
    return [];
  }
}

/** عمرٌ بعده يُعدّ الملف المُضعَّف بقيةَ تشغيلٍ مقطوع (لا يمسّ تشغيلًا حيًّا يجري معه). */
const STALE_AFTER_MS = 10 * 60_000;

const CANDIDATE_SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function resolveToAbsoluteFile(fromDir: string, specifier: string): string {
  const base = path.resolve(fromDir, specifier);
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = base + suffix;
    try {
      if (fs.statSync(candidate).isFile()) return candidate.split(path.sep).join("/");
    } catch {
      /* جرّب اللاحقة التالية */
    }
  }
  throw new Error(`تعذّر حلّ الاستيراد النسبي «${specifier}» من ${fromDir}`);
}

// from "./x" · from '../x' (يشمل export … from) — import("./x") — import "./x"
const FROM_RE = /(\bfrom\s*)(["'])(\.{1,2}\/[^"'\n]*)\2/g;
const DYNAMIC_RE = /(\bimport\s*\(\s*)(["'])(\.{1,2}\/[^"'\n]*)\2/g;
const SIDE_EFFECT_RE = /(\bimport\s+)(["'])(\.{1,2}\/[^"'\n]*)\2/g;
const LEFTOVER_RE = /(?:\bfrom\s*|\bimport\s*\(?\s*)["'`]\.{1,2}\//;

/** يحوّل كل محدِّدٍ نسبيٍّ إلى مسارٍ مطلقٍ لملف الأصل؛ ويرمي إن بقي نسبيٌّ واحد. */
export function rewriteRelativeImports(code: string, sourceDir: string): string {
  const swap = (_all: string, head: string, quote: string, spec: string) =>
    `${head}${quote}${resolveToAbsoluteFile(sourceDir, spec)}${quote}`;
  const out = code.replace(FROM_RE, swap).replace(DYNAMIC_RE, swap).replace(SIDE_EFFECT_RE, swap);
  if (LEFTOVER_RE.test(out)) {
    throw new Error("بقي محدِّد استيراد نسبيّ لم يُعَد كتابته في النسخة المُضعَّفة");
  }
  return out;
}

/**
 * مُنشئ نسخٍ مُضعَّفة ببادئةٍ خاصة بكل ملف اختبار (فلا يمسح أحد الملفّات نسخ الآخر وهي تعمل معًا).
 * أسماء الملفات: `<البادئة><pid>_<عدّاد>__<اسم الأصل>` داخل `.mutant-scratch/`.
 */
export function createMutantScratch(prefix: string) {
  let counter = 0;
  const mine = (file: string) => file.startsWith(`${prefix}${process.pid}_`);
  return {
    dir: MUTANT_SCRATCH_DIR,
    /** يمسح بقايا تشغيلٍ مقطوع (بهذه البادئة وأقدم من عشر دقائق) — لا يمسّ ملفات تشغيلٍ حيّ. */
    cleanStale(): void {
      let files: string[] = [];
      try {
        files = fs.readdirSync(MUTANT_SCRATCH_DIR);
      } catch {
        return;
      }
      for (const file of files) {
        if (!file.startsWith(prefix)) continue;
        const full = path.join(MUTANT_SCRATCH_DIR, file);
        try {
          if (Date.now() - fs.statSync(full).mtimeMs > STALE_AFTER_MS)
            fs.rmSync(full, { force: true });
        } catch {
          /* حُذف من تشغيلٍ آخر */
        }
      }
    },
    /** ما بقي من نسخ هذا التشغيل (يجب أن يكون فارغًا بعد كل استيراد). */
    leftovers(): string[] {
      try {
        return fs.readdirSync(MUTANT_SCRATCH_DIR).filter(mine);
      } catch {
        return [];
      }
    },
    /** يكتب النسخة المُضعَّفة (بعد إعادة كتابة الاستيرادات) ويسلّم مسارها المطلق ثم يحذفها في كل الأحوال. */
    async withMutantFile<T>(
      sourcePath: string,
      mutatedCode: string,
      run: (mutantPath: string) => Promise<T>,
    ): Promise<T> {
      fs.mkdirSync(MUTANT_SCRATCH_DIR, { recursive: true });
      const target = path.join(
        MUTANT_SCRATCH_DIR,
        `${prefix}${process.pid}_${counter++}__${path.basename(sourcePath)}`,
      );
      fs.writeFileSync(target, rewriteRelativeImports(mutatedCode, path.dirname(sourcePath)));
      try {
        return await run(target);
      } finally {
        fs.rmSync(target, { force: true });
      }
    },
    /** يستورد الوحدة من النسخة المُضعَّفة. */
    importMutated<M>(sourcePath: string, mutatedCode: string): Promise<M> {
      return this.withMutantFile(
        sourcePath,
        mutatedCode,
        async (target) => (await import(/* @vite-ignore */ target)) as M,
      );
    },
  };
}
