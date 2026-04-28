// ─────────────────────────────────────────────
// Raksha AI — Local Storage Client
// All data stored in chrome.storage.local only.
// No external services required.
// ─────────────────────────────────────────────

const EVENTS_KEY = 'raksha_events';
const THREATS_KEY = 'raksha_threats';
const ENROLLMENT_KEY = 'raksha_enrollment_data';

/**
 * Initialize storage (no-op for local, kept for API compatibility).
 */
export function init() {
  console.log('[Raksha] Using local storage (chrome.storage.local).');
}

/**
 * Log a general event.
 */
export async function logEvent(event) {
  try {
    const data = await chrome.storage.local.get(EVENTS_KEY);
    const events = data[EVENTS_KEY] || [];
    events.push({ ...event, id: generateId() });

    // Keep last 500 events
    if (events.length > 500) events.splice(0, events.length - 500);

    await chrome.storage.local.set({ [EVENTS_KEY]: events });
  } catch (e) {
    console.warn('[Raksha] Failed to log event:', e);
  }
}

/**
 * Save a threat (blocked/flagged link).
 */
export async function saveThreat(threat) {
  try {
    const data = await chrome.storage.local.get(THREATS_KEY);
    const threats = data[THREATS_KEY] || [];
    threats.push({ ...threat, id: generateId() });

    if (threats.length > 200) threats.splice(0, threats.length - 200);

    await chrome.storage.local.set({ [THREATS_KEY]: threats });
  } catch (e) {
    console.warn('[Raksha] Failed to save threat:', e);
  }
}

/**
 * Save enrollment profile.
 */
export async function saveEnrollment(profile) {
  try {
    await chrome.storage.local.set({ [ENROLLMENT_KEY]: profile });
  } catch (e) {
    console.warn('[Raksha] Failed to save enrollment:', e);
  }
}

/**
 * Get recent events from local storage.
 */
export async function getRecentEvents(limit = 50) {
  const data = await chrome.storage.local.get(EVENTS_KEY);
  const events = data[EVENTS_KEY] || [];
  return events.slice(-limit);
}

/**
 * Get all threats from local storage.
 */
export async function getThreats(limit = 50) {
  const data = await chrome.storage.local.get(THREATS_KEY);
  const threats = data[THREATS_KEY] || [];
  return threats.slice(-limit);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
