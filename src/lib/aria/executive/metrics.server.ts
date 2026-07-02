export interface ExecutiveMetricsSnapshot {
  readonly briefings: number;
  readonly recommendations: number;
  readonly alerts: number;
  readonly insights: number;
  readonly dialogTurns: number;
  readonly followUps: number;
}

const M = { briefings: 0, recommendations: 0, alerts: 0, insights: 0, dialogTurns: 0, followUps: 0 };

export function noteBriefing(): void { M.briefings++; }
export function noteRecommendation(): void { M.recommendations++; }
export function noteAlert(): void { M.alerts++; }
export function noteInsight(): void { M.insights++; }
export function noteDialogTurn(): void { M.dialogTurns++; }
export function noteFollowUp(): void { M.followUps++; }

export function executiveMetrics(): ExecutiveMetricsSnapshot { return { ...M }; }
