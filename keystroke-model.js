// ─────────────────────────────────────────────
// Raksha AI — Advanced Keystroke Dynamics Model
// Builds a behavioral fingerprint from:
//   - Dwell time per key (hold duration)
//   - Flight time (gap between keys)
//   - Digraph timing (specific key-pair latency)
//   - Typing speed (WPM rolling average)
//   - Rhythm consistency (std deviation of intervals)
//   - Backspace/error frequency
//   - Pause patterns (hesitation detection)
//
// If pattern deviates → confidence drops → trigger lock
// ─────────────────────────────────────────────

import { clamp, STORAGE_KEYS } from './utils.js';

let enrolledProfile = null;

async function loadProfile() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.ENROLLMENT_PROFILE);
  enrolledProfile = data[STORAGE_KEYS.ENROLLMENT_PROFILE] || null;
  return enrolledProfile;
}
loadProfile();

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEYS.ENROLLMENT_PROFILE]) {
    enrolledProfile = changes[STORAGE_KEYS.ENROLLMENT_PROFILE].newValue;
  }
});

// ═══════════════════════════════════════════
// FEATURE EXTRACTION — Full Behavioral Fingerprint
// ═══════════════════════════════════════════

/**
 * Extract a rich behavioral fingerprint from keystroke batch.
 */
export function extractFeatures(batch) {
  if (!batch || batch.length < 4) return null;

  const downs = batch.filter(e => e.type === 'down');
  const ups = batch.filter(e => e.type === 'up');
  if (downs.length < 2 || ups.length < 2) return null;

  // ── 1. Dwell times (key hold duration) ──
  const dwellTimes = [];
  const usedDowns = new Set();
  for (const up of ups) {
    for (let i = 0; i < downs.length; i++) {
      if (!usedDowns.has(i) && downs[i].key === up.key && downs[i].time < up.time) {
        dwellTimes.push(up.time - downs[i].time);
        usedDowns.add(i);
        break;
      }
    }
  }

  // ── 2. Flight times (keyDown-to-keyDown intervals) ──
  const sortedDowns = [...downs].sort((a, b) => a.time - b.time);
  const flightTimes = [];
  for (let i = 1; i < sortedDowns.length; i++) {
    const gap = sortedDowns[i].time - sortedDowns[i - 1].time;
    if (gap > 0 && gap < 2000) flightTimes.push(gap);
  }

  // ── 3. Digraph timings (specific key-pair latencies) ──
  const digraphs = {};
  for (let i = 1; i < sortedDowns.length; i++) {
    const pair = sortedDowns[i - 1].key + '->' + sortedDowns[i].key;
    const latency = sortedDowns[i].time - sortedDowns[i - 1].time;
    if (latency > 0 && latency < 2000) {
      if (!digraphs[pair]) digraphs[pair] = [];
      digraphs[pair].push(latency);
    }
  }
  // Average digraph latency (overall measure of pair consistency)
  const allDigraphValues = Object.values(digraphs).flat();
  const digraphMean = mean(allDigraphValues);
  const digraphStd = std(allDigraphValues);

  // ── 4. Typing speed (WPM) ──
  const totalTimeMin = (batch[batch.length - 1].time - batch[0].time) / 60000;
  const wpm = totalTimeMin > 0 ? (downs.length / 5) / totalTimeMin : 0;

  // ── 5. Rhythm consistency (coefficient of variation of intervals) ──
  const allIntervals = [...flightTimes];
  const rhythmCV = mean(allIntervals) > 0 ? std(allIntervals) / mean(allIntervals) : 0;

  // ── 6. Backspace / error frequency ──
  const backspaceCount = downs.filter(d => d.key === 'Backspace' || d.key === 'Delete').length;
  const errorRate = downs.length > 0 ? backspaceCount / downs.length : 0;

  // ── 7. Pause patterns (gaps > 500ms = hesitation) ──
  const pauses = flightTimes.filter(t => t > 500);
  const pauseRatio = flightTimes.length > 0 ? pauses.length / flightTimes.length : 0;

  // ── 8. Key hold pressure proxy ──
  // We can't measure actual pressure in browser, but dwell variance
  // serves as a proxy — consistent pressure = consistent dwell
  const dwellCV = mean(dwellTimes) > 0 ? std(dwellTimes) / mean(dwellTimes) : 0;

  if (dwellTimes.length < 2) return null;

  return {
    meanDwell: mean(dwellTimes),
    stdDwell: std(dwellTimes),
    meanFlight: mean(flightTimes),
    stdFlight: std(flightTimes),
    digraphMean,
    digraphStd,
    wpm,
    rhythmCV,
    errorRate,
    pauseRatio,
    dwellCV,
  };
}

// ═══════════════════════════════════════════
// CONFIDENCE PREDICTION — Behavioral Match
// ═══════════════════════════════════════════

/**
 * Compare live typing to enrolled fingerprint.
 * Returns confidence 0-100.
 */
export async function predictConfidence(features) {
  if (!enrolledProfile) {
    await loadProfile();
    if (!enrolledProfile) return 100;
  }

  // Features to compare, with weights
  // minStd set generously to tolerate natural variance in the enrolled user
  const featureConfig = {
    meanDwell:    { weight: 1.5, minStd: 35 },   // Key hold (ms) — varies a lot naturally
    stdDwell:     { weight: 0.5, minStd: 20 },
    meanFlight:   { weight: 1.5, minStd: 40 },   // Gap between keys (ms)
    stdFlight:    { weight: 0.5, minStd: 25 },
    digraphMean:  { weight: 1.0, minStd: 35 },   // Key-pair timing (ms)
    digraphStd:   { weight: 0.3, minStd: 20 },
    wpm:          { weight: 1.2, minStd: 15 },   // Words per minute — big natural variance
    rhythmCV:     { weight: 0.5, minStd: 0.2 },  // Rhythm consistency ratio
    errorRate:    { weight: 0.3, minStd: 0.08 }, // Error pattern ratio
    pauseRatio:   { weight: 0.3, minStd: 0.15 }, // Hesitation ratio
    dwellCV:      { weight: 0.5, minStd: 0.15 }, // Pressure consistency ratio
  };

  let totalDistance = 0;
  let totalWeight = 0;

  for (const [key, config] of Object.entries(featureConfig)) {
    const profileData = enrolledProfile[key];
    if (!profileData) continue;

    const profileMean = profileData.mean ?? 0;
    const profileStd = profileData.std ?? config.minStd;
    const featureVal = features[key] ?? 0;

    const effectiveStd = Math.max(profileStd, config.minStd);
    const zScore = Math.abs(featureVal - profileMean) / effectiveStd;

    totalDistance += zScore * config.weight;
    totalWeight += config.weight;
  }

  const avgZ = totalWeight > 0 ? totalDistance / totalWeight : 0;

  // Softer Gaussian: z=0 → 100, z=1 → 70, z=1.5 → 46, z=2 → 25, z=3 → 4
  // More tolerant for the enrolled user while still catching imposters
  const confidence = clamp(Math.round(100 * Math.exp(-0.35 * avgZ * avgZ)));

  return confidence;
}

// ── Math helpers ──
function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr) {
  if (!arr || arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}
