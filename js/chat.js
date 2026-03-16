// =============================================
// CHAT.JS — Chat fullscreen completo
// texto, emoji, reply, áudio, apagar, editar
// =============================================

// Usa as constantes do Cloudinary definidas em gallery.js
// CLOUDINARY_CLOUD e CLOUDINARY_PRESET já estão disponíveis globalmente

let _chatOpen     = false;
let _chatNickname = localStorage.getItem('nl_nickname') || '';
let _unsubscribe  = null;
let _lastCount    = 0;
let _editingId    = null;
let _replyingTo   = null;
let _messages     = [];

let _mediaRecorder = null;
let _audioChunks   = [];
let _isRecording   = false;
let _recordTimer   = null;

// =============================================
// INIT
// =============================================
function initChat() {
  renderChatButton();
  renderChatScreen();
}

// =============================================
// BOTÃO FLUTUANTE
// =============================================
function renderChatButton() {
  const btn = document.createElement('button');
  btn.id        = 'chatBtn';
  btn.innerHTML = `<span class="chat-btn-icon">💬</span><span class="chat-btn-badge" id="chatBadge" style="display:none">●</span>`;
  btn.onclick   = openChat;
  document.getElementById('appWrapper').appendChild(btn);
}

// =============================================
// TELA CHEIA
// =============================================
function renderChatScreen() {
  const screen = document.createElement('div');
  screen.id = 'chatScreen';
  screen.innerHTML = `
    <div class="chat-topbar">
      <button class="chat-back-btn" onclick="closeChat()">←</button>
      <span class="chat-topbar-title">♥ conversa</span>
      <button class="chat-nick-btn" onclick="showNicknamePrompt()" title="mudar apelido">✎</button>
    </div>

    <div class="chat-messages" id="chatMessages">
      <div class="chat-loading">carregando...</div>
    </div>

    <div class="chat-nickname-wrap" id="chatNicknameWrap" style="display:none">
      <p class="chat-nick-label">como quer ser chamado?</p>
      <div class="chat-nick-row">
        <input type="text" id="chatNickInput" class="chat-nick-input" placeholder="seu apelido..." maxlength="20"/>
        <button class="chat-nick-save" onclick="saveNickname()">entrar</button>
      </div>
    </div>

    <div class="chat-reply-banner" id="chatReplyBanner" style="display:none">
      <div class="chat-reply-banner-bar"></div>
      <div class="chat-reply-banner-content">
        <span class="chat-reply-banner-name" id="chatReplyName"></span>
        <span class="chat-reply-banner-text" id="chatReplyText"></span>
      </div>
      <button class="chat-reply-cancel" onclick="cancelReply()">✕</button>
    </div>

    <div class="chat-edit-banner" id="chatEditBanner" style="display:none">
      <span class="chat-edit-banner-text" id="chatEditText"></span>
      <button class="chat-edit-cancel" onclick="cancelEdit()">✕</button>
    </div>

    <form class="chat-form" id="chatForm" style="display:none">
      <button type="button" class="chat-emoji-btn" onclick="toggleEmojiPicker()">☺</button>
      <input type="text" id="chatInput" class="chat-input" placeholder="mensagem..." maxlength="500" autocomplete="off"/>
      <button type="button" class="chat-audio-btn" id="chatAudioBtn" onmousedown="startRecording()" onmouseup="stopRecording()" ontouchstart="startRecording(event)" ontouchend="stopRecording(event)">🎤</button>
      <button type="submit" class="chat-send" id="chatSendBtn">➤</button>
    </form>

    <div class="emoji-picker" id="emojiPicker" style="display:none"></div>
  `;

  screen.querySelector('#chatForm').addEventListener('submit', sendMessage);
  document.getElementById('appWrapper').appendChild(screen);
  buildEmojiPicker();
}

function openChat() {
  _chatOpen = true;
  document.getElementById('chatScreen').classList.add('open');
  document.getElementById('appWrapper').style.overflow = 'hidden';
  hideBadge();
  if (!_chatNickname) {
    showNicknamePrompt();
  } else {
    document.getElementById('chatForm').style.display = 'flex';
    startListening();
    setTimeout(scrollToBottom, 100);
  }
}

function closeChat() {
  _chatOpen = false;
  document.getElementById('chatScreen').classList.remove('open');
  document.getElementById('appWrapper').style.overflow = '';
  closeEmojiPicker();
  cancelEdit();
  cancelReply();
  if (_isRecording) stopRecording();
}

// =============================================
// BADGE
// =============================================
function hideBadge() {
  const b = document.getElementById('chatBadge');
  if (b) b.style.display = 'none';
}
function showBadge() {
  if (_chatOpen) return;
  const b = document.getElementById('chatBadge');
  if (b) b.style.display = 'block';
}

