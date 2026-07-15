/**
 * Canonical self-hosted media contract for the pre-system cinematic welcome.
 * Keep the measured duration and hard cap aligned with the shipped MP4.
 */
export const WELCOME_INTRO_MEDIA = {
  videoSrc: "/media/nexios-welcome-intro.mp4",
  posterSrc: "/media/nexios-welcome-intro-poster.webp",
  durationSeconds: 64.62,
  durationLabel: "01:05",
  aspectRatio: "512 / 910",
  minimumDisplayMs: 3_500,
  fadeMs: 600,
  hardCapMs: 72_000,
} as const;
