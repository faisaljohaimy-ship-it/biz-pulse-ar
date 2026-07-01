/**
 * Timeout engine — per-task and mission timeout. Cancellation propagates
 * from mission → per-task via linked AbortControllers.
 */

export interface LinkedTimeout {
  signal: AbortSignal;
  cancel: () => void;
  timedOut: () => boolean;
}

/** Create a controller that aborts when the parent aborts OR ms elapses. */
export function linkTimeout(parent: AbortSignal, ms: number): LinkedTimeout {
  const controller = new AbortController();
  let timedOutFlag = false;

  const onParentAbort = () => controller.abort();
  if (parent.aborted) controller.abort();
  else parent.addEventListener("abort", onParentAbort, { once: true });

  const timer = setTimeout(() => {
    timedOutFlag = true;
    controller.abort();
  }, ms);

  return {
    signal: controller.signal,
    cancel: () => {
      clearTimeout(timer);
      parent.removeEventListener("abort", onParentAbort);
    },
    timedOut: () => timedOutFlag,
  };
}
