// =============================================
// THEME.JS — Troca de tema e partículas
// =============================================

let currentTheme = localStorage.getItem('theme') || 'gothic';

function initTheme() {
  document.body.setAttribute('data-theme', currentTheme);
  updateThemeButton();
  createParticles();
}

function toggleTheme() {
  currentTheme = currentTheme === 'gothic' ? 'cute' : 'gothic';
  document.body.setAttribute('data-theme', currentTheme);
  localStorage.setItem('theme', currentTheme);
  updateThemeButton();
  createParticles();
}

function updateThemeButton() {
  const icon  = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (!icon || !label) return;

  if (currentTheme === 'cute') {
    icon.textContent  = '🌸';
    label.textContent = 'modo gótico';
  } else {
    icon.textContent  = '🌙';
    label.textContent = 'modo fofo';
  }
}

function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';

    const size     = Math.random() * 4 + 2;
    const left     = Math.random() * 100;
    const duration = Math.random() * 12 + 8;
    const delay    = Math.random() * 8;

    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${left}%;
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;
    container.appendChild(p);
  }
}
