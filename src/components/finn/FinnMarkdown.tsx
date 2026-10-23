/**
 * عرض Markdown لردود فِن — `react-markdown` + `remark-gfm` وحدهما.
 *
 * **ليس** `MessageResponse` (streamdown/shiki/mermaid): ذاك يكسر ميزانية الأداء —
 * القاعدة نفسها في `SadeedCopilot`. بلا HTML خام (لا `rehype-raw`): ما يكتبه النموذج
 * نصٌّ يُعرض لا شيفرةٌ تُنفَّذ. الصور لا تُحمَّل (تُعرض بدائلها النصّية) فلا يُطلَب
 * من الشبكة شيءٌ لمجرّد أن نموذجًا كتب رابط صورة، والروابط تُفتح في تبويبٍ جديد
 * بـ`rel="noopener noreferrer"` (المادة ١٥). والألوان من الرموز فقط.
 */
import { Children, isValidElement, memo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { FinnCodeBlock } from "./FinnCodeBlock";

function textOf(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return "";
}

const components: Components = {
  // الكتلة المسوّرة: `pre > code` — اللغة من الصنف `language-xxx`.
  pre({ children }) {
    const child = Children.toArray(children)[0];
    if (isValidElement(child)) {
      const props = child.props as { className?: string; children?: ReactNode };
      const language = /language-([\w+#.-]+)/.exec(props.className ?? "")?.[1];
      return <FinnCodeBlock language={language} code={textOf(props.children).replace(/\n$/, "")} />;
    }
    return <pre>{children}</pre>;
  },
  // السطري (الكتلة تُعالَج في `pre` أعلاه).
  code({ children }) {
    return (
      <code
        dir="ltr"
        className="rounded-md bg-[color:var(--chip-strong)] px-1.5 py-0.5 text-[0.9em] text-[color:var(--ink)] [unicode-bidi:isolate]"
      >
        {children}
      </code>
    );
  },
  a({ href, children }) {
    // وجهةٌ فارغة (سبق أن نزع react-markdown عنها javascript:/data:) أو غير http(s)/mailto
    // (نسبية، `#frag`…) ليست رابطًا: `href=""` مع `_blank` يفتح نسخةً ثانية من التطبيق (W5 #7).
    // تبقى نصًّا مقروءًا بلا تفاعل.
    if (!href || !/^(?:https?:|mailto:)/i.test(href)) return <span>{children}</span>;
    return (
      <a
        href={href}
        // الوجهة الحقيقية تظهر بالتمرير قبل النقر (نصّ الرابط قد يخالف وجهته).
        title={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-[color:var(--tone-blue)] underline underline-offset-4"
      >
        {children}
      </a>
    );
  },
  img({ alt }) {
    return <span className="text-[color:var(--ink-3)]">{alt ? `[${alt}]` : ""}</span>;
  },
  p({ children }) {
    return <p className="my-2 leading-7">{children}</p>;
  },
  ul({ children }) {
    return <ul className="my-2 list-disc space-y-1 ps-6 leading-7">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="my-2 list-decimal space-y-1 ps-6 leading-7">{children}</ol>;
  },
  h1({ children }) {
    return <h3 className="mb-1 mt-4 text-lg font-bold">{children}</h3>;
  },
  h2({ children }) {
    return <h3 className="mb-1 mt-4 text-base font-bold">{children}</h3>;
  },
  h3({ children }) {
    return <h4 className="mb-1 mt-3 text-[15px] font-bold">{children}</h4>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-2 border-s-4 border-[color:var(--hairline)] ps-3 text-[color:var(--ink-2)]">
        {children}
      </blockquote>
    );
  },
  hr() {
    return <hr className="my-4 border-[color:var(--hairline)]" />;
  },
  table({ children }) {
    return (
      <div className="my-3 max-w-full overflow-x-auto rounded-lg border border-[color:var(--hairline)]">
        <table className="w-full border-collapse text-[13px]">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border-b border-[color:var(--hairline)] bg-[color:var(--chip)] px-3 py-2 text-start font-bold">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border-b border-[color:var(--hairline-soft)] px-3 py-2 align-top">
        {children}
      </td>
    );
  },
};

function FinnMarkdownImpl({ text }: { text: string }) {
  return (
    <div className="min-w-0 break-words text-[15px] text-[color:var(--ink)]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

/** تُعاد الرسالة المكتملة بلا إعادة تحليل — لا يتغيّر نصّها. */
export const FinnMarkdown = memo(FinnMarkdownImpl);
