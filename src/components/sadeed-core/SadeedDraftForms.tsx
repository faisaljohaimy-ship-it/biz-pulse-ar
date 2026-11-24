import { useId, useState, type FormEvent } from "react";
import type { Locale } from "@/lib/i18n";
import { actionRegistry } from "@/lib/sadeed-core/core/action-registry";
import {
  buildConstrainedDraft,
  CONSTRAINED_DRAFT_KINDS,
  type ConstrainedDraftKind,
} from "@/lib/sadeed-core/constrained-draft-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type DraftFormsProps = {
  readonly locale: Locale;
  readonly onDraft: (draft: string) => void;
};

/** The caller supplies the singleton's draft handoff; these forms never submit a turn. */
export function SadeedDraftForms({ locale, onDraft }: DraftFormsProps) {
  const ar = locale === "ar";
  return (
    <details className="mt-4 min-w-0 rounded-xl border border-border p-3" dir={ar ? "rtl" : "ltr"}>
      <summary className="nx-focus-ring flex min-h-[44px] cursor-pointer items-center font-semibold">
        {ar ? "نماذج مسودات للمراجعة" : "Review draft forms"}
      </summary>
      <p className="my-3 text-sm text-muted-foreground">
        {ar
          ? "تفتح مسودة قابلة للتحرير في لوحة سديد. لا إرسال تلقائي، ولا إنشاء أو إسناد مهمة أو نشر تقرير."
          : "Open an editable draft in the Sadeed panel. No automatic send, task creation or assignment, or report publication."}
      </p>
      <div className="space-y-3">
        {CONSTRAINED_DRAFT_KINDS.map((kind) => (
          <ReviewDraftForm key={kind} kind={kind} locale={locale} onDraft={onDraft} />
        ))}
      </div>
    </details>
  );
}

function ReviewDraftForm({
  kind,
  locale,
  onDraft,
}: DraftFormsProps & { kind: ConstrainedDraftKind }) {
  const id = useId();
  const ar = locale === "ar";
  const action = actionRegistry.get(kind);
  const [topic, setTopic] = useState("");
  const [details, setDetails] = useState("");
  const [failed, setFailed] = useState(false);

  const prepare = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const draft = buildConstrainedDraft({ kind, locale, topic, details });
      onDraft(draft);
      setTopic("");
      setDetails("");
      setFailed(false);
    } catch {
      setFailed(true);
    }
  };

  return (
    <details className="min-w-0 rounded-xl border border-border p-3" data-draft-kind={kind}>
      <summary className="nx-focus-ring flex min-h-[44px] cursor-pointer items-center text-sm font-semibold">
        {ar ? action.label_ar : action.label_en}
      </summary>
      <form className="mt-3 space-y-3" onSubmit={prepare}>
        <div className="space-y-2">
          <label htmlFor={`${id}-topic`} className="text-sm font-semibold">
            {ar ? "الموضوع" : "Topic"}
          </label>
          <Input
            id={`${id}-topic`}
            className="min-h-[44px]"
            style={{ minHeight: 44 }}
            value={topic}
            minLength={3}
            maxLength={160}
            required
            onChange={(event) => {
              setTopic(event.target.value);
              setFailed(false);
            }}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor={`${id}-details`} className="text-sm font-semibold">
            {ar ? "ملاحظاتك للمسودة" : "Your draft notes"}
          </label>
          <Textarea
            id={`${id}-details`}
            value={details}
            minLength={1}
            maxLength={1200}
            required
            onChange={(event) => {
              setDetails(event.target.value);
              setFailed(false);
            }}
          />
        </div>
        <Button type="submit" className="min-h-[44px] whitespace-normal" style={{ minHeight: 44 }}>
          {ar ? "فتح المسودة للمراجعة" : "Open draft for review"}
        </Button>
        {failed && (
          <p role="alert" className="text-sm">
            {ar
              ? "تحقق من الموضوع والملاحظات ثم أعد المحاولة. لم تُرسل المسودة."
              : "Check the topic and notes, then try again. The draft was not sent."}
          </p>
        )}
      </form>
    </details>
  );
}
