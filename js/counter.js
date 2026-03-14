// =============================================
// COUNTER.JS — Lógica dos aniversários
// =============================================

const START_DATE = new Date(2025, 11, 29);

let _descriptions  = {};
let _totalMonths   = 0;
let _searchQuery   = '';
let _listRendered  = false; // evita recriar a lista enquanto usuário digita

function getAnniversaryDate(monthsAfterStart) {
  let year  = START_DATE.getFullYear();
  let month = START_DATE.getMonth() + monthsAfterStart;
  year  += Math.floor(month / 12);
  month  = month % 12;
  const attempt = new Date(year, month, 29);
  if (attempt.getMonth() !== month) return new Date(year, month + 1, 1);
  return attempt;
}

function formatDate(date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function pad(n) { return String(n).padStart(2, '0'); }

// =============================================
// DESCRIÇÕES — FIRESTORE
// =============================================
async function loadDescriptions() {
  if (!window.firebaseDb) return;
  try {
    const { collection, getDocs } = window.firebaseDbLib;
    const snap = await getDocs(collection(window.firebaseDb, 'anniversary_notes'));
    snap.forEach(doc => { _descriptions[doc.id] = doc.data().text || ''; });
  } catch (e) { console.warn('Erro ao carregar descrições:', e); }
}

async function saveDescription(monthIndex, text) {
  if (!window.firebaseDb) return;
  try {
    const { doc, setDoc } = window.firebaseDbLib;
    await setDoc(doc(window.firebaseDb, 'anniversary_notes', String(monthIndex)), { text });
    _descriptions[monthIndex] = text;
  } catch (e) { console.warn('Erro ao salvar descrição:', e); }
}

// =============================================
// TICK — só atualiza números, não recria a lista
// =============================================
function tick() {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Calcula meses completos
  let months = 0;
  while (true) {
    const next = getAnniversaryDate(months + 1);
    if (next > today) break;
    months++;
  }

  // Se mudou o número de meses, precisa re-renderizar a lista
  const monthsChanged = months !== _totalMonths;
  _totalMonths = months;

  const msPerDay  = 1000 * 60 * 60 * 24;
  const totalDays = Math.floor((today - START_DATE) / msPerDay);

  const elMonths = document.getElementById('monthCount');
  const elDays   = document.getElementById('daysTotal');
  if (elMonths) elMonths.textContent = months;
  if (elDays)   elDays.textContent   = `${totalDays} dias de muito amor`;

  // Próximo aniversário
  const nextAnni    = getAnniversaryDate(months + 1);
  const elNextLabel = document.getElementById('nextDateLabel');
  if (elNextLabel) elNextLabel.textContent = formatDate(nextAnni);

  // Countdown — só atualiza os números, não recria nada
  const target = new Date(nextAnni.getFullYear(), nextAnni.getMonth(), nextAnni.getDate(), 0, 0, 0);
  const diff   = target - now;
  if (diff > 0) {
    const d = Math.floor(diff / msPerDay);
    const h = Math.floor((diff % msPerDay) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = pad(val); };
    set('cdDays', d); set('cdHours', h); set('cdMins', m); set('cdSecs', s);
  } else {
    ['cdDays','cdHours','cdMins','cdSecs'].forEach(id => {
      const el = document.getElementById(id); if (el) el.textContent = '00';
    });
  }

  // Só renderiza a lista se ainda não foi renderizada, ou se ganhou um mês novo
  if (!_listRendered || monthsChanged) {
    renderAnniversaryList();
    _listRendered = true;
  }
}

// =============================================
// RENDER DA LISTA — chamado só quando necessário
// =============================================
function renderAnniversaryList() {
  const list    = document.getElementById('anniversaryList');
  const counter = document.getElementById('anniversaryCount');
  if (!list) return;

  const query = _searchQuery.toLowerCase().trim();
  const items = [];

  for (let i = 1; i <= _totalMonths; i++) {
    const d       = getAnniversaryDate(i);
    const dateStr = formatDate(d).toLowerCase();
    const desc    = (_descriptions[i] || '').toLowerCase();
    if (!query || dateStr.includes(query) || desc.includes(query) || String(i).includes(query)) {
      items.push(i);
    }
  }

  if (counter) {
    counter.textContent = query
      ? `${items.length} resultado${items.length !== 1 ? 's' : ''}`
      : `${_totalMonths} mês${_totalMonths !== 1 ? 'es' : ''}`;
  }

  list.innerHTML = '';

  if (_totalMonths === 0) {
    list.innerHTML = `<div class="anniversary-no-results">o primeiro mês ainda não chegou</div>`;
    return;
  }
  if (items.length === 0) {
    list.innerHTML = `<div class="anniversary-no-results">nenhum resultado encontrado</div>`;
    return;
  }

  items.forEach(i => list.appendChild(createAnniversaryItem(i)));
}

function createAnniversaryItem(i) {
  const d            = getAnniversaryDate(i);
  const isFebSpecial = (d.getMonth() === 2 && d.getDate() === 1);
  const defaultNote  = isFebSpecial ? 'fevereiro não tem dia 29, então foi dia 01 ♥' : '';
  const savedDesc    = _descriptions[i] || '';

  const item = document.createElement('div');
  item.className = 'anniversary-item';
  item.innerHTML = `
    <span class="anniversary-number">${i}</span>
    <div class="anniversary-info">
      <div class="anniversary-date">${formatDate(d)}</div>
      ${defaultNote ? `<div class="anniversary-note">${defaultNote}</div>` : ''}
      <div class="anniversary-desc-wrap">
        <textarea class="anniversary-desc" placeholder="escreva algo sobre esse mês..." rows="2" data-month="${i}">${savedDesc}</textarea>
        <div class="anniversary-desc-saved" id="saved-${i}">salvo ♥</div>
      </div>
    </div>
    <span class="anniversary-badge">${i}º mês</span>
  `;

  const textarea = item.querySelector('textarea');
  let saveTimer;

  textarea.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await saveDescription(i, textarea.value);
      const savedEl = document.getElementById(`saved-${i}`);
      if (savedEl) {
        savedEl.classList.add('show');
        setTimeout(() => savedEl.classList.remove('show'), 2000);
      }
    }, 800);
  });

  return item;
}

// =============================================
// PESQUISA — re-renderiza a lista, não o countdown
// =============================================
function initAnniversarySearch() {
  const input = document.getElementById('anniversarySearch');
  if (!input) return;
  input.addEventListener('input', () => {
    _searchQuery = input.value;
    renderAnniversaryList();
  });
}

// =============================================
// INIT
// =============================================
async function initCounter() {
  await loadDescriptions();
  tick();
  setInterval(tick, 1000);
  initAnniversarySearch();
}