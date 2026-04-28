// ─────────────────────────────────────────────
// Raksha AI — Advanced Website Risk Engine
// Multi-layer: Heuristics + Content Categories +
// Domain Intel + Free APIs + Region Awareness
// ─────────────────────────────────────────────

import { clamp, STORAGE_KEYS } from './utils.js';

// ── SAFE DOMAINS (never flag) ───────────────
const SAFE_DOMAINS = [
  'google.com','google.co.in','google.co.uk','googleapis.com','gstatic.com',
  'youtube.com','youtu.be','github.com','github.io','githubusercontent.com',
  'gitlab.com','bitbucket.org','stackoverflow.com','stackexchange.com',
  'wikipedia.org','wikimedia.org','amazon.com','amazon.in','aws.amazon.com',
  'microsoft.com','live.com','office.com','outlook.com','apple.com','icloud.com',
  'mozilla.org','reddit.com','twitter.com','x.com','facebook.com','instagram.com',
  'linkedin.com','netflix.com','paypal.com','whatsapp.com','telegram.org',
  'discord.com','twitch.tv','steam.com','steampowered.com','spotify.com',
  'cloudflare.com','vercel.app','netlify.app','npmjs.com','medium.com',
  'notion.so','figma.com','canva.com','zoom.us','slack.com','dropbox.com',
  'drive.google.com','docs.google.com','ebay.com','walmart.com',
  'nytimes.com','bbc.com','cnn.com','reuters.com',
  'localhost','127.0.0.1',
];

// ── HIGH RISK TLDs ──────────────────────────
const HIGH_RISK_TLDS = [
  '.tk','.ml','.ga','.cf','.gq','.buzz','.click','.loan','.work','.top',
  '.racing','.win','.bid','.stream','.download','.accountant','.date',
  '.faith','.party','.review','.science','.trade','.webcam','.cricket','.men',
];
const MED_RISK_TLDS = [
  '.xyz','.club','.online','.site','.icu','.vip','.fun','.space',
  '.monster','.pw','.cc','.ws','.info','.biz','.life','.live','.store','.tech',
];

// ── PHISHING KEYWORDS ───────────────────────
const PHISH_KEYWORDS = [
  'login','signin','sign-in','verify','verification','account','secure',
  'security','update','confirm','suspend','unlock','password','credential',
  'banking','wallet','invoice','payment','billing','recover','restore',
  'validate','authenticate','ssn','tax-refund','reward','prize','winner',
  'congratulations','claim','limited-time','urgent',
];

// ── BRAND IMPERSONATION ─────────────────────
const BRANDS = [
  'paypal','appleid','icloud','microsoft','outlook','netflix','amazon',
  'facebook','instagram','whatsapp','binance','coinbase','metamask',
  'chase','wellsfargo','citibank','steam','epicgames','discord',
  'spotify','dropbox','google','gmail','yahoo','linkedin','twitter',
  'tiktok','snapchat','uber','ebay','hdfc','sbi','icici','axis',
];

// ── GAMBLING / BETTING KEYWORDS ─────────────
const GAMBLING_KEYWORDS = [
  'bet','betting','casino','poker','jackpot','slot','slots','roulette',
  'blackjack','gamble','gambling','sportsbook','odds','wager','bookie',
  '1xbet','betway','bet365','22bet','mostbet','parimatch','1win',
  'dafabet','rajbet','fairplay','lottoland','casumo','betfair',
];

// ── PIRACY KEYWORDS ─────────────────────────
const PIRACY_KEYWORDS = [
  'torrent','pirate','piracy','cracked','crack','keygen','warez',
  'free-movie','free-download','watch-online','watch-free','123movies',
  'putlocker','fmovies','yts','rarbg','1337x','kickass','tamilrockers',
  'movierulz','filmyzilla','mp4moviez','bolly4u','worldfree4u',
  'khatrimaza','downloadhub','9xmovies','moviesflix',
];

// ── ADULT / NSFW KEYWORDS ───────────────────
const ADULT_KEYWORDS = [
  'porn','xxx','adult','nsfw','sex','nude','naked','cam-girl',
  'escort','onlyfans-leak','hentai',
];

