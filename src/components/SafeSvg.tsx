import { forwardRef, type SVGProps } from "react";
import { safePreserveAspectRatio } from "@/lib/svg-safe";

/**
 * Drop-in replacement for <svg> that sanitizes preserveAspectRatio.
 * An invalid value falls back to "xMidYMid meet" instead of throwing a
 * render error that would unmount the surrounding React tree.
 */
export const SafeSvg = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(function SafeSvg(
  { preserveAspectRatio, ...rest },
  ref,
) {
  return (
    <svg ref={ref} preserveAspectRatio={safePreserveAspectRatio(preserveAspectRatio)} {...rest} />
  );
});
