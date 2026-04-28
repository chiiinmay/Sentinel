// Raksha AI -- Enrollment Script (Advanced Behavioral Fingerprint)
(() => {
  // 5 different sentences for diverse behavioral fingerprinting
  const ENROLLMENT_SENTENCES = [
    'the quick brown fox jumps over the lazy dog near the river bank',
    'security begins with strong passwords and careful browsing habits',
    'pack my box with five dozen liquor jugs before the storm arrives',
    'every morning she checked her email and verified each login attempt',
    'bright vixens jump and fly quickly over the wild dogs at sunset',
  ];

  const targetTextEl = document.getElementById('targetText');
  let currentTarget = ENROLLMENT_SENTENCES[0];
  targetTextEl.textContent = currentTarget;
  const typingArea = document.getElementById('typingArea');
  const progressFill = document.getElementById('progressFill');
  const attemptLabel = document.getElementById('attemptLabel');
  const progressPct = document.getElementById('progressPct');
  const matchFill = document.getElementById('matchFill');
  const matchLabel = document.getElementById('matchLabel');
  const wpmStat = document.getElementById('wpmStat');
  const dwellStat = document.getElementById('dwellStat');
  const flightStat = document.getElementById('flightStat');

  const REQUIRED_ATTEMPTS = 5;
  let currentAttempt = 0;
  const allSamples = [];

  // Per-attempt raw keystroke data
  let rawBatch = [];
  let keyDownTimes = {};
  let lastKeyUpTime = null;
  let dwellTimes = [];
  let flightTimes = [];
  let startTime = null;
  let charCount = 0;
  let backspaceCount = 0;

  typingArea.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (!startTime) startTime = performance.now();
    keyDownTimes[e.key] = performance.now();
    rawBatch.push({ key: e.key, code: e.code, type: 'down', time: performance.now() });
    if (e.key === 'Backspace' || e.key === 'Delete') backspaceCount++;
  });

  typingArea.addEventListener('keyup', (e) => {
    const now = performance.now();
    rawBatch.push({ key: e.key, code: e.code, type: 'up', time: now });

    if (keyDownTimes[e.key]) {
      dwellTimes.push(now - keyDownTimes[e.key]);
      delete keyDownTimes[e.key];
    }
    if (lastKeyUpTime !== null) {
      flightTimes.push(now - lastKeyUpTime);
    }
    lastKeyUpTime = now;
    charCount++;
    updateLiveStats();
    checkMatch();
  });

  function updateLiveStats() {
    const elapsed = (performance.now() - startTime) / 60000;
    const wpm = elapsed > 0 ? Math.round((charCount / 5) / elapsed) : 0;
    const avgDwell = dwellTimes.length > 0 ? Math.round(mean(dwellTimes)) : 0;
    const avgFlight = flightTimes.length > 0 ? Math.round(mean(flightTimes)) : 0;
    wpmStat.textContent = wpm;
    dwellStat.textContent = avgDwell;
    flightStat.textContent = avgFlight;
  }

  function checkMatch() {
    const typed = typingArea.value.trim();
    const similarity = computeSimilarity(typed, currentTarget);
    const pct = Math.round(similarity * 100);
    matchFill.style.width = pct + '%';
    matchLabel.textContent = pct + '% match';

    if (similarity >= 0.92) {
      completeSample();
    }
  }

  function completeSample() {
    const elapsed = (performance.now() - startTime) / 60000;
    const wpm = elapsed > 0 ? (charCount / 5) / elapsed : 0;

    // ── Build digraph timings ──
    const downs = rawBatch.filter(e => e.type === 'down').sort((a, b) => a.time - b.time);
    const allDigraphLatencies = [];
    for (let i = 1; i < downs.length; i++) {
      const gap = downs[i].time - downs[i - 1].time;
      if (gap > 0 && gap < 2000) allDigraphLatencies.push(gap);
    }

    // ── Flight times without long pauses ──
    const cleanFlights = flightTimes.filter(t => t > 0 && t < 2000);
    const pauses = cleanFlights.filter(t => t > 500);

    // ── Rhythm consistency (coefficient of variation) ──
    const rhythmCV = mean(cleanFlights) > 0 ? std(cleanFlights) / mean(cleanFlights) : 0;

    // ── Error rate ──
    const errorRate = charCount > 0 ? backspaceCount / charCount : 0;

    // ── Pause ratio ──
    const pauseRatio = cleanFlights.length > 0 ? pauses.length / cleanFlights.length : 0;

    // ── Dwell CV (pressure proxy) ──
    const dwellCV = mean(dwellTimes) > 0 ? std(dwellTimes) / mean(dwellTimes) : 0;

    allSamples.push({
      meanDwell: mean(dwellTimes),
      stdDwell: std(dwellTimes),
      meanFlight: mean(cleanFlights),
      stdFlight: std(cleanFlights),
      digraphMean: mean(allDigraphLatencies),
      digraphStd: std(allDigraphLatencies),
      wpm,
      rhythmCV,
      errorRate,
      pauseRatio,
      dwellCV,
    });

    currentAttempt++;
    const pct = Math.round((currentAttempt / REQUIRED_ATTEMPTS) * 100);
    progressFill.style.width = pct + '%';
    progressPct.textContent = pct + '%';

    if (currentAttempt < REQUIRED_ATTEMPTS) {
      attemptLabel.textContent = `Attempt ${currentAttempt + 1} of ${REQUIRED_ATTEMPTS}`;
      // Show the next sentence
      currentTarget = ENROLLMENT_SENTENCES[currentAttempt];
      targetTextEl.textContent = currentTarget;
      resetInput();
    } else {
      attemptLabel.textContent = 'All attempts complete!';
      showPassphraseStep();
    }
  }

  function resetInput() {
    typingArea.value = '';
    matchFill.style.width = '0%';
    matchLabel.textContent = '0% match';
    keyDownTimes = {};
    lastKeyUpTime = null;
    dwellTimes = [];
    flightTimes = [];
    rawBatch = [];
    startTime = null;
    charCount = 0;
    backspaceCount = 0;
    typingArea.focus();
  }

  function showPassphraseStep() {
    typingArea.disabled = true;
    document.getElementById('passphraseSection').style.display = 'block';
    document.getElementById('finishBtn').addEventListener('click', finishEnrollment);
  }

  async function finishEnrollment() {
    const pass = document.getElementById('passphraseInput').value;
    const confirm = document.getElementById('passphraseConfirm').value;
    const errEl = document.getElementById('passphraseError');

    if (pass.length < 6) { errEl.textContent = 'Passphrase must be at least 6 characters.'; return; }
    if (pass !== confirm) { errEl.textContent = 'Passphrases do not match.'; return; }

    // Build behavioral fingerprint: mean + std of each feature across all samples
    const profile = computeProfile(allSamples);

    await chrome.storage.local.set({
      enrollmentProfile: profile,
      enrolled: true,
      passphrase: pass,
    });

    chrome.runtime.sendMessage({ type: 'ENROLLMENT_COMPLETE' });

    document.getElementById('passphraseSection').style.display = 'none';
    document.querySelector('.input-section').style.display = 'none';
    document.querySelector('.stats-row').style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.querySelector('.progress-label').style.display = 'none';
    document.querySelector('.target-text').style.display = 'none';
    document.getElementById('successScreen').style.display = 'block';

    document.getElementById('closeBtn').addEventListener('click', () => { window.close(); });
  }

  function computeProfile(samples) {
    const keys = [
      'meanDwell', 'stdDwell', 'meanFlight', 'stdFlight',
      'digraphMean', 'digraphStd', 'wpm', 'rhythmCV',
      'errorRate', 'pauseRatio', 'dwellCV',
    ];
    const profile = {};
    for (const k of keys) {
      const vals = samples.map(s => s[k]).filter(v => v !== undefined && v !== null);
      profile[k] = { mean: mean(vals), std: std(vals) };
    }
    return profile;
  }

  function mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  function std(arr) {
    if (!arr || arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
  }
  function computeSimilarity(typed, target) {
    if (!typed || !target) return 0;
    const len = Math.max(typed.length, target.length);
    let matches = 0;
    for (let i = 0; i < Math.min(typed.length, target.length); i++) {
      if (typed[i] === target[i]) matches++;
    }
    return matches / len;
  }
})();
