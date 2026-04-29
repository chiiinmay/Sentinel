// Raksha AI — Lock Screen Script
(() => {
  const input = document.getElementById('passphraseInput');
  const unlockBtn = document.getElementById('unlockBtn');
  const errorMsg = document.getElementById('errorMsg');
  const attemptText = document.getElementById('attemptText');
  const lockIcon = document.getElementById('lockIcon');

  const MAX_ATTEMPTS = 5;
  let attempts = 0;

  input.focus();

  unlockBtn.addEventListener('click', tryUnlock);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryUnlock();
  });

  async function tryUnlock() {
    const typed = input.value;
    if (!typed) {
      errorMsg.textContent = 'Please enter your passphrase.';
      return;
    }

    const data = await chrome.storage.local.get('passphrase');
    const stored = data.passphrase;

    if (typed === stored) {
      // Success!
      errorMsg.textContent = '';
      lockIcon.textContent = '🔓';
      lockIcon.classList.add('success');
      document.querySelector('h1').textContent = 'Unlocked!';
      document.querySelector('h1').style.color = '#24e498';
      document.querySelector('.subtitle').textContent = 'Identity verified. Resuming session...';

      chrome.runtime.sendMessage({
        type: 'RE_AUTH_RESULT',
        data: { success: true },
      });

      setTimeout(() => {
        history.back();
      }, 1500);
    } else {
      attempts++;
      input.value = '';
      input.focus();

      if (attempts >= MAX_ATTEMPTS) {
        errorMsg.textContent = 'Too many failed attempts. Close this tab and try again.';
        unlockBtn.disabled = true;
        unlockBtn.style.opacity = '0.3';
        input.disabled = true;
      } else {
        errorMsg.textContent = `Incorrect passphrase. ${MAX_ATTEMPTS - attempts} attempts remaining.`;
        attemptText.textContent = `Attempt ${attempts + 1} of ${MAX_ATTEMPTS}`;
        // Shake animation
        input.style.animation = 'none';
        input.offsetHeight; // force reflow
        input.style.animation = 'shake 0.4s ease';
      }

      chrome.runtime.sendMessage({
        type: 'RE_AUTH_RESULT',
        data: { success: false },
      });
    }
  }
})();
