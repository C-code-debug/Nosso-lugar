// =============================================
// GALLERY.JS — Galeria com álbuns e modal
// Fotos: Cloudinary | Metadados: Firestore
// =============================================

const CLOUDINARY_CLOUD  = 'da68nz6em';
const CLOUDINARY_PRESET = 'Nossolugar';
const CLOUDINARY_URL    = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;

let _currentAlbum = 'todos';
let _albums       = ['todos'];
let _allPhotos    = []; // cache { id, url, publicId, album, uploadedAt }
let _modalIndex   = 0;

// =============================================
// INIT
// =============================================
function initGallery() {
  setupUploadArea();
  loadAlbums().then(() => loadPhotos());
}

// =============================================
// ÁLBUNS
// =============================================
async function loadAlbums() {
  if (!window.firebaseDb) return;
  try {
    const { collection, getDocs } = window.firebaseDbLib;
    const snap = await getDocs(collection(window.firebaseDb, 'albums'));
    const names = ['todos'];
    snap.forEach(doc => names.push(doc.data().name));
    _albums = names;
    renderAlbumsBar();
  } catch (e) { console.warn('Erro ao carregar álbuns:', e); }
}

function renderAlbumsBar() {
  const bar = document.getElementById('albumsBar');
  if (!bar) return;
  bar.innerHTML = '';

  _albums.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'album-chip' + (name === _currentAlbum ? ' active' : '');
    btn.textContent = name === 'todos' ? 'todos' : name;
    btn.onclick = () => { _currentAlbum = name; renderAlbumsBar(); renderPhotoGrid(); };
    bar.appendChild(btn);
  });

  // Botão novo álbum
  const newBtn = document.createElement('button');
  newBtn.className = 'album-chip-new';
  newBtn.textContent = '+ álbum';
  newBtn.onclick = createAlbum;
  bar.appendChild(newBtn);
}

async function createAlbum() {
  const name = prompt('Nome do novo álbum:');
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  if (_albums.includes(trimmed)) { showToast('esse álbum já existe'); return; }

  try {
    const { collection, addDoc } = window.firebaseDbLib;
    await addDoc(collection(window.firebaseDb, 'albums'), { name: trimmed });
    _albums.push(trimmed);
    _currentAlbum = trimmed;
    renderAlbumsBar();
    renderPhotoGrid();
    showToast(`álbum "${trimmed}" criado ♥`);
  } catch (e) { showToast('erro ao criar álbum'); }
}

// =============================================
// UPLOAD
// =============================================
function setupUploadArea() {
  const area  = document.getElementById('uploadArea');
  const input = document.getElementById('photoInput');
  if (!area || !input) return;

  area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('dragover'); });
  area.addEventListener('dragleave', () => area.classList.remove('dragover'));
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) uploadFiles(files);
  });
  input.addEventListener('change', () => {
    const files = Array.from(input.files);
    if (files.length > 0) uploadFiles(files);
    input.value = '';
  });
}

async function uploadFiles(files) {
  const uploadText = document.getElementById('uploadText');
  const uploadArea = document.getElementById('uploadArea');
  if (uploadText) uploadText.textContent = `enviando ${files.length} foto${files.length > 1 ? 's' : ''}...`;
  if (uploadArea) uploadArea.style.pointerEvents = 'none';

  for (const file of files) {
    try { await uploadSingleFile(file); }
    catch (err) { console.error('Erro:', err); showToast('erro ao enviar ' + file.name); }
  }

  if (uploadText) uploadText.textContent = 'solte fotos aqui ou clique para escolher';
  if (uploadArea) uploadArea.style.pointerEvents = '';
  showToast(`foto${files.length > 1 ? 's adicionadas' : ' adicionada'} ♥`);
  await loadPhotos();
}

async function uploadSingleFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  formData.append('folder', 'nosso-lugar');

  const res  = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
  const data = await res.json();
  if (!data.secure_url) throw new Error('Cloudinary sem URL');

  const album = _currentAlbum === 'todos' ? '' : _currentAlbum;
  const { collection, addDoc, serverTimestamp } = window.firebaseDbLib;
  await addDoc(collection(window.firebaseDb, 'gallery'), {
    url: data.secure_url,
    publicId: data.public_id,
    album,
    uploadedAt: serverTimestamp(),
    caption: '',
  });
}

