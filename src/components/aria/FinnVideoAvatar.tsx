/**
 * FinnVideoAvatar — FINN's avatar image.
 *
 * The legacy hero-motion clip (an outdated FINN render) was removed, so this
 * now renders the static poster only. The `poster` / styling props are kept
 * so existing call sites stay unchanged; `active` is accepted but no longer
 * drives any motion.
 */
export interface FinnVideoAvatarProps {
  poster: string;
  className?: string;
  style?: React.CSSProperties;
  mediaStyle?: React.CSSProperties;
  mediaClassName?: string;
  /** Retained for API compatibility; no longer used (no motion clip). */
  active?: boolean;
}

export function FinnVideoAvatar({
  poster,
  className,
  style,
  mediaStyle,
  mediaClassName,
}: FinnVideoAvatarProps) {
  const defaultMediaClass = "absolute inset-0 h-full w-full select-none pointer-events-none";
  const mediaCls = mediaClassName ? `${defaultMediaClass} ${mediaClassName}` : defaultMediaClass;
  const combinedMediaStyle: React.CSSProperties = mediaClassName
    ? { ...mediaStyle }
    : { objectFit: "contain", objectPosition: "center top", ...mediaStyle };

  return (
    <div className={className} style={style} aria-hidden>
      <img
        src={poster}
        alt=""
        draggable={false}
        decoding="async"
        loading="eager"
        className={mediaCls}
        style={combinedMediaStyle}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}

export default FinnVideoAvatar;