// =============================================
// APELIDO
// =============================================
function showNicknamePrompt() {
  document.getElementById('chatNicknameWrap').style.display = 'flex';
  document.getElementById('chatForm').style.display         = 'none';
  const input = document.getElementById('chatNickInput');
  input.value = _chatNickname;
  setTimeout(() => input.focus(), 100);
}

function saveNickname() {
  const input = document.getElementById('chatNickInput');
  const name  = input.value.trim();
  if (!name) { showToast('escreve um apelido'); return; }
  _chatNickname = name;
  localStorage.setItem('nl_nickname', name);
  document.getElementById('chatNicknameWrap').style.display = 'none';
  document.getElementById('chatForm').style.display         = 'flex';
  startListening();
  showToast(`entrando como ${name} ♥`);
  setTimeout(scrollToBottom, 300);
}

document.addEventListener('keydown', (e) => {
  const wrap = document.getElementById('chatNicknameWrap');
  if (wrap && wrap.style.display !== 'none' && e.key === 'Enter') saveNickname();
  if (e.key === 'Escape' && _chatOpen) closeChat();
});

// =============================================
// FIRESTORE REALTIME
// =============================================
function startListening() {
  if (!window.firebaseDb || !window.firebaseDbLib) { setTimeout(startListening, 500); return; }
  if (_unsubscribe) _unsubscribe();

  const { collection, query, orderBy, onSnapshot, limit } = window.firebaseDbLib;
  const q = query(collection(window.firebaseDb, 'chat'), orderBy('createdAt', 'asc'), limit(200));

  _unsubscribe = onSnapshot(q, (snap) => {
    _messages = [];
    snap.forEach(doc => _messages.push({ id: doc.id, ...doc.data() }));
    const isNew = _messages.length > _lastCount && _lastCount > 0;
    renderMessages();
    if (isNew) {
      showBadge();
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 520; g.gain.value = 0.06;
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        o.start(); o.stop(ctx.currentTime + 0.2);
      } catch(e) {}
    }
    _lastCount = _messages.length;
  });
}

// =============================================
// RENDERIZAR MENSAGENS
// =============================================
function renderMessages() {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
  container.innerHTML = '';

  if (_messages.length === 0) {
    container.innerHTML = `<div class="chat-empty">nenhuma mensagem ainda — diga oi! ♥</div>`;
    return;
  }

  let lastDate = '';
  _messages.forEach(msg => {
    const isMe   = msg.nickname === _chatNickname;
    const msgDate = msg.createdAt?.toDate
      ? msg.createdAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      : '';

    if (msgDate && msgDate !== lastDate) {
      const sep = document.createElement('div');
      sep.className = 'chat-date-sep';
      sep.textContent = msgDate;
      container.appendChild(sep);
      lastDate = msgDate;
    }
    container.appendChild(createBubble(msg, isMe));
  });

  if (wasAtBottom) scrollToBottom();
}

function createBubble(msg, isMe) {
  const bubble = document.createElement('div');
  bubble.className  = `chat-bubble ${isMe ? 'chat-mine' : 'chat-theirs'}`;
  bubble.dataset.id = msg.id;

  const time   = msg.createdAt?.toDate
    ? msg.createdAt.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';
  const edited = msg.edited ? `<span class="chat-edited">editado</span>` : '';

  // Reply preview
  let replyHtml = '';
  if (msg.replyTo) {
    const rType = msg.replyTo.type === 'audio' ? '🎤 áudio' : escapeHtmlChat(msg.replyTo.text || '');
    replyHtml = `
      <div class="chat-reply-preview">
        <span class="chat-reply-preview-name">${escapeHtmlChat(msg.replyTo.nickname)}</span>
        <span class="chat-reply-preview-text">${rType}</span>
      </div>`;
  }

  // Conteúdo principal
  let contentHtml = '';
  if (msg.type === 'audio') {
    contentHtml = `<audio class="chat-audio-player" src="${msg.audioUrl}" controls preload="none"></audio>`;
  } else {
    contentHtml = `<span class="chat-text">${escapeHtmlChat(msg.text)}</span>`;
  }

  bubble.innerHTML = `
    ${!isMe ? `<span class="chat-nick">${escapeHtmlChat(msg.nickname)}</span>` : ''}
    ${replyHtml}
    ${contentHtml}
    <span class="chat-meta">${edited}<span class="chat-time">${time}</span></span>
  `;

  // Long press / right click → menu
  const showMenu = (e) => { if(e) e.preventDefault(); showBubbleActions(msg, bubble, isMe); };
  bubble.addEventListener('contextmenu', showMenu);
  bubble.addEventListener('touchstart', () => { bubble._pt = setTimeout(() => showMenu(), 500); }, { passive: true });
  bubble.addEventListener('touchend',  () => clearTimeout(bubble._pt));
  bubble.addEventListener('touchmove', () => clearTimeout(bubble._pt));

  return bubble;
}

