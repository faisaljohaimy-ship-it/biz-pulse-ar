"use client";

// Heavy markdown renderer (streamdown → shiki syntax highlighter, mermaid
// diagrams, KaTeX math). Isolated here and loaded lazily from message.tsx so
// these large libraries form a separate async chunk instead of inflating the
// main bundle and the build's peak memory (Vercel Hobby OOM fix).
import { memo, type ComponentProps } from "react";
import { cjk } from "@streamdown/cjk";
import { math } from "@streamdown/math";
import { code } from "@streamdown/code";
import { mermaid } from "@streamdown/mermaid";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

// Restore syntax highlighting (shiki) and mermaid diagram rendering for
// assistant messages — see monitoring finding 5d3d756f.
const streamdownPlugins = { cjk, math, code, mermaid };

export const MessageResponseImpl = memo(
  ({ className, ...props }: MessageResponseProps) => (
    <Streamdown
      className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
      plugins={streamdownPlugins}
      {...props}
    />
  ),
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children && nextProps.isAnimating === prevProps.isAnimating,
);

MessageResponseImpl.displayName = "MessageResponseImpl";

export default MessageResponseImpl;
