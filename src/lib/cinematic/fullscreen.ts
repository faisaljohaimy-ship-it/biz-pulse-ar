type FullscreenTarget = {
  requestFullscreen?: () => Promise<void>;
};

/** Preserve the click's user activation and contain unsupported/rejected browser APIs. */
export async function requestCinematicFullscreen(
  target: FullscreenTarget | null,
): Promise<"entered" | "unsupported" | "failed"> {
  if (!target || typeof target.requestFullscreen !== "function") return "unsupported";
  try {
    await target.requestFullscreen();
    return "entered";
  } catch {
    return "failed";
  }
}
