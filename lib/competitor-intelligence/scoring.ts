import type {
  CompetitorRelationship,
  ScoreComponents,
} from "./types";

export const SCORE_WEIGHTS = {
  customer_overlap: 0.3,
  product_substitutability: 0.25,
  momentum: 0.2,
  distribution_overlap: 0.15,
  evidence_quality: 0.1,
} as const;

const RELATIONSHIP_LIMITS: Record<CompetitorRelationship, number> = {
  direct: 4,
  indirect: 3,
  emerging: 3,
};

export function clampScore(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(Math.min(100, Math.max(0, numeric)));
}

export function calculateThreatScore(components: ScoreComponents): number {
  return clampScore(
    components.customer_overlap * SCORE_WEIGHTS.customer_overlap +
      components.product_substitutability *
        SCORE_WEIGHTS.product_substitutability +
      components.momentum * SCORE_WEIGHTS.momentum +
      components.distribution_overlap * SCORE_WEIGHTS.distribution_overlap +
      components.evidence_quality * SCORE_WEIGHTS.evidence_quality,
  );
}

export function selectRelationshipMix<T extends {
  relationship: CompetitorRelationship;
  threat_score: number;
}>(candidates: T[]): T[] {
  const counts: Record<CompetitorRelationship, number> = {
    direct: 0,
    indirect: 0,
    emerging: 0,
  };

  return [...candidates]
    .sort((a, b) => b.threat_score - a.threat_score)
    .filter((candidate) => {
      if (counts[candidate.relationship] >= RELATIONSHIP_LIMITS[candidate.relationship]) {
        return false;
      }
      counts[candidate.relationship] += 1;
      return true;
    })
    .slice(0, 10);
}

export function severityForScore(score: number): "low" | "medium" | "high" {
  if (score >= 85) return "high";
  if (score >= 70) return "medium";
  return "low";
}
