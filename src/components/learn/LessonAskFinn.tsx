/**
 * LessonAskFinn — bridge from a lesson into the FINN Singleton.
 *
 * Sends the prompt into the global copilot (see `src/lib/finn-core/`).
 * Because the singleton lives at the root, the conversation persists
 * even if the learner navigates to another route mid-answer.
 */
import { Sparkles } from "lucide-react";
import { useFinn } from "@/lib/finn-core";
import { cn } from "@/lib/utils";

interface Props {
  prompt: string;
  label?: string;
  className?: string;
}

export function LessonAskFinn({ prompt, label, className }: Props) {
  const { ask } = useFinn();
  return (
    <button
      type="button"
      onClick={() => ask(prompt)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2",
        "text-sm text-primary transition-colors hover:bg-primary/20",
        "focus:outline-none focus:ring-2 focus:ring-primary/40",
        className,
      )}
    >
      <Sparkles className="h-4 w-4" aria-hidden />
      {label ?? "Ask SADEED"}
    </button>
  );
}
