// =============================================
// EFFECTS.JS — Efeitos visuais e sonoros
// =============================================

// =============================================
// EFEITO DE DIGITAÇÃO NO SUBTÍTULO
// =============================================
function initTypingEffect() {
  const el = document.querySelector('.site-subtitle');
  if (!el) return;

  const text  = el.textContent.trim();
  const delay = 60; // ms por letra
  el.textContent = '';
  el.style.borderRight = '1px solid var(--text-muted)';

  let i = 0;
  const type = () => {
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(type, delay);
    } else {
      // Remove cursor após terminar
      setTimeout(() => el.style.borderRight = 'none', 800);
    }
  };

  setTimeout(type, 600);
}

// =============================================
// SCROLL REVEAL — cards entram ao aparecer
// =============================================
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  // Observa cards e itens de lista
  document.querySelectorAll('.card, .anniversary-item, .diary-entry, .phrase-card, .photo-card')
    .forEach(el => {
      el.classList.add('reveal');
      observer.observe(el);
    });
}

// Chama novamente quando novas entradas são adicionadas
function revealNewItems() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal:not(.visible)').forEach(el => observer.observe(el));
  // Itens já visíveis na viewport ficam visíveis imediatamente
  setTimeout(() => {
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) el.classList.add('visible');
    });
  }, 50);
}

// =============================================
// SONS SUAVES (Web Audio API — sem arquivos)
// =============================================
let audioCtx;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', vol = 0.08) {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type      = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

// Som de salvo (dois tons suaves ascendentes)
function soundSave() {
  playTone(520, 0.12);
  setTimeout(() => playTone(680, 0.15), 100);
}

// Som de coração (batida suave)
function soundHeart() {
  playTone(200, 0.08, 'sine', 0.06);
  setTimeout(() => playTone(180, 0.1, 'sine', 0.04), 80);
}

// Som de copiar (clique leve)
function soundCopy() {
  playTone(900, 0.06, 'sine', 0.05);
}

// Som de erro
function soundError() {
  playTone(200, 0.2, 'sawtooth', 0.04);
}

// Expõe sons globalmente
window.soundSave  = soundSave;
window.soundHeart = soundHeart;
window.soundCopy  = soundCopy;
window.soundError = soundError;

// =============================================
// MENSAGEM ESPECIAL NO DIA DO ANIVERSÁRIO
// =============================================
function checkAnniversaryToday() {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Verifica se hoje é um dia de aniversário
  let months = 1;
  while (true) {
    const anni = getAnniversaryDate(months);
    if (anni > today) break;
    if (anni.getTime() === today.getTime()) {
      showAnniversaryBanner(months);
      return;
    }
    months++;
  }
}

function showAnniversaryBanner(months) {
  const container = document.getElementById('page-home');
  if (!container) return;

  // Não mostra duas vezes
  if (document.getElementById('anniversaryBanner')) return;

  const banner = document.createElement('div');
  banner.id        = 'anniversaryBanner';
  banner.className = 'anniversary-banner';
  banner.innerHTML = `
    <span class="anniversary-banner-title">♥ ${months}º mês ♥</span>
    <p class="anniversary-banner-text">feliz aniversário, hoje faz ${months} ${months === 1 ? 'mês' : 'meses'} juntos</p>
  `;

  // Insere antes do card principal
  const firstCard = container.querySelector('.card');
  if (firstCard) container.insertBefore(banner, firstCard);
  else container.prepend(banner);

  soundHeart();
}

// =============================================
// BOTÃO COPIAR — diário e frases
// =============================================
function addCopyButton(el, getText) {
  const btn = document.createElement('button');
  btn.className   = 'copy-btn';
  btn.title       = 'copiar';
  btn.textContent = '⎘';

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const text = getText();
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = '✓';
      btn.classList.add('copied');
      soundCopy();
      setTimeout(() => {
        btn.textContent = '⎘';
        btn.classList.remove('copied');
      }, 1800);
    });
  });

  el.appendChild(btn);
}

// =============================================
// CORAÇÃO INTERATIVO
// =============================================
function initHeartInteraction() {
  const heart = document.querySelector('.counter-heart');
  if (!heart) return;

  heart.addEventListener('click', () => {
    soundHeart();
    // Pequeno efeito de partícula
    spawnHeartParticle(heart);
  });
}

function spawnHeartParticle(origin) {
  const rect = origin.getBoundingClientRect();
  const cx   = rect.left + rect.width / 2;
  const cy   = rect.top  + rect.height / 2;

  for (let i = 0; i < 6; i++) {
    const p = document.createElement('div');
    p.textContent = '♥';
    p.style.cssText = `
      position: fixed;
      left: ${cx}px;
      top: ${cy}px;
      font-size: ${Math.random() * 14 + 10}px;
      color: var(--heart-color);
      pointer-events: none;
      z-index: 9998;
      filter: drop-shadow(0 0 4px var(--heart-color));
      transition: transform 0.8s ease, opacity 0.8s ease;
      opacity: 1;
    `;
    document.body.appendChild(p);

    const angle = (Math.PI * 2 / 6) * i;
    const dist  = Math.random() * 60 + 30;
    const tx    = Math.cos(angle) * dist;
    const ty    = Math.sin(angle) * dist - 20;

    requestAnimationFrame(() => {
      p.style.transform = `translate(${tx}px, ${ty}px) scale(0)`;
      p.style.opacity   = '0';
    });

    setTimeout(() => p.remove(), 850);
  }
}

// =============================================
// INIT
// =============================================
function initEffects() {
  initTypingEffect();
  initHeartInteraction();
  checkAnniversaryToday();

  // Reveal inicial com pequeno delay pra DOM estabilizar
  setTimeout(initScrollReveal, 100);
}

// Expõe pra outros módulos usarem
window.revealNewItems = revealNewItems;
window.addCopyButton  = addCopyButton;
window.soundSave      = soundSave;