// ── URL SHORTENERS ──────────────────────────
const SHORTENERS = [
  'bit.ly','tinyurl.com','t.co','goo.gl','ow.ly','is.gd','buff.ly',
  'short.link','rb.gy','cutt.ly','shorturl.at','tiny.cc',
];

/**
 * MAIN: Full multi-layer risk assessment.
 */
export async function checkUrl(urlStr) {
  try {
    // Layer 1: Local heuristics (instant)
    const result = localHeuristics(urlStr);

    // Layer 2: Content category detection
    const category = detectCategory(urlStr);
    if (category.score > 0) {
      result.riskScore += category.score;
      result.reasons.push(...category.reasons);
      result.category = category.name;
    }

    // Layer 3: Region-aware boosting
    const regionBoost = regionAwareness(category.name);
    if (regionBoost > 0) {
      result.riskScore += regionBoost;
      result.reasons.push('Higher risk in your region');
    }

    // Layer 4: Domain intelligence
    const domainIntel = analyzeDomain(urlStr);
    result.riskScore += domainIntel.score;
    result.reasons.push(...domainIntel.reasons);

    // Layer 5: Free API checks (async)
    const apiResults = await checkAPIs(urlStr, result.riskScore);
    if (apiResults.flagged) {
      result.riskScore = Math.max(result.riskScore, apiResults.score);
      result.reasons.push(...apiResults.reasons);
      result.source = apiResults.source;
    }

    result.riskScore = clamp(result.riskScore);
    result.riskLevel = getRiskLevel(result.riskScore);
    return result;
  } catch {
    return { riskScore: 0, riskLevel: 'safe', reasons: [], source: 'error', category: 'unknown' };
  }
}

function getRiskLevel(score) {
  if (score >= 60) return 'dangerous';
  if (score >= 35) return 'suspicious';
  if (score >= 15) return 'caution';
  return 'safe';
}

function isSafe(hostname) {
  return SAFE_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
}

// ═══════════════════════════════════════════
// LAYER 1: LOCAL HEURISTICS
// ═══════════════════════════════════════════
function localHeuristics(urlStr) {
  const reasons = [];
  let score = 0;
  let url;
  try { url = new URL(urlStr); } catch {
    return { riskScore: 0, reasons: [], source: 'local' };
  }

  const hostname = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  const search = url.search.toLowerCase();
  const full = url.href.toLowerCase();

  if (isSafe(hostname)) return { riskScore: 0, reasons: [], source: 'local' };

  const parts = hostname.split('.');

  // 1. IP as hostname
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    score += 50; reasons.push('IP address as hostname');
  }
  // 2. High-risk TLD
  if (HIGH_RISK_TLDS.some(t => hostname.endsWith(t))) {
    score += 35; reasons.push('High-risk TLD');
  } else if (MED_RISK_TLDS.some(t => hostname.endsWith(t))) {
    score += 18; reasons.push('Suspicious TLD');
  }
  // 3. Subdomains
  if (parts.length > 3) {
    score += 12 + (parts.length - 3) * 8;
    reasons.push('Excessive subdomains');
  }
  // 4. Phishing keywords
  let kwHits = 0;
  for (const kw of PHISH_KEYWORDS) {
    if (path.includes(kw) || hostname.includes(kw) || search.includes(kw)) kwHits++;
  }
  if (kwHits > 0) {
    score += 10 + kwHits * 10;
    reasons.push(`Phishing keywords (${kwHits})`);
  }
  // 5. Brand impersonation
  for (const b of BRANDS) {
    if (hostname.includes(b)) { score += 45; reasons.push(`Brand impersonation: ${b}`); break; }
  }
  // 6. Hyphens
  const hyphens = (hostname.match(/-/g) || []).length;
  if (hyphens >= 2) { score += 10 + hyphens * 5; reasons.push('Excessive hyphens'); }
  // 7. Long URL
  if (full.length > 150) { score += 15; reasons.push('Very long URL'); }
  // 8. Punycode
  if (hostname.startsWith('xn--')) { score += 35; reasons.push('Punycode homograph'); }
  // 9. Dangerous scheme
  if (['data:', 'javascript:', 'blob:'].includes(url.protocol)) {
    score += 60; reasons.push('Dangerous URI scheme');
  }
  // 10. No HTTPS
  if (url.protocol === 'http:' && !hostname.includes('localhost')) {
    score += 15; reasons.push('No HTTPS');
  }
  // 11. @ sign
  if (url.href.includes('@')) { score += 30; reasons.push('@ obfuscation'); }
  // 12. Dangerous downloads
  const dangerExts = ['.exe','.scr','.bat','.cmd','.msi','.js','.vbs','.ps1','.jar','.apk'];
  if (dangerExts.some(e => path.endsWith(e))) { score += 35; reasons.push('Dangerous file download'); }
  // 13. URL shortener
  if (SHORTENERS.some(s => hostname === s || hostname.endsWith('.' + s))) {
    score += 25; reasons.push('URL shortener');
  }
  // 14. Random domain
  const dom = parts.length >= 2 ? parts[parts.length - 2] : '';
  if (dom.length > 6) {
    const vowelRatio = (dom.match(/[aeiou]/gi) || []).length / dom.length;
    if (vowelRatio < 0.15) { score += 20; reasons.push('Random-looking domain'); }
    const digitRatio = (dom.match(/\d/g) || []).length / dom.length;
    if (digitRatio > 0.4) { score += 18; reasons.push('Excessive numbers in domain'); }
  }
  // 15. Non-standard port
  if (url.port && !['80','443',''].includes(url.port)) {
    score += 15; reasons.push('Non-standard port: ' + url.port);
  }
  // 16. Redirect params
  const redirParams = ['redirect','return_url','next','callback','redir','goto','dest'];
  if (redirParams.some(p => search.includes(p + '='))) {
    score += 12; reasons.push('Open redirect parameter');
  }

  return { riskScore: score, reasons, source: 'local' };
}

// ═══════════════════════════════════════════
// LAYER 2: CONTENT CATEGORY DETECTION
// ═══════════════════════════════════════════
function detectCategory(urlStr) {
  const lower = urlStr.toLowerCase();
  // Gambling/Betting
  let gamblingHits = 0;
  for (const kw of GAMBLING_KEYWORDS) {
    if (lower.includes(kw)) gamblingHits++;
  }
  if (gamblingHits >= 2) return { name: 'gambling', score: 40, reasons: ['⚠️ Gambling/Betting site detected'] };
  if (gamblingHits === 1) return { name: 'gambling', score: 25, reasons: ['⚠️ Possible gambling site'] };

  // Piracy
  let piracyHits = 0;
  for (const kw of PIRACY_KEYWORDS) {
    if (lower.includes(kw)) piracyHits++;
  }
  if (piracyHits >= 2) return { name: 'piracy', score: 40, reasons: ['⚠️ Pirated content site detected'] };
  if (piracyHits === 1) return { name: 'piracy', score: 20, reasons: ['⚠️ Possible piracy site'] };

  // Adult
  let adultHits = 0;
  for (const kw of ADULT_KEYWORDS) {
    if (lower.includes(kw)) adultHits++;
  }
  if (adultHits >= 1) return { name: 'adult', score: 30, reasons: ['⚠️ Adult content detected'] };

  return { name: 'general', score: 0, reasons: [] };
}

// ═══════════════════════════════════════════
// LAYER 3: REGION AWARENESS
// ═══════════════════════════════════════════
function regionAwareness(category) {
  // Detect if user is in India via timezone/language
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const lang = navigator?.language || '';
  const isIndia = tz.includes('Kolkata') || tz.includes('Calcutta') || lang.startsWith('hi') || lang.includes('IN');

  if (isIndia && (category === 'gambling' || category === 'piracy')) {
    return 20; // Extra risk boost — gambling/piracy illegal in many Indian states
  }
  return 0;
}

