/**
 * NEXIOS · Glass Skeleton
 * Use before first paint of async values (KPIs, agent grid).
 * Prevents blank / em-dash flashes.
 */
export function GlassSkeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`nx-skeleton ${className}`} style={style} aria-hidden="true" />;
}
