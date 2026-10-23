/**
 * رسالة في محادثة فِن. المستخدم: فقاعة نصّ خام (بلا Markdown — ما كتبه يُعرض كما هو).
 * فِن: Markdown كامل العرض مع شارة المحرّك الذي أجاب فعلًا.
 */
import { memo } from "react";
import { FINN_COPY } from "@/lib/finn-agent/copy";
import { FinnEngineBadge } from "./FinnEngineBadge";
import { FinnMarkdown } from "./FinnMarkdown";
import type { FinnUiMessage } from "./use-finn-chat";

function FinnMessageImpl({ message, streaming }: { message: FinnUiMessage; streaming: boolean }) {
  if (message.role === "user") {
    return (
      <div className="flex">
        <div
          dir="auto"
          className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl rounded-ss-md bg-[color:var(--tone-blue)] px-4 py-2.5 text-[15px] leading-7 text-[color:var(--surface)]"
        >
          <span className="sr-only">{FINN_COPY.you}: </span>
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <article className="min-w-0">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-bold text-[color:var(--ink)]">{FINN_COPY.assistant}</span>
        {message.engine ? (
          <FinnEngineBadge engine={message.engine} fallback={message.fallback} />
        ) : null}
      </div>
      {streaming && message.content === "" ? (
        // انتظار أول مخرج — محدودٌ بمهلة الخادم (45 ث للمحرّك، 120 ث للكل)، لا تحميلٌ أبدي.
        <p role="status" className="text-[14px] text-[color:var(--ink-2)]">
          {FINN_COPY.thinking}
        </p>
      ) : (
        <FinnMarkdown text={message.content} />
      )}
      {streaming && message.content !== "" ? (
        <span
          aria-hidden
          className="mt-1 inline-block h-4 w-2 rounded-sm bg-[color:var(--ink-3)]"
        />
      ) : null}
      {message.truncated ? (
        <p className="mt-2 text-[13px] text-[color:var(--ink-2)]">{FINN_COPY.truncated}</p>
      ) : null}
      {message.interrupted ? (
        <p className="mt-2 text-[13px] text-[color:var(--ink-2)]">{FINN_COPY.interrupted}</p>
      ) : null}
    </article>
  );
}

export const FinnMessage = memo(FinnMessageImpl);
