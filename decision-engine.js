// ─────────────────────────────────────────────
// Raksha AI — Decision Engine
// Merges typing confidence + link risk → action.
// STRICT MODE: Risky websites are always blocked.
// ─────────────────────────────────────────────

import { ACTION, CONFIDENCE, RISK } from './utils.js';

/**
 * Decide what action to take based on typing confidence and link risk.
 *
 * RISK POLICY:
 * ┌─────────────────┬──────────┬──────────┬───────────┐
 * │                 │ Safe 0-19│ Med 20-49│ Risky 50+ │
 * ├─────────────────┼──────────┼──────────┼───────────┤
 * │ High   (90-100) │ ALLOW    │ CAUTION  │ BLOCK_WARN│
 * │ Medium (40-89)  │ ALLOW    │ CAUTION  │ BLOCK_WARN│
 * │ Low    (<40)    │ BLOCK_LOCK│BLOCK_LOCK│BLOCK_LOCK │
 * └─────────────────┴──────────┴──────────┴───────────┘
 *
 * Websites with risk >= 50 are ALWAYS blocked regardless of confidence.
 * Websites with risk >= 20 show a caution warning.
 *
 * @param {number} typingConfidence — 0 to 100
 * @param {number} linkRisk — 0 to 100
 * @returns {string} — one of ACTION values
 */
export function decide(typingConfidence, linkRisk) {
  // ── LOW CONFIDENCE: Lock everything ──
  if (typingConfidence < 40) {
    return ACTION.BLOCK_LOCK;
  }

  // ── RISKY WEBSITE: Always block (score 50+) ──
  if (linkRisk >= 50) {
    return ACTION.BLOCK_WARN;
  }

  // ── MEDIUM RISK WEBSITE: Show caution (20-49) ──
  if (linkRisk >= 20) {
    return ACTION.CAUTION;
  }

  // ── SAFE: Allow navigation ──
  return ACTION.ALLOW;
}
