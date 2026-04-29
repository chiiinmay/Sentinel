// ─────────────────────────────────────────────
// Raksha AI — Background Service Worker
// ─────────────────────────────────────────────

import { MSG, ACTION, STORAGE_KEYS, CONFIDENCE, clamp } from './lib/utils.js';
import { extractFeatures, predictConfidence } from './lib/keystroke-model.js';
import { checkUrl } from './lib/phishing-check.js';
import { decide } from './lib/decision-engine.js';
import { logEvent, saveThreat, init as initStorage } from './lib/firebase-client.js';

// ── In-memory state ────────────────────────────
let typingConfidence = 100; // Start with full trust until proven otherwise
let isEnrolled = false;
let isLocked = false;
const recentEvents = [];

// ── Initialization ─────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // First install — check enrollment
    const data = await chrome.storage.local.get(STORAGE_KEYS.ENROLLED);
    if (!data[STORAGE_KEYS.ENROLLED]) {
      chrome.tabs.create({
        url: chrome.runtime.getURL('enrollment/enroll.html'),
      });
    }
  }
  updateBadge();
});

// On startup, check enrollment status
chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get(STORAGE_KEYS.ENROLLED);
  isEnrolled = !!data[STORAGE_KEYS.ENROLLED];
  initStorage();
  updateBadge();
});

// Also init on service worker load
(async () => {
  const data = await chrome.storage.local.get(STORAGE_KEYS.ENROLLED);
  isEnrolled = !!data[STORAGE_KEYS.ENROLLED];
  initStorage();
  updateBadge();
})();

// ── Message Router ─────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // keep channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case MSG.KEYSTROKE_BATCH:
      return handleKeystrokeBatch(message.data);

    case MSG.ENROLLMENT_COMPLETE:
      isEnrolled = true;
      typingConfidence = 100;
      updateBadge();
      logEvent({ type: 'enrollment', timestamp: Date.now() });
      return { success: true };

    case MSG.RE_AUTH_RESULT:
      return handleReAuth(message.data);

    case MSG.GET_STATUS:
      return {
        typingConfidence,
        isEnrolled,
        isLocked,
        recentEvents: recentEvents.slice(-20),
      };

    case 'CONTENT_SCAN':
      return handleContentScan(message.data, sender);

    default:
      return { error: 'Unknown message type' };
  }
}

// ── Content Scan Handler ───────────────────────
async function handleContentScan(data, sender) {
  const { contentRisk, reasons, url } = data;
  const tabId = sender?.tab?.id;

  const event = {
    type: 'content_scan',
    url,
    contentRisk,
    reasons,
    timestamp: Date.now(),
  };
  recentEvents.push(event);
  if (recentEvents.length > 100) recentEvents.shift();
  logEvent(event);

  if (!tabId) return { handled: false };

  // Block if content risk is very high (50+)
  if (contentRisk >= 50) {
    saveThreat(event);
    chrome.tabs.update(tabId, {
      url: chrome.runtime.getURL(
        `blocked/blocked.html?url=${encodeURIComponent(url)}&risk=${contentRisk}&reasons=${encodeURIComponent(reasons.join(', '))}`
      ),
    });
    return { handled: true, action: 'blocked' };
  }

  // Show caution banner if moderate (15+)
  if (contentRisk >= 15) {
    chrome.tabs.sendMessage(tabId, {
      type: MSG.SHOW_CAUTION_BANNER,
      data: { url, riskScore: contentRisk, reasons },
    }).catch(() => {});
    return { handled: true, action: 'caution' };
  }

  return { handled: false };
}