// =============================================
// MENU DE AÇÕES
// =============================================
function showBubbleActions(msg, bubble, isMe) {
  document.querySelectorAll('.bubble-menu').forEach(m => m.remove());

  const menu = document.createElement('div');
  menu.className = 'bubble-menu';

  // Reply — disponível pra qualquer mensagem
  const replyBtn = document.createElement('button');
  replyBtn.innerHTML = '↩ responder';
  replyBtn.onclick   = () => { startReply(msg); menu.remove(); };
  menu.appendChild(replyBtn);

  // Editar e apagar — só nas próprias mensagens de texto
  if (isMe && msg.type !== 'audio') {
    const editBtn = document.createElement('button');
    editBtn.innerHTML = '✎ editar';
    editBtn.onclick   = () => { startEdit(msg.id, msg.text); menu.remove(); };
    menu.appendChild(editBtn);
  }

  if (isMe) {
    const delBtn = document.createElement('button');
    delBtn.innerHTML  = '✕ apagar';
    delBtn.className  = 'bubble-menu-delete';
    delBtn.onclick    = () => { deleteMessage(msg.id, msg.audioUrl); menu.remove(); };
    menu.appendChild(delBtn);
  }

  bubble.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', function h() { menu.remove(); document.removeEventListener('click', h); });
  }, 10);
}

// =============================================
// REPLY
// =============================================
function startReply(msg) {
  _replyingTo = {
    id:       msg.id,
    nickname: msg.nickname || '',
    text:     msg.text || '',
    type:     msg.type || 'text',
  };
  const banner   = document.getElementById('chatReplyBanner');
  const nameEl   = document.getElementById('chatReplyName');
  const textEl   = document.getElementById('chatReplyText');
  nameEl.textContent  = msg.nickname;
  textEl.textContent  = msg.type === 'audio' ? '🎤 áudio' : (msg.text || '').substring(0, 60);
  banner.style.display = 'flex';
  document.getElementById('chatInput').focus();
}

function cancelReply() {
  _replyingTo = null;
  const banner = document.getElementById('chatReplyBanner');
  if (banner) banner.style.display = 'none';
}

// =============================================
// EDITAR
// =============================================
function startEdit(id, text) {
  _editingId = id;
  const input    = document.getElementById('chatInput');
  const banner   = document.getElementById('chatEditBanner');
  const bannerTxt = document.getElementById('chatEditText');
  const sendBtn  = document.getElementById('chatSendBtn');
  input.value = text;
  bannerTxt.textContent = `editando: ${text.substring(0, 40)}${text.length > 40 ? '...' : ''}`;
  banner.style.display  = 'flex';
  sendBtn.textContent   = '✓';
  input.focus();
}

function cancelEdit() {
  _editingId = null;
  const input   = document.getElementById('chatInput');
  const banner  = document.getElementById('chatEditBanner');
  const sendBtn = document.getElementById('chatSendBtn');
  if (input)   input.value = '';
  if (banner)  banner.style.display = 'none';
  if (sendBtn) sendBtn.textContent  = '➤';
}

// =============================================
// APAGAR
// =============================================
async function deleteMessage(id, audioUrl) {
  if (!confirm('Apagar esta mensagem?')) return;
  try {
    const { doc, deleteDoc } = window.firebaseDbLib;
    await deleteDoc(doc(window.firebaseDb, 'chat', id));
  } catch(e) { showToast('erro ao apagar'); }
}

// =============================================
// ENVIAR TEXTO
// =============================================
async function sendMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();

  // Modo edição
  if (_editingId) {
    if (!text) return;
    try {
      const { doc, updateDoc } = window.firebaseDbLib;
      await updateDoc(doc(window.firebaseDb, 'chat', _editingId), { text, edited: true });
      cancelEdit();
    } catch(e) { showToast('erro ao editar'); }
    return;
  }

  if (!text || !_chatNickname) return;
  input.value = '';

  try {
    const { collection, addDoc, serverTimestamp } = window.firebaseDbLib;
    const msgData = {
      text,
      nickname:  _chatNickname,
      createdAt: serverTimestamp(),
      edited:    false,
      type:      'text',
    };
    if (_replyingTo) {
      msgData.replyTo = {
        id:       _replyingTo.id || '',
        nickname: _replyingTo.nickname || '',
        text:     _replyingTo.text || '',
        type:     _replyingTo.type || 'text',
      };
      cancelReply();
    }
    await addDoc(collection(window.firebaseDb, 'chat'), msgData);
  } catch(e) { showToast('erro ao enviar'); }
}

