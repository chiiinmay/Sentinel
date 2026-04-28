// Raksha AI — Blocked Page Script
(() => {
  const params = new URLSearchParams(window.location.search);
  const url = params.get('url') || 'Unknown';
  const risk = parseInt(params.get('risk')) || 0;
  const reasons = params.get('reasons') || 'Suspicious content detected';

  document.getElementById('blockedUrl').textContent = url;
  document.getElementById('riskScore').textContent = risk + '/100';
  document.getElementById('reasons').textContent = reasons;

  // Show risk level label
  const levelEl = document.getElementById('riskLevel');
  if (levelEl) {
    if (risk >= 70) {
      levelEl.textContent = '🔴 DANGEROUS';
      levelEl.style.color = '#ff3b5c';
    } else if (risk >= 40) {
      levelEl.textContent = '🟡 SUSPICIOUS';
      levelEl.style.color = '#f5a623';
    } else {
      levelEl.textContent = '🟠 CAUTION';
      levelEl.style.color = '#f5a623';
    }
  }

  document.getElementById('goBackBtn').addEventListener('click', () => {
    history.back();
  });

  document.getElementById('proceedBtn').addEventListener('click', () => {
    if (confirm('⚠️ WARNING: This website was flagged as dangerous by Raksha AI.\n\nRisk Score: ' + risk + '/100\nReason: ' + reasons + '\n\nAre you ABSOLUTELY sure you want to proceed?')) {
      window.location.href = url;
    }
  });
})();
