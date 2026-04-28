// ─────────────────────────────────────────────
// Raksha AI — Shared Constants & Utilities
// ─────────────────────────────────────────────

export const COLORS = {
  PRIMARY: '#24e498',
  BACKGROUND: '#000000',
  CAUTION: '#f5a623',
  DANGER: '#ff3b5c',
  TEXT: '#ffffff',
  SURFACE: '#111111',
};

// Confidence thresholds
export const CONFIDENCE = {
  HIGH: 90,
  MEDIUM: 60,
};

// Risk thresholds
export const RISK = {
  LOW: 30,
  MEDIUM: 70,
};

// Message types between content ↔ background
export const MSG = {
  KEYSTROKE_BATCH: 'KEYSTROKE_BATCH',
  LINK_CLICK: 'LINK_CLICK',
  RE_AUTH_RESULT: 'RE_AUTH_RESULT',
  GET_STATUS: 'GET_STATUS',
  STATUS_UPDATE: 'STATUS_UPDATE',
  SHOW_CAUTION_BANNER: 'SHOW_CAUTION_BANNER',
  ENROLLMENT_COMPLETE: 'ENROLLMENT_COMPLETE',
  FORCE_LOCK: 'FORCE_LOCK',
};

// Actions from decision engine
export const ACTION = {
  ALLOW: 'ALLOW',
  CAUTION: 'CAUTION',
  BLOCK_WARN: 'BLOCK_WARN',
  BLOCK_LOCK: 'BLOCK_LOCK',
};

// Storage keys
export const STORAGE_KEYS = {
  ENROLLMENT_PROFILE: 'enrollmentProfile',
  ENROLLED: 'enrolled',
  PASSPHRASE: 'passphrase',
  EVENTS_LOG: 'eventsLog',
  SAFE_BROWSING_KEY: 'safeBrowsingKey',
};

/**
 * Generate a short unique ID
 */
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Clamp a number between min and max
 */
export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Format a timestamp to a human-readable string
 */
export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