// =============================================
// GRAVAÇÃO DE ÁUDIO
// =============================================
async function startRecording(e) {
  if (e) e.preventDefault();
  if (_isRecording) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _audioChunks  = [];
    _mediaRecorder = new MediaRecorder(stream);
    _isRecording  = true;

    _mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) _audioChunks.push(e.data); };
    _mediaRecorder.onstop = async () => {
      const blob = new Blob(_audioChunks, { type: 'audio/webm' });
      stream.getTracks().forEach(t => t.stop());
      await uploadAudio(blob);
    };

    _mediaRecorder.start();

    // Visual de gravação
    const btn = document.getElementById('chatAudioBtn');
    if (btn) { btn.textContent = '⏹'; btn.classList.add('recording'); }

    // Limite de 60s
    _recordTimer = setTimeout(() => stopRecording(), 60000);

    showToast('gravando... solte pra enviar');
  } catch(e) {
    showToast('permita acesso ao microfone');
    _isRecording = false;
  }
}

function stopRecording(e) {
  if (e) e.preventDefault();
  if (!_isRecording || !_mediaRecorder) return;
  _isRecording = false;
  clearTimeout(_recordTimer);
  _mediaRecorder.stop();

  const btn = document.getElementById('chatAudioBtn');
  if (btn) { btn.textContent = '🎤'; btn.classList.remove('recording'); }
}

async function uploadAudio(blob) {
  showToast('enviando áudio...');
  try {
    const formData = new FormData();
    formData.append('file', blob, `audio_${Date.now()}.webm`);
    formData.append('upload_preset', CLOUDINARY_PRESET);
    formData.append('folder', 'nosso-lugar/audio');
    formData.append('resource_type', 'video'); // Cloudinary trata áudio como video

    const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`, {
      method: 'POST', body: formData
    });
    const data = await res.json();
    if (!data.secure_url) throw new Error('sem URL');

    const { collection, addDoc, serverTimestamp } = window.firebaseDbLib;
    const msgData = {
      type:      'audio',
      audioUrl:  data.secure_url,
      nickname:  _chatNickname,
      createdAt: serverTimestamp(),
      edited:    false,
      text:      '',
    };
    if (_replyingTo) {
      msgData.replyTo = {
        id:       _replyingTo.id || '',
        nickname: _replyingTo.nickname || '',
        text:     _replyingTo.text || '',
        type:     _replyingTo.type || 'text',
      };
      cancelReply();
    }
    await addDoc(collection(window.firebaseDb, 'chat'), msgData);
  } catch(e) {
    console.error(e);
    showToast('erro ao enviar áudio');
  }
}

// =============================================
// EMOJIS
// =============================================
const EMOJIS = [
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💞','💓','💗','💖','💝','💘',
  '😊','😍','🥰','😘','😗','😙','😚','🤗','😄','😁','😂','🥹','😭','🥺','😢',
  '✨','🌙','⭐','🌟','💫','🔥','🌸','🌹','🌷','🌻','🍀','🦋','🌈','🎵','🎶',
  '👑','💎','🫂','🤝','👋','🙏','💪','🫶','👀','💯','🎉','🎊','🎁','🍫','🍓'
];

function buildEmojiPicker() {
  const picker = document.getElementById('emojiPicker');
  if (!picker) return;
  EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = emoji; btn.className = 'emoji-item';
    btn.onclick = () => insertEmoji(emoji);
    picker.appendChild(btn);
  });
}

function insertEmoji(emoji) {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const pos = input.selectionStart;
  input.value = input.value.slice(0, pos) + emoji + input.value.slice(pos);
  input.focus();
  input.setSelectionRange(pos + emoji.length, pos + emoji.length);
}

function toggleEmojiPicker() {
  const picker = document.getElementById('emojiPicker');
  if (!picker) return;
  picker.style.display = picker.style.display !== 'none' ? 'none' : 'grid';
}

function closeEmojiPicker() {
  const picker = document.getElementById('emojiPicker');
  if (picker) picker.style.display = 'none';
}

document.addEventListener('click', (e) => {
  const picker  = document.getElementById('emojiPicker');
  const emojiBtn = document.querySelector('.chat-emoji-btn');
  if (picker && !picker.contains(e.target) && e.target !== emojiBtn) {
    picker.style.display = 'none';
  }
});

// =============================================
// UTILS
// =============================================
function scrollToBottom() {
  const c = document.getElementById('chatMessages');
  if (c) c.scrollTop = c.scrollHeight;
}

function escapeHtmlChat(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}