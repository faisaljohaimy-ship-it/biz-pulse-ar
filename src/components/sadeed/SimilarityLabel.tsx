import { similarityLabelAr } from "@/lib/sadeed/similarity-label";

/**
 * وسم التشابه على أسطح العرض (O7 د) — نسبةٌ لكوساين محسوب وحده، وإلا وسمٌ
 * محايد («مطابقة نصّية» أو «تطابق لم يُقَس»). المنطق في `similarity-label.ts`؛
 * هذا الغلاف يُبقي كل سطحٍ على صنفه الحالي (`className`) فلا بايت CSS جديدًا.
 */
export function SimilarityLabel({
  value,
  lexical,
  className,
}: {
  value: unknown;
  lexical?: boolean;
  className?: string;
}) {
  return <span className={className}>{similarityLabelAr(value, { lexical })}</span>;
}
