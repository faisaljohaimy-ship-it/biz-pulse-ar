interface Props {
  slug?: string;
  src?: string;
  lang?: "ar" | "en";
  initialSeconds?: number;
  poster?: string | null;
}

/** LessonVideo — site-wide video removed. Renders a static poster (if any)
 *  with a "Video disabled" note. Preserves the original prop shape. */
export function LessonVideo({ poster }: Props) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
      {poster ? (
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
      ) : null}
      <div className="absolute inset-0 grid place-items-center bg-black/40 text-xs text-white/80">
        الفيديو معطّل — استخدم أريا للشرح المباشر
      </div>
    </div>
  );
}

export default LessonVideo;
