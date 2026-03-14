// =============================================
// AUTH.JS — Tela de senha com sessionStorage
// =============================================

const _h = atob('MjkxMjIwMjU=');

function checkAuth() {
  if (sessionStorage.getItem('nl_auth') === '1') {
    showApp();
    return;
  }
  createLockParticles();
  showLock();
}

function createLockParticles() {
  const screen = document.getElementById('lockScreen');
  const colors = ['#9b30ff','#cc44ff','#7b20df','#ff6eb4','#ffffff'];

  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'lock-particle';

    const size     = Math.random() * 4 + 1.5;
    const color    = colors[Math.floor(Math.random() * colors.length)];
    const left     = Math.random() * 100;
    const duration = Math.random() * 14 + 8;
    const delay    = Math.random() * 10;

    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      box-shadow: 0 0 ${size * 2}px ${color};
      left: ${left}%;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;
    screen.appendChild(p);
  }
}

function showLock() {
  const input = document.getElementById('lockInput');
  const btn   = document.getElementById('lockBtn');
  const error = document.getElementById('lockError');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryUnlock();
  });

  btn.addEventListener('click', tryUnlock);

  // Foca no input automaticamente
  setTimeout(() => input.focus(), 700);

  function tryUnlock() {
    if (input.value === _h) {
      sessionStorage.setItem('nl_auth', '1');
      const lock = document.getElementById('lockScreen');
      lock.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      lock.style.opacity    = '0';
      lock.style.transform  = 'scale(1.05)';
      setTimeout(() => {
        lock.style.display = 'none';
        showApp();
      }, 500);
    } else {
      input.value = '';
      error.classList.add('show');
      input.classList.add('shake');
      setTimeout(() => {
        error.classList.remove('show');
        input.classList.remove('shake');
        input.focus();
      }, 1800);
    }
  }
}

function showApp() {
  document.getElementById('lockScreen').style.display = 'none';
  document.getElementById('appWrapper').style.display = 'block';
  initTheme();
  initCounter();
}