// =============================================
// CARREGAR E RENDERIZAR FOTOS
// =============================================
async function loadPhotos() {
  if (!window.firebaseDb) return;
  try {
    const { collection, getDocs, orderBy, query } = window.firebaseDbLib;
    const q    = query(collection(window.firebaseDb, 'gallery'), orderBy('uploadedAt', 'desc'));
    const snap = await getDocs(q);
    _allPhotos = [];
    snap.forEach(doc => _allPhotos.push({ id: doc.id, ...doc.data() }));
    renderPhotoGrid();
  } catch (e) { console.error('Erro ao carregar fotos:', e); }
}

function renderPhotoGrid() {
  const grid = document.getElementById('photoGrid');
  if (!grid) return;

  const filtered = _currentAlbum === 'todos'
    ? _allPhotos
    : _allPhotos.filter(p => p.album === _currentAlbum);

  grid.innerHTML = '';

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="gallery-empty" style="grid-column:1/-1">
        <span class="icon">🖼️</span>
        <p>${_currentAlbum === 'todos' ? 'nenhuma foto ainda' : 'nenhuma foto neste álbum'}</p>
      </div>`;
    return;
  }

  filtered.forEach((photo, idx) => grid.appendChild(createPhotoCard(photo, idx)));
}

function createPhotoCard(photo, idx) {
  const card = document.createElement('div');
  card.className = 'photo-card';
  card.innerHTML = `
    <img src="${photo.url}" alt="${photo.caption || 'foto'}" loading="lazy"/>
    <div class="photo-overlay">
      <span class="photo-caption">${photo.caption || (photo.album ? photo.album : '')}</span>
    </div>
    <button class="photo-expand" title="expandir">⤢</button>
    <button class="photo-delete" title="remover">✕</button>
  `;
  card.querySelector('.photo-expand').addEventListener('click', (e) => { e.stopPropagation(); openModal(idx); });
  card.querySelector('img').addEventListener('click', () => openModal(idx));
  card.querySelector('.photo-delete').addEventListener('click', (e) => deletePhoto(e, photo.id));
  return card;
}

// =============================================
// DELETAR
// =============================================
async function deletePhoto(event, docId) {
  event.stopPropagation();
  if (!confirm('Remover esta foto?')) return;
  try {
    const { doc, deleteDoc } = window.firebaseDbLib;
    await deleteDoc(doc(window.firebaseDb, 'gallery', docId));
    showToast('foto removida');
    await loadPhotos();
  } catch (e) { showToast('erro ao remover'); }
}

// =============================================
// MODAL COM NAVEGAÇÃO
// =============================================
function openModal(idx) {
  const filtered = _currentAlbum === 'todos'
    ? _allPhotos
    : _allPhotos.filter(p => p.album === _currentAlbum);

  _modalIndex = idx;
  const modal = document.getElementById('photoModal');
  const img   = document.getElementById('modalImg');
  if (!modal || !img) return;

  img.src = filtered[_modalIndex].url;
  modal.classList.add('open');
  updateModalNav(filtered.length);
}

function modalNav(dir) {
  const filtered = _currentAlbum === 'todos'
    ? _allPhotos
    : _allPhotos.filter(p => p.album === _currentAlbum);

  _modalIndex = (_modalIndex + dir + filtered.length) % filtered.length;
  const img = document.getElementById('modalImg');
  if (img) img.src = filtered[_modalIndex].url;
  updateModalNav(filtered.length);
}

function updateModalNav(total) {
  const counter = document.getElementById('modalCounter');
  if (counter) counter.textContent = `${_modalIndex + 1} / ${total}`;
}

function closeModal() {
  const modal = document.getElementById('photoModal');
  if (modal) modal.classList.remove('open');
}

document.addEventListener('click', (e) => {
  const modal = document.getElementById('photoModal');
  if (modal && e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('photoModal');
  if (!modal || !modal.classList.contains('open')) return;
  if (e.key === 'Escape')      closeModal();
  if (e.key === 'ArrowRight')  modalNav(1);
  if (e.key === 'ArrowLeft')   modalNav(-1);
});

function renderGalleryEmpty(grid) {
  grid.innerHTML = `
    <div class="gallery-empty" style="grid-column:1/-1">
      <span class="icon">🖼️</span>
      <p>nenhuma foto ainda</p>
    </div>`;
}