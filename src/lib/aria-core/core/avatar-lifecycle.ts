/**
 * AvatarLifecycle — the ONE mount/unmount seam for the Avatar Brain.
 *
 * AriaProvider calls `avatarLifecycle.mount()` on mount and the returned
 * disposer on unmount. Idempotent and HMR-safe: repeated mounts never
 * start a second runtime, and disposing while another mount is still
 * active does not tear down the shared runtime.
 */
import { avatarRuntime } from "./avatar-runtime";
import { avatarTelemetry } from "./avatar-telemetry";

class AvatarLifecycle {
  private refCount = 0;
  private startedAt = 0;

  mount(): () => void {
    if (typeof window === "undefined") return () => {};
    this.refCount += 1;
    if (this.refCount === 1) {
      avatarRuntime.start();
      avatarTelemetry.start();
      this.startedAt = Date.now();
    }
    let disposed = false;
    return () => {
      if (disposed) return;
      disposed = true;
      this.refCount = Math.max(0, this.refCount - 1);
      if (this.refCount === 0) {
        avatarTelemetry.stop();
        avatarRuntime.stop();
        this.startedAt = 0;
      }
    };
  }

  isRunning(): boolean { return this.refCount > 0 && avatarRuntime.isRunning(); }
  uptimeMs(): number { return this.startedAt === 0 ? 0 : Date.now() - this.startedAt; }
}

export const avatarLifecycle = new AvatarLifecycle();
