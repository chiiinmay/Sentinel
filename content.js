// ─────────────────────────────────────────────
// Raksha AI — Content Script
// Injected into every page for keystroke capture
// and UI overlays (caution banner, lock redirect).
// ─────────────────────────────────────────────

(() => {
  'use strict';

  // ── Constants (duplicated here because content scripts can't use ES modules) ──
  const MSG = {
    KEYSTROKE_BATCH: 'KEYSTROKE_BATCH',
    LINK_CLICK: 'LINK_CLICK',
    SHOW_CAUTION_BANNER: 'SHOW_CAUTION_BANNER',
    FORCE_LOCK: 'FORCE_LOCK',
    CONTENT_SCAN: 'CONTENT_SCAN',
  };

  // ── Content-Level Page Scanner ────────────────
  // Runs after page loads — scans DOM for risky content
  const GAMBLING_KW = ['bet','betting','casino','poker','jackpot','slot','roulette','blackjack','gamble','sportsbook','odds','wager','1xbet','betway','bet365'];
  const PIRACY_KW = ['torrent','pirate','cracked','keygen','warez','free-movie','watch-free','123movies','putlocker','fmovies','yts','kickass','tamilrockers','movierulz','filmyzilla'];
  const ADULT_KW = ['porn','xxx','adult-content','nsfw','nude','escort'];
  const SCAM_KW = ['congratulations you won','claim your prize','you are the winner','click here to claim','limited time offer','act now','verify your account immediately'];

  function scanPageContent() {
    try {
      const bodyText = (document.body?.innerText || '').toLowerCase().slice(0, 10000); // limit scan
      const title = (document.title || '').toLowerCase();
      const text = bodyText + ' ' + title;

      const reasons = [];
      let contentRisk = 0;

      // Keyword scanning
      let gamblingHits = GAMBLING_KW.filter(kw => text.includes(kw)).length;
      if (gamblingHits >= 3) { contentRisk += 40; reasons.push('Gambling content detected'); }
      else if (gamblingHits >= 1) { contentRisk += 15; reasons.push('Possible gambling content'); }

      let piracyHits = PIRACY_KW.filter(kw => text.includes(kw)).length;
      if (piracyHits >= 3) { contentRisk += 40; reasons.push('Pirated content detected'); }
      else if (piracyHits >= 1) { contentRisk += 15; reasons.push('Possible piracy content'); }

      let adultHits = ADULT_KW.filter(kw => text.includes(kw)).length;
      if (adultHits >= 1) { contentRisk += 35; reasons.push('Adult content detected'); }

      let scamHits = SCAM_KW.filter(kw => text.includes(kw)).length;
      if (scamHits >= 1) { contentRisk += 45; reasons.push('Scam/phishing content on page'); }

      // Iframe count (many iframes = ad-heavy / suspicious)
      const iframes = document.querySelectorAll('iframe');
      if (iframes.length > 5) { contentRisk += 20; reasons.push(`Excessive iframes (${iframes.length})`); }
      else if (iframes.length > 2) { contentRisk += 8; reasons.push(`Multiple iframes (${iframes.length})`); }

      // Hidden iframes (very suspicious)
      const hiddenIframes = [...iframes].filter(f => {
        const s = getComputedStyle(f);
        return s.display === 'none' || s.visibility === 'hidden' || f.width === '0' || f.height === '0';
      });
      if (hiddenIframes.length > 0) { contentRisk += 25; reasons.push(`Hidden iframes detected (${hiddenIframes.length})`); }

      // Send results to background if risky
      if (contentRisk > 0) {
        chrome.runtime.sendMessage({
          type: MSG.CONTENT_SCAN,
          data: { contentRisk, reasons, url: window.location.href },
        }).catch(() => {});
      }
    } catch { /* silently fail */ }
  }

  // Run scan after page fully loads
  if (document.readyState === 'complete') {
    setTimeout(scanPageContent, 1500);
  } else {
    window.addEventListener('load', () => setTimeout(scanPageContent, 1500));
  }

  // ── Keystroke Collection ──────────────────────
  const keystrokeBuffer = [];
  const keyTimestamps = {}; // track keydown times for dwell calculation

  document.addEventListener('keydown', (e) => {
    if (e.repeat) return; // ignore held keys
    keyTimestamps[e.key] = performance.now();
    keystrokeBuffer.push({
      key: e.key,
      code: e.code,
      type: 'down',
      time: performance.now(),
      timestamp: Date.now(),
    });
  }, true);

  document.addEventListener('keyup', (e) => {
    keystrokeBuffer.push({
      key: e.key,
      code: e.code,
      type: 'up',
      time: performance.now(),
      timestamp: Date.now(),
    });
  }, true);

  // ── Batch send every 2 seconds ────────────────
  setInterval(() => {
    if (keystrokeBuffer.length < 2) return; // need at least a couple keystrokes

    const batch = keystrokeBuffer.splice(0, keystrokeBuffer.length);
    try {
      chrome.runtime.sendMessage({
        type: MSG.KEYSTROKE_BATCH,
        data: batch,
      });
    } catch {
      // Extension context invalidated — ignore
    }
  }, 2000);

  // ── Message Listener ──────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case MSG.SHOW_CAUTION_BANNER:
        showCautionBanner(message.data);
        break;
      case MSG.FORCE_LOCK:
        window.location.href = chrome.runtime.getURL('lock/lock.html');
        break;
    }
  });

  // ── Smart Banner (Safe vs Caution) ───────────────
  function showCautionBanner(data) {
    const existing = document.getElementById('raksha-caution-banner');
    if (existing) existing.remove();

    const isLowRisk = data.riskScore <= 30;
    const icon = isLowRisk ? '&#9989;' : '&#9888;&#65039;';
    const title = isLowRisk ? 'Raksha AI - Safe' : 'Raksha AI - Caution';
    const titleColor = isLowRisk ? '#24e498' : '#f5a623';
    const borderColor = isLowRisk ? '#24e498' : '#f5a623';
    const bgGradient = isLowRisk
      ? 'linear-gradient(135deg, #0a1a10 0%, #0a2a15 100%)'
      : 'linear-gradient(135deg, #1a1a1a 0%, #2a1a00 100%)';
    const shadowColor = isLowRisk ? 'rgba(36,228,152,0.3)' : 'rgba(245,166,35,0.3)';
    const message = isLowRisk
      ? 'This site appears safe to use. No major threats detected.'
      : `This page has a risk score of ${data.riskScore}/100. ${data.reasons && data.reasons.length > 0 ? 'Reason: ' + data.reasons.join(', ') : ''}`;
    const autoDismiss = isLowRisk ? 5000 : 10000;

    const banner = document.createElement('div');
    banner.id = 'raksha-caution-banner';
    banner.innerHTML = `
      <div style="
        position: fixed; top: 0; left: 0; right: 0;
        z-index: 2147483647;
        background: ${bgGradient};
        border-bottom: 2px solid ${borderColor};
        padding: 12px 20px;
        display: flex; align-items: center; justify-content: space-between;
        font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
        color: #ffffff; font-size: 14px;
        box-shadow: 0 4px 20px ${shadowColor};
        animation: raksha-slide-down 0.3s ease-out;
      ">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 18px;">${icon}</span>
          <span>
            <strong style="color: ${titleColor};">${title}</strong>
            <span style="opacity: 0.8; margin-left: 8px;">${message}</span>
          </span>
        </div>
        <button id="raksha-dismiss-banner" style="
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff; padding: 4px 12px;
          border-radius: 6px; cursor: pointer; font-size: 12px;
        ">Dismiss</button>
      </div>
      <style>
        @keyframes raksha-slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      </style>
    `;

    document.documentElement.appendChild(banner);

    document.getElementById('raksha-dismiss-banner')?.addEventListener('click', () => {
      banner.style.animation = 'raksha-slide-down 0.2s ease-in reverse forwards';
      setTimeout(() => banner.remove(), 200);
    });

    setTimeout(() => {
      if (document.getElementById('raksha-caution-banner')) {
        banner.style.animation = 'raksha-slide-down 0.2s ease-in reverse forwards';
        setTimeout(() => banner.remove(), 200);
      }
    }, autoDismiss);
  }
})();
