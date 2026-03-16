// =============================================
// DIARY.JS — Diário compartilhado + Mural de frases
// =============================================

// =============================================
// DIÁRIO
// =============================================
function initDiary() {
  loadDiaryEntries();
  setupDiaryForm();
}

function setupDiaryForm() {
  const form = document.getElementById('diaryForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('diaryTitle').value.trim();
    const text  = document.getElementById('diaryText').value.trim();
    if (!title || !text) { showToast('preencha o título e o texto'); return; }

    const btn = form.querySelector('.diary-submit');
    if (btn) btn.textContent = 'salvando...';

    try {
      const { collection, addDoc, serverTimestamp } = window.firebaseDbLib;
      await addDoc(collection(window.firebaseDb, 'diary'), {
        title,
        text,
        createdAt: serverTimestamp(),
      });
      document.getElementById('diaryTitle').value = '';
      document.getElementById('diaryText').value  = '';
      showToast('entrada salva ♥');
      if (window.soundSave) soundSave();
      loadDiaryEntries();
    } catch (e) {
      console.error(e);
      showToast('erro ao salvar entrada');
    }

    if (btn) btn.textContent = 'salvar entrada';
  });
}

async function loadDiaryEntries() {
  const list = document.getElementById('diaryList');
  if (!list || !window.firebaseDb) return;

  try {
    const { collection, getDocs, orderBy, query } = window.firebaseDbLib;
    const q    = query(collection(window.firebaseDb, 'diary'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    list.innerHTML = '';

    if (snap.empty) {
      list.innerHTML = `
        <div class="diary-empty">
          <span class="icon">📖</span>
          <p>nenhuma entrada ainda</p>
        </div>`;
      return;
    }

    snap.forEach(doc => list.appendChild(createDiaryEntry(doc.id, doc.data())));
  } catch (e) {
    console.error('Erro ao carregar diário:', e);
  }
}

function createDiaryEntry(id, data) {
  const entry = document.createElement('div');
  entry.className = 'diary-entry';

  const date = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'agora';

  entry.innerHTML = `
    <div class="diary-entry-header">
      <span class="diary-entry-title">${escapeHtml(data.title)}</span>
      <div class="diary-entry-actions">
        <button class="copy-btn" title="copiar">⎘</button>
        <button class="diary-entry-delete" title="remover entrada">✕</button>
      </div>
    </div>
    <span class="diary-entry-date">${date}</span>
    <p class="diary-entry-text">${escapeHtml(data.text)}</p>
  `;

  const copyBtn  = entry.querySelector('.copy-btn');
  const delBtn   = entry.querySelector('.diary-entry-delete');

  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${data.title}\n\n${data.text}`).then(() => {
      copyBtn.textContent = '✓';
      copyBtn.classList.add('copied');
      if (window.soundCopy) soundCopy();
      setTimeout(() => { copyBtn.textContent = '⎘'; copyBtn.classList.remove('copied'); }, 1800);
    });
  });

  delBtn.addEventListener('click', () => deleteDiaryEntry(id, entry));

  entry.classList.add('reveal');
  setTimeout(() => entry.classList.add('visible'), 50);

  return entry;
}

async function deleteDiaryEntry(id, el) {
  if (!confirm('Remover esta entrada do diário?')) return;
  try {
    const { doc, deleteDoc } = window.firebaseDbLib;
    await deleteDoc(doc(window.firebaseDb, 'diary', id));
    el.style.opacity = '0';
    el.style.transform = 'translateX(-10px)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => { el.remove(); checkDiaryEmpty(); }, 300);
    showToast('entrada removida');
  } catch (e) { showToast('erro ao remover'); }
}

function checkDiaryEmpty() {
  const list = document.getElementById('diaryList');
  if (list && list.children.length === 0) {
    list.innerHTML = `
      <div class="diary-empty">
        <span class="icon">📖</span>
        <p>nenhuma entrada ainda</p>
      </div>`;
  }
}

// =============================================
// MURAL DE FRASES
// =============================================
function initPhrases() {
  loadPhrases();
  setupPhrasesForm();
}

function setupPhrasesForm() {
  const form = document.getElementById('phrasesForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('phraseInput');
    const text  = input.value.trim();
    if (!text) { showToast('escreva uma frase primeiro'); return; }

    const btn = form.querySelector('.phrases-submit');
    if (btn) btn.textContent = 'enviando...';

    try {
      const { collection, addDoc, serverTimestamp } = window.firebaseDbLib;
      await addDoc(collection(window.firebaseDb, 'phrases'), {
        text,
        createdAt: serverTimestamp(),
      });
      input.value = '';
      showToast('frase adicionada ♥');
      if (window.soundSave) soundSave();
      loadPhrases();
    } catch (e) {
      console.error(e);
      showToast('erro ao salvar frase');
    }

    if (btn) btn.textContent = 'enviar';
  });
}

async function loadPhrases() {
  const grid = document.getElementById('phrasesGrid');
  if (!grid || !window.firebaseDb) return;

  try {
    const { collection, getDocs, orderBy, query } = window.firebaseDbLib;
    const q    = query(collection(window.firebaseDb, 'phrases'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    grid.innerHTML = '';

    if (snap.empty) {
      grid.innerHTML = `
        <div class="phrases-empty">
          <span class="icon">💬</span>
          <p>nenhuma frase ainda</p>
        </div>`;
      return;
    }

    snap.forEach(doc => grid.appendChild(createPhraseCard(doc.id, doc.data())));
  } catch (e) {
    console.error('Erro ao carregar frases:', e);
  }
}

function createPhraseCard(id, data) {
  const card = document.createElement('div');
  card.className = 'phrase-card';

  const date = data.createdAt?.toDate
    ? data.createdAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  card.innerHTML = `
    <span class="phrase-quote">"</span>
    <p class="phrase-text">${escapeHtml(data.text)}</p>
    <div class="phrase-edit-wrap">
      <textarea class="phrase-edit-textarea" rows="3">${escapeHtml(data.text)}</textarea>
      <div class="phrase-edit-actions">
        <button class="phrase-cancel-btn">cancelar</button>
        <button class="phrase-save-btn">salvar</button>
      </div>
    </div>
    <span class="phrase-date">${date}</span>
    <button class="phrase-edit" title="editar">✎</button>
    <button class="phrase-delete" title="remover">✕</button>
  `;

  const editBtn    = card.querySelector('.phrase-edit');
  const deleteBtn  = card.querySelector('.phrase-delete');
  const saveBtn    = card.querySelector('.phrase-save-btn');
  const cancelBtn  = card.querySelector('.phrase-cancel-btn');
  const textarea   = card.querySelector('.phrase-edit-textarea');
  const textEl     = card.querySelector('.phrase-text');

  editBtn.addEventListener('click', () => {
    card.classList.add('editing');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  });

  cancelBtn.addEventListener('click', () => {
    textarea.value = textEl.textContent;
    card.classList.remove('editing');
  });

  saveBtn.addEventListener('click', async () => {
    const newText = textarea.value.trim();
    if (!newText) { showToast('a frase não pode ficar vazia'); return; }
    saveBtn.textContent = 'salvando...';
    try {
      const { doc, updateDoc } = window.firebaseDbLib;
      await updateDoc(doc(window.firebaseDb, 'phrases', id), { text: newText });
      textEl.textContent = newText;
      card.classList.remove('editing');
      showToast('frase atualizada ♥');
    } catch (e) {
      showToast('erro ao salvar');
    }
    saveBtn.textContent = 'salvar';
  });

  deleteBtn.addEventListener('click', () => deletePhraseCard(id, card));

  // Botão copiar
  if (window.addCopyButton) {
    addCopyButton(card, () => data.text);
  }

  // Reveal
  card.classList.add('reveal');
  setTimeout(() => card.classList.add('visible'), 50);

  return card;
}

async function deletePhraseCard(id, el) {
  if (!confirm('Remover esta frase?')) return;
  try {
    const { doc, deleteDoc } = window.firebaseDbLib;
    await deleteDoc(doc(window.firebaseDb, 'phrases', id));
    el.style.opacity = '0';
    el.style.transform = 'scale(0.95)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => { el.remove(); checkPhrasesEmpty(); }, 300);
    showToast('frase removida');
  } catch (e) { showToast('erro ao remover'); }
}

function checkPhrasesEmpty() {
  const grid = document.getElementById('phrasesGrid');
  if (grid && grid.children.length === 0) {
    grid.innerHTML = `
      <div class="phrases-empty">
        <span class="icon">💬</span>
        <p>nenhuma frase ainda</p>
      </div>`;
  }
}

// =============================================
// UTILITÁRIO
// =============================================
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
