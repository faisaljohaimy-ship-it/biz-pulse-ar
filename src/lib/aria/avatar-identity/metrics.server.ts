// Identity metrics — counts checks, violations, and profile hits.
export interface IdentityMetricsSnapshot {
  readonly checks: number;
  readonly violations: number;
  readonly avg_score: number | null;
  readonly profile_hits: Record<string, number>;
}

export class IdentityMetrics {
  private checks = 0;
  private violations = 0;
  private scoreSamples: number[] = [];
  private profileHits: Record<string, number> = {};

  recordCheck(score: number, ok: boolean): void {
    this.checks++;
    if (!ok) this.violations++;
    if (Number.isFinite(score)) {
      this.scoreSamples.push(score);
      if (this.scoreSamples.length > 200) this.scoreSamples.shift();
    }
  }

  recordProfileHit(name: string): void {
    this.profileHits[name] = (this.profileHits[name] ?? 0) + 1;
  }

  snapshot(): IdentityMetricsSnapshot {
    const avg =
      this.scoreSamples.length === 0
        ? null
        : Math.round(
            (this.scoreSamples.reduce((a, b) => a + b, 0) / this.scoreSamples.length) * 100,
          ) / 100;
    return {
      checks: this.checks,
      violations: this.violations,
      avg_score: avg,
      profile_hits: { ...this.profileHits },
    };
  }
}