// ── Keystroke Processing ───────────────────────
async function handleKeystrokeBatch(rawBatch) {
  if (!isEnrolled) return { confidence: 100 };

  const features = extractFeatures(rawBatch);
  if (!features) return { confidence: typingConfidence };

  const newConfidence = await predictConfidence(features);
  // ASYMMETRIC smoothing: drops are moderate, recovery is gradual
  // If new score is LOWER → blend gently (60% new, 40% old) to avoid overreacting
  // If new score is HIGHER → recover at moderate pace (50% new, 50% old)
  if (newConfidence < typingConfidence) {
    typingConfidence = clamp(Math.round(typingConfidence * 0.4 + newConfidence * 0.6));
  } else {
    typingConfidence = clamp(Math.round(typingConfidence * 0.5 + newConfidence * 0.5));
  }

  updateBadge();

  const event = {
    type: 'keystroke_check',
    confidence: typingConfidence,
    timestamp: Date.now(),
  };
  recentEvents.push(event);
  if (recentEvents.length > 100) recentEvents.shift();

  logEvent(event);

  // Only lock if confidence drops critically low (well below normal variance)
  if (typingConfidence < 40) {
    isLocked = true;
    broadcastLock();
  }

  return { confidence: typingConfidence };
}

// ── Link Interception ──────────────────────────
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only intercept top-level frame navigations
  if (details.frameId !== 0) return;

  // Don't intercept our own extension pages
  if (details.url.startsWith('chrome-extension://')) return;
  if (details.url.startsWith('chrome://')) return;
  if (details.url.startsWith('about:')) return;

  const urlResult = await checkUrl(details.url);
  const action = decide(typingConfidence, urlResult.riskScore);

  const event = {
    type: 'link_check',
    url: details.url,
    riskScore: urlResult.riskScore,
    reasons: urlResult.reasons,
    source: urlResult.source,
    typingConfidence,
    action,
    timestamp: Date.now(),
  };
  recentEvents.push(event);
  if (recentEvents.length > 100) recentEvents.shift();

  logEvent(event);

  switch (action) {
    case ACTION.ALLOW:
      // Do nothing — let navigation proceed
      break;

    case ACTION.CAUTION:
      // Let navigation proceed but inject a caution banner
      chrome.tabs.sendMessage(details.tabId, {
        type: MSG.SHOW_CAUTION_BANNER,
        data: {
          url: details.url,
          riskScore: urlResult.riskScore,
          reasons: urlResult.reasons,
        },
      }).catch(() => {}); // tab may not have content script yet
      break;

    case ACTION.BLOCK_WARN:
      saveThreat(event);
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL(
          `blocked/blocked.html?url=${encodeURIComponent(details.url)}&risk=${urlResult.riskScore}&reasons=${encodeURIComponent(urlResult.reasons.join(', '))}`
        ),
      });
      break;

    case ACTION.BLOCK_LOCK:
      isLocked = true;
      saveThreat(event);
      chrome.tabs.update(details.tabId, {
        url: chrome.runtime.getURL('lock/lock.html'),
      });
      break;
  }
});

// ── Re-Authentication ──────────────────────────
async function handleReAuth(data) {
  if (data.success) {
    isLocked = false;
    typingConfidence = 85; // Restore to medium-high after re-auth
    updateBadge();
    logEvent({ type: 're_auth_success', timestamp: Date.now() });
    return { unlocked: true };
  } else {
    logEvent({ type: 're_auth_fail', timestamp: Date.now() });
    return { unlocked: false };
  }
}

// ── Badge Management ───────────────────────────
function updateBadge() {
  const score = typingConfidence;
  let color, text;

  if (!isEnrolled) {
    color = '#888888';
    text = '?';
  } else if (isLocked) {
    color = '#ff3b5c';
    text = '🔒';
  } else if (score >= CONFIDENCE.HIGH) {
    color = '#24e498';
    text = String(score);
  } else if (score >= CONFIDENCE.MEDIUM) {
    color = '#f5a623';
    text = String(score);
  } else {
    color = '#ff3b5c';
    text = String(score);
  }

  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeTextColor({ color: '#ffffff' });
}

// ── Broadcast lock to all tabs ─────────────────
function broadcastLock() {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { type: MSG.FORCE_LOCK }).catch(() => {});
    }
  });
}
