/**
 * Executive recommendations.
 *
 * Recommendations wrap a verified proposal for delivery to the
 * Executive Brain. They MUST cite at least one evidence reference.
 */

import {
  RecommendationInputSchema,
  type RecommendationInput,
} from "./contracts";
import { findProposal } from "./improvement.server";
import type { ExecutiveRecommendation } from "./types";

const LOG: ExecutiveRecommendation[] = [];

function recId(proposal_id: string, ts: string): string {
  let h = 5381;
  const seed = `rec|${proposal_id}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `rec_${(h >>> 0).toString(16)}`;
}

export function recommend(raw: RecommendationInput): ExecutiveRecommendation {
  const input = RecommendationInputSchema.parse(raw);
  if (!findProposal(input.proposal_id)) {
    throw new Error(
      `recommendation: proposal ${input.proposal_id} was never registered`,
    );
  }
  const created_at = new Date().toISOString();
  const rec: ExecutiveRecommendation = Object.freeze({
    id: recId(input.proposal_id, created_at),
    created_at,
    proposal_id: input.proposal_id,
    headline: input.headline,
    body: input.body,
    severity: input.severity,
    confidence: input.confidence,
    evidence: Object.freeze([...input.evidence]) as ExecutiveRecommendation["evidence"],
  });
  LOG.push(rec);
  return rec;
}

export function listRecommendations(): readonly ExecutiveRecommendation[] {
  return LOG.slice();
}
