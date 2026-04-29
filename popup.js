// Raksha AI — Popup Script
(async () => {
  const CIRCUMFERENCE = 2 * Math.PI * 52; // matches SVG circle r=52

  const gaugeFill = document.getElementById('gaugeFill');
  const gaugeValue = document.getElementById('gaugeValue');
  const statusDot = document.getElementById('statusDot');
  const statusTitle = document.getElementById('statusTitle');
  const statusSub = document.getElementById('statusSub');
  const linksScanned = document.getElementById('linksScanned');
  const threatsBlocked = document.getElementById('threatsBlocked');

  function setGauge(score) {
    const pct = score / 100;
    const offset = CIRCUMFERENCE * (1 - pct);
    gaugeFill.style.strokeDashoffset = offset;
    gaugeValue.textContent = score;

    if (score >= 90) {
      gaugeFill.style.stroke = '#24e498';
      gaugeValue.style.color = '#24e498';
    } else if (score >= 60) {
      gaugeFill.style.stroke = '#f5a623';
      gaugeValue.style.color = '#f5a623';
    } else {
      gaugeFill.style.stroke = '#ff3b5c';
      gaugeValue.style.color = '#ff3b5c';
    }
  }

  function setStatus(confidence, enrolled, locked) {
    if (!enrolled) {
      statusDot.style.background = '#888';
      statusDot.style.boxShadow = '0 0 8px rgba(136,136,136,0.6)';
      statusTitle.textContent = 'Not Enrolled';
      statusSub.textContent = 'Complete enrollment to start';
      return;
    }
    if (locked) {
      statusDot.style.background = '#ff3b5c';
      statusDot.style.boxShadow = '0 0 8px rgba(255,59,92,0.6)';
      statusTitle.textContent = 'Session Locked';
      statusSub.textContent = 'Re-authenticate required';
      return;
    }
    if (confidence >= 90) {
      statusDot.style.background = '#24e498';
      statusDot.style.boxShadow = '0 0 8px rgba(36,228,152,0.6)';
      statusTitle.textContent = 'Verified — You';
      statusSub.textContent = 'Identity confirmed';
    } else if (confidence >= 60) {
      statusDot.style.background = '#f5a623';
      statusDot.style.boxShadow = '0 0 8px rgba(245,166,35,0.6)';
      statusTitle.textContent = 'Caution';
      statusSub.textContent = 'Slight anomaly detected';
    } else {
      statusDot.style.background = '#ff3b5c';
      statusDot.style.boxShadow = '0 0 8px rgba(255,59,92,0.6)';
      statusTitle.textContent = 'Possible Imposter';
      statusSub.textContent = 'Typing pattern mismatch';
    }
  }

  // Fetch current status from background
  try {
    const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    if (status) {
      setGauge(status.typingConfidence ?? 0);
      setStatus(status.typingConfidence, status.isEnrolled, status.isLocked);

      const events = status.recentEvents || [];
      const links = events.filter(e => e.type === 'link_check');
      const threats = events.filter(e => e.action === 'BLOCK_WARN' || e.action === 'BLOCK_LOCK');
      linksScanned.textContent = links.length;
      threatsBlocked.textContent = threats.length;
    }
  } catch {
    gaugeValue.textContent = '--';
    statusTitle.textContent = 'Offline';
    statusSub.textContent = 'Extension not responding';
  }

  // Button handlers
  document.getElementById('dashboardBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173' });
  });

  document.getElementById('enrollBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('enrollment/enroll.html') });
  });
})();
