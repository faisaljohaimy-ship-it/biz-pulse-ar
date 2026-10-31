/**
 * حالة «إرفاق ملف وتحميله إلى مكتبة المعرفة» — **في ذاكرة الصفحة وحدها** (لا تخزين متصفح).
 *
 * الآلة: idle → (اختيار ملف + فحص العميل) → previewing → ready → executing → done، وأيّ خطوةٍ قد تنتهي
 * بـerror. كائن `File` يبقى في مرجعٍ هنا حتى النجاح أو الإلغاء لأن الخادم لا يخزّن الملف بين الخطوتين:
 * التأكيد يعيد رفع **الملف نفسه** مع الرمز.
 *
 * **معزولٌ عن المحادثة**: لا يستورد `use-finn-chat` ولا ناقلها، ولا يمرّر شيئًا إلى `messages`.
 * كل طلبٍ له رقم؛ نتيجةٌ متأخرة لطلبٍ أُلغي أو استُبدل تُهمل. و«محادثة جديدة» والمغادرة تقطعان الطلب.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  displaySafe,
  interruptedFailure,
  postFinnImport,
  validateFinnImportFile,
  type FinnImportClientFailure,
  type FinnImportPreviewView,
} from "@/lib/finn-import/client";
import type { FinnImportAction } from "@/lib/finn-import/contract";

export type FinnImportState =
  | { readonly phase: "idle" }
  | { readonly phase: "previewing"; readonly name: string }
  | { readonly phase: "ready"; readonly name: string; readonly preview: FinnImportPreviewView }
  | { readonly phase: "executing"; readonly name: string; readonly preview: FinnImportPreviewView }
  | {
      readonly phase: "done";
      readonly name: string;
      readonly documents: number;
      readonly deduped: number;
    }
  | {
      readonly phase: "error";
      readonly name: string;
      readonly failure: FinnImportClientFailure;
      /** الخطوة التي فشلت — عليها تُبنى إعادة المحاولة. */
      readonly step: FinnImportAction;
      /** معاينة الخطوة الثانية عند فشل `execute` (الرمز لإعادة الطلب نفسه). */
      readonly preview?: FinnImportPreviewView;
    };

const IDLE: FinnImportState = { phase: "idle" };

export function useFinnImport() {
  const [state, setState] = useState<FinnImportState>(IDLE);
  const stateRef = useRef<FinnImportState>(IDLE);
  const fileRef = useRef<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runRef = useRef(0);

  const commit = useCallback((next: FinnImportState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  /** يقطع الطلب الجاري ويُبطل نتيجته المتأخرة. */
  const stopRequest = useCallback(() => {
    runRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const run = useCallback(
    async (action: FinnImportAction, name: string, preview?: FinnImportPreviewView) => {
      const file = fileRef.current;
      if (!file) return;
      stopRequest();
      const id = runRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      if (action === "execute" && preview) commit({ phase: "executing", name, preview });
      else commit({ phase: "previewing", name });

      const out = await postFinnImport({
        file,
        action,
        token: action === "execute" ? preview?.token : undefined,
        signal: controller.signal,
      });
      if (id !== runRef.current) return; // أُلغي أو استُبدل أثناء الانتظار.
      abortRef.current = null;
      if (!out.ok) {
        commit({ phase: "error", name, failure: out, step: action, preview });
      } else if (out.kind === "preview") {
        commit({ phase: "ready", name, preview: out });
      } else {
        fileRef.current = null;
        commit({ phase: "done", name, documents: out.documents, deduped: out.deduped });
      }
    },
    [commit, stopRequest],
  );

  const pick = useCallback(
    (file: File) => {
      stopRequest();
      const name = displaySafe(file.name, 120) || "—";
      const check = validateFinnImportFile(file);
      if (!check.ok) {
        // مرفوض في العميل: لا طلب شبكة ولا ملف محفوظ.
        fileRef.current = null;
        commit({
          phase: "error",
          name,
          failure: { ok: false, error: check.error, message_ar: check.message_ar },
          step: "preview",
        });
        return;
      }
      fileRef.current = file;
      void run("preview", name);
    },
    [commit, run, stopRequest],
  );

  const confirm = useCallback(() => {
    const cur = stateRef.current;
    if (cur.phase === "ready") void run("execute", cur.name, cur.preview);
  }, [run]);

  /**
   * بعد فشل: `fresh=false` يعيد الخطوة نفسها بالرمز نفسه — لا يُعرض إلا حيث لم يُستهلك الرمز (حدّ المعدّل)،
   * فبعد فشلٍ متأخر تردّ الإعادةُ 409 كذبًا (`finnImportRecovery`). و`fresh=true` يطلب معاينةً جديدة من
   * الملف نفسه (انتهى الرمز أو تغيّرت البصمة أو فشل التنفيذ بعد الاستهلاك؛ الإدخال يُزيل المكرَّر).
   */
  const again = useCallback(
    (fresh: boolean) => {
      const cur = stateRef.current;
      if (cur.phase !== "error") return;
      if (!fresh && cur.step === "execute" && cur.preview)
        void run("execute", cur.name, cur.preview);
      else void run("preview", cur.name);
    },
    [run],
  );
  const retry = useCallback(() => again(false), [again]);
  const refresh = useCallback(() => again(true), [again]);

  /** إلغاء المالك أو إغلاقه. إيقاف انتظار `execute` لا يعني أن شيئًا لم يُكتب — فيُعلَن ذلك. */
  const cancel = useCallback(() => {
    const cur = stateRef.current;
    stopRequest();
    if (cur.phase === "executing") {
      commit({
        phase: "error",
        name: cur.name,
        failure: interruptedFailure("execute"),
        step: "execute",
      });
      return;
    }
    fileRef.current = null;
    commit(IDLE);
  }, [commit, stopRequest]);

  /** «محادثة جديدة»: يُمحى كل شيء بصمت. */
  const reset = useCallback(() => {
    stopRequest();
    fileRef.current = null;
    commit(IDLE);
  }, [commit, stopRequest]);

  // مغادرة الصفحة تقطع الطلب وتُسقط الملف من الذاكرة.
  useEffect(
    () => () => {
      runRef.current += 1;
      abortRef.current?.abort();
      fileRef.current = null;
    },
    [],
  );

  return { state, pick, confirm, retry, refresh, cancel, reset };
}
