// Pricing package + quote computation. No hidden discounts; assumptions explicit.
import type {
  ConfidenceBucket,
  PricingPackage,
  PricingQuote,
} from "./types";
import { PricingPackageZ } from "./contracts";

export function definePricingPackage(p: PricingPackage): PricingPackage {
  const parsed = PricingPackageZ.parse(p);
  for (const c of parsed.components) {
    if (c.currency !== parsed.currency) {
      throw new Error(
        `pricing component currency mismatch: ${c.currency} vs ${parsed.currency}`,
      );
    }
    if (c.maxUnits !== null && c.maxUnits < c.minUnits) {
      throw new Error(`pricing component ${c.id}: maxUnits < minUnits`);
    }
  }
  return parsed;
}

export function computeQuote(input: {
  pkg: PricingPackage;
  quantities: Readonly<Record<string, number>>;
  discountPct?: number; // 0..1
  additionalAssumptions?: ReadonlyArray<string>;
  evidence: PricingQuote["evidence"];
}): PricingQuote {
  const discountPct = Math.max(0, Math.min(1, input.discountPct ?? 0));
  let subtotal = 0;
  for (const c of input.pkg.components) {
    const qty = Math.max(0, input.quantities[c.id] ?? 0);
    if (qty < c.minUnits && qty !== 0) {
      throw new Error(`quote: component ${c.id} below minUnits (${c.minUnits})`);
    }
    if (c.maxUnits !== null && qty > c.maxUnits) {
      throw new Error(`quote: component ${c.id} exceeds maxUnits (${c.maxUnits})`);
    }
    subtotal += qty * c.unitPrice;
  }
  const total = subtotal * (1 - discountPct);
  const assumptions = [
    ...input.pkg.assumptions,
    ...(input.additionalAssumptions ?? []),
    `discountPct=${discountPct}`,
    `billingCycle=${input.pkg.billingCycle}`,
  ];
  // Confidence: pricing certainty is bounded by evidence density; caller
  // supplies evidence — if only one evidence entry, keep at low.
  let confidence: ConfidenceBucket;
  if (input.evidence.length === 0) confidence = "unknown";
  else if (input.evidence.length >= 5) confidence = "high";
  else if (input.evidence.length >= 2) confidence = "medium";
  else confidence = "low";

  return {
    packageId: input.pkg.id,
    quantities: { ...input.quantities },
    subtotal,
    discountPct,
    total,
    currency: input.pkg.currency,
    billingCycle: input.pkg.billingCycle,
    confidence,
    assumptions,
    evidence: input.evidence,
  };
}