// ═══════════════════════════════════════════
// LAYER 4: DOMAIN INTELLIGENCE
// ═══════════════════════════════════════════
function analyzeDomain(urlStr) {
  let url;
  try { url = new URL(urlStr); } catch { return { score: 0, reasons: [] }; }

  const hostname = url.hostname.toLowerCase();
  if (isSafe(hostname)) return { score: 0, reasons: [] };

  const reasons = [];
  let score = 0;
  const parts = hostname.split('.');
  const domain = parts.length >= 2 ? parts[parts.length - 2] : '';

  // 1. Very short domain (often throwaway: ab.tk)
  if (domain.length <= 2 && !['co','ac','go','or','ne'].includes(domain)) {
    score += 15; reasons.push('Very short domain name');
  }

  // 2. Domain mimics a brand with typos (typosquatting)
  const typoTargets = ['google','facebook','amazon','microsoft','paypal','netflix','apple'];
  for (const brand of typoTargets) {
    if (domain !== brand && domain.length >= brand.length - 1 && domain.length <= brand.length + 2) {
      const dist = levenshtein(domain, brand);
      if (dist === 1 || dist === 2) {
        score += 40;
        reasons.push(`Possible typosquatting: "${domain}" looks like "${brand}"`);
        break;
      }
    }
  }

  // 3. Mixed scripts / unusual chars
  if (/[0-9].*[a-z].*[0-9]/.test(domain) || /[a-z].*[0-9].*[a-z].*[0-9]/.test(domain)) {
    score += 10; reasons.push('Mixed letters and numbers');
  }

  return { score, reasons };
}

// Levenshtein distance for typosquatting
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] :
        1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

// ═══════════════════════════════════════════
// LAYER 5: FREE API CHECKS
// ═══════════════════════════════════════════
async function checkAPIs(urlStr, currentScore) {
  const results = { flagged: false, score: currentScore, reasons: [], source: 'local' };

  // Only call APIs if we don't already have a very high or very low score
  if (currentScore > 85 || currentScore < 5) return results;

  // API 1: URLhaus (free, no key)
  try {
    const abuse = await fetchWithTimeout('https://urlhaus-api.abuse.ch/v1/url/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'url=' + encodeURIComponent(urlStr),
    }, 3000);
    if (abuse.ok) {
      const data = await abuse.json();
      if (data.query_status === 'ok' && data.threat) {
        results.flagged = true;
        results.score = Math.max(results.score, 95);
        results.reasons.push('🚫 URLhaus: ' + data.threat);
        results.source = 'urlhaus';
      }
    }
  } catch { /* timeout or network error */ }

  // API 2: Google Safe Browsing (if key configured)
  try {
    const sbData = await chrome.storage.local.get(STORAGE_KEYS.SAFE_BROWSING_KEY);
    const apiKey = sbData[STORAGE_KEYS.SAFE_BROWSING_KEY];
    if (apiKey) {
      const sb = await fetchWithTimeout(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: { clientId: 'raksha-ai', clientVersion: '1.0.0' },
            threatInfo: {
              threatTypes: ['MALWARE','SOCIAL_ENGINEERING','UNWANTED_SOFTWARE','POTENTIALLY_HARMFUL_APPLICATION'],
              platformTypes: ['ANY_PLATFORM'],
              threatEntryTypes: ['URL'],
              threatEntries: [{ url: urlStr }],
            },
          }),
        }, 3000
      );
      if (sb.ok) {
        const data = await sb.json();
        if (data.matches?.length > 0) {
          results.flagged = true;
          results.score = Math.max(results.score, 95);
          results.reasons.push('🚫 Google Safe Browsing: ' + data.matches[0].threatType);
          results.source = 'google';
        }
      }
    }
  } catch { /* skip */ }

  // API 3: PhishTank (check via their community feed)
  try {
    const hostname = new URL(urlStr).hostname;
    const ptResp = await fetchWithTimeout(
      `https://checkurl.phishtank.com/checkurl/?url=${encodeURIComponent(urlStr)}&format=json`,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      3000
    );
    if (ptResp.ok) {
      const ptData = await ptResp.json();
      if (ptData.results?.in_database && ptData.results?.valid) {
        results.flagged = true;
        results.score = Math.max(results.score, 95);
        results.reasons.push('🚫 PhishTank: Confirmed phishing');
        results.source = 'phishtank';
      }
    }
  } catch { /* skip */ }

  // If ANY API flagged it, it's definitely unsafe
  if (results.flagged) {
    results.score = Math.max(results.score, 90);
  }

  return results;
}

// Fetch with timeout helper
function fetchWithTimeout(url, options, ms) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}
