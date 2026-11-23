import { useId } from "react";
import "@/styles/home/command-room-screens.css";

/** Insets measured against the owner's unchanged 1320 × 720 command-room image. */
const SCREEN_INTERIORS = [
  "218,116 365,116 365,229 218,229", // Globe graphic, below its heading and inside the bezel.
  "540,128 820,128 820,282 540,282", // World map, excluding its heading and left legend.
  "886,454 978,454 992,486 894,486", // Right desk display, inset from its sloping frame.
] as const;

interface CommandRoomScreensProps {
  /** Parent owns visibility, offscreen and global-pause policy. False restores the still. */
  readonly active: boolean;
}

/** Decorative light only; position over the image itself, with the same contained aspect ratio. */
export function CommandRoomScreens({ active }: CommandRoomScreensProps) {
  const instance = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const clip = `command-room-screens-${instance}`;
  const scan = `${clip}-scan`;

  return (
    <svg
      className="command-room-screens"
      viewBox="0 0 1320 720"
      preserveAspectRatio="xMidYMid meet"
      width="1320"
      height="720"
      data-active={active}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clip} clipPathUnits="userSpaceOnUse">
          {SCREEN_INTERIORS.map((points) => (
            <polygon key={points} points={points} />
          ))}
        </clipPath>
        <linearGradient id={scan} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#63dfff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#63dfff" stopOpacity="0.09" />
          <stop offset="1" stopColor="#63dfff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect
          className="command-room-screens__scan"
          width="1320"
          height="28"
          fill={`url(#${scan})`}
        />
        <g fill="none" stroke="#63dfff" strokeWidth="0.8">
          <circle
            className="command-room-screens__pulse command-room-screens__pulse--globe"
            cx="290"
            cy="174"
            r="17"
          />
          <circle className="command-room-screens__pulse" cx="693" cy="192" r="12" />
          <circle
            className="command-room-screens__pulse command-room-screens__pulse--desk"
            cx="943"
            cy="471"
            r="8"
          />
        </g>
      </g>
    </svg>
  );
}
