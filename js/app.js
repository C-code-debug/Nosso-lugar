// =============================================
// APP.JS — Navegação e inicialização geral
// =============================================

// =============================================
// NAVEGAÇÃO
// =============================================
const _pageInited = {};

function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  if (btn)  btn.classList.add('active');

  if (id === 'gallery' && !_pageInited.gallery) { initGallery();  _pageInited.gallery = true; }
  if (id === 'diary'   && !_pageInited.diary)   { initDiary();    _pageInited.diary   = true; }
  if (id === 'info'    && !_pageInited.info)     { initPhrases();  _pageInited.info    = true; }
}

// =============================================
// TOAST DE NOTIFICAÇÃO
// =============================================
let toastTimeout;

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = msg;
  toast.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000);
}

// =============================================
// INICIALIZAÇÃO
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();  // auth.js — mostra senha ou app direto
});
