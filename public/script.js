const html = document.documentElement;
const toggleBtn = document.getElementById('toggle');
const greeting = document.getElementById('greeting');
const orb = document.getElementById('orb');
const landing = document.getElementById('landing');
const chat = document.getElementById('chat');
const messages = document.getElementById('messages');
const mainInput = document.getElementById('input');
const chatInput = document.getElementById('chatInput');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.querySelector('.sidebar-overlay');

// === GENERATION STATE ===
let controller = null; // Untuk mengontrol abort/stop request
let isGenerating = false;

// === AUTH STATE ===
let authToken = localStorage.getItem('auth_token');

// === FILE STATE ===
let attachedFile = null;

// === 0. SESSION MANAGEMENT ===
// Membuat ID unik sederhana menggunakan timestamp
let currentSessionId = localStorage.getItem('last_session_id') || 'chat-' + Date.now();

// === 1. KONFIGURASI MARKED (FIX [object Object]) ===
const renderer = new marked.Renderer();

// Fungsi ini sekarang otomatis mendeteksi apakah marked mengirim string atau objek
renderer.code = function (arg1, arg2) {
  let code, lang;

  // Cek apakah argumen pertama adalah objek (Marked versi baru)
  if (typeof arg1 === 'object' && arg1 !== null && arg1.text) {
    code = arg1.text;
    lang = arg1.lang;
  } else {
    // Fallback untuk Marked versi lama
    code = arg1;
    lang = arg2;
  }

  // Pastikan bahasa valid untuk highlight.js
  const validLang = hljs.getLanguage(lang) ? lang : 'plaintext';

  // Highlight kode
  let highlighted;
  try {
    highlighted = hljs.highlight(code, { language: validLang }).value;
  } catch (e) {
    highlighted = code; // Jika gagal, tampilkan teks biasa
  }

  return `
    <div class="code-wrapper">
      <div class="code-header">
        <span>${validLang}</span>
        <button class="copy-btn" onclick="copyCode(this)">
          <i class="fas fa-copy"></i> Copy
        </button>
      </div>
      <pre><code class="hljs language-${validLang}">${highlighted}</code></pre>
    </div>`;
};

marked.setOptions({
  renderer: renderer,
  highlight: function (code, lang) {
    // Backup highlight jika renderer gagal
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
});

// === 2. THEME LOGIC ===
const savedTheme = localStorage.getItem('theme') || 'light';
html.dataset.theme = savedTheme;
toggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

toggleBtn.onclick = () => {
  const isDark = html.dataset.theme === 'dark';
  html.dataset.theme = isDark ? 'light' : 'dark';
  toggleBtn.textContent = isDark ? '🌙' : '☀️';
  localStorage.setItem('theme', html.dataset.theme);
};

// === 3. GREETING ===
function updateGreeting() {
  const hour = new Date().getHours();
  let greet = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  greeting.textContent = `${greet}, Dias`;
}
updateGreeting();

// === 4. AUTO RESIZE ===
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}
mainInput.addEventListener('input', () => autoResize(mainInput));
chatInput.addEventListener('input', () => autoResize(chatInput));

// === HELPER: UPDATE BUTTON STATE ===
function updateSendButtonsState(generating) {
  const sendIcons = document.querySelectorAll('.btn-send i, .chat-input-fixed button i');
  sendIcons.forEach((icon) => {
    if (generating) {
      icon.className = 'fas fa-stop'; // Ubah icon jadi kotak (stop)
    } else {
      icon.className = 'fas fa-paper-plane'; // Balik ke icon kirim
    }
  });
}

function stopGeneration() {
  if (controller) {
    controller.abort();
    controller = null;
  }
}

// === 5. CORE CHAT LOGIC ===
async function processChat(text) {
  if (!text && !attachedFile) return;
  if (isGenerating) return; // Cegah double submit

  isGenerating = true;
  updateSendButtonsState(true);
  controller = new AbortController(); // Init controller baru

  // UI Transition
  if (!landing.classList.contains('hidden')) {
    landing.classList.add('hidden');
    chat.classList.remove('hidden');
  }

  // Add User Message
  const userDiv = document.createElement('div');
  userDiv.className = 'msg user';
  
  if (attachedFile) {
    userDiv.innerHTML = text ? text.replace(/\n/g, '<br>') + `<br><small style="opacity:0.8"><i>📄 Melampirkan: ${attachedFile.name}</i></small>` 
                             : `<i>📄 Melampirkan: ${attachedFile.name}</i>`;
  } else {
    userDiv.textContent = text;
  }
  
  messages.appendChild(userDiv);
  messages.scrollTop = messages.scrollHeight;

  // Add Bot Loading
  orb.classList.add('thinking');
  const botDiv = document.createElement('div');
  botDiv.className = 'msg bot';
  botDiv.innerHTML = '<span class="typing">Thinking...</span>';
  messages.appendChild(botDiv);

  try {
    let finalPayloadText = text || '';

    // PENANGANAN UPLOAD SEBELUM CHAT
    if (attachedFile) {
      botDiv.innerHTML = '<span class="typing">Mengekstrak dokumen... (Mohon tunggu)</span>';
      const formData = new FormData();
      formData.append('file', attachedFile);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      });

      const uploadData = await uploadRes.json();
      
      if (uploadRes.ok && uploadData.text) {
        finalPayloadText = `${finalPayloadText}\n\n[Isi Dokumen ${attachedFile.name}]:\n${uploadData.text}`;
      } else {
        throw new Error(uploadData.error || 'Gagal mengekstrak dokumen.');
      }

      // Bersihkan indikator lampiran
      attachedFile = null;
      document.querySelectorAll('input[type="file"]').forEach(inp => {
        inp.value = '';
        const btn = inp.nextElementSibling;
        if (btn) {
          const icon = btn.querySelector('i');
          if (icon) icon.className = 'fas fa-paperclip';
          btn.style.color = '';
        }
      });
      mainInput.placeholder = "Initiate a query or send a command to the AI...";
      chatInput.placeholder = "Type your message...";
      
      botDiv.innerHTML = '<span class="typing">Memikirkan kecocokan...</span>';
    }

    const res = await fetch('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ message: text, sessionId: currentSessionId }),
      signal: controller.signal, // Hubungkan signal abort
    });

    if (res.status === 401 || res.status === 403) {
      alert('Sesi habis. Silakan login ulang.');
      logout();
      return;
    }
    if (!res.ok) throw new Error('Server Error');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;

      // Render Markdown secara Real-time
      botDiv.innerHTML = marked.parse(fullText);

      // Re-highlight code blocks
      botDiv.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });

      messages.scrollTop = messages.scrollHeight;
    }

    // Refresh history list after chat
    loadHistory();
  } catch (err) {
    if (err.name === 'AbortError') {
      botDiv.innerHTML += '<br><small style="opacity:0.7"><i>(Stopped by user)</i></small>';
    } else {
      botDiv.innerHTML = '⚠️ <b>Gagal menghubungi AI.</b><br>';
      botDiv.classList.add('error');

      // Tambahkan Tombol Retry
      const retryBtn = document.createElement('button');
      retryBtn.className = 'btn-retry';
      retryBtn.innerHTML = '<i class="fas fa-redo"></i> Ulangi';
      retryBtn.onclick = () => {
        botDiv.remove(); // Hapus pesan error
        processChat(text); // Coba lagi dengan teks yang sama
      };
      botDiv.appendChild(retryBtn);
    }
  } finally {
    orb.classList.remove('thinking');
    isGenerating = false;
    controller = null;
    updateSendButtonsState(false);
  }
}

// === 6. FITUR COPY CODE ===
window.copyCode = function (btn) {
  const wrapper = btn.closest('.code-wrapper');
  const code = wrapper.querySelector('code').textContent; // Ambil teks asli
  navigator.clipboard.writeText(code).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => {
      btn.innerHTML = original;
    }, 2000);
  });
};

// === 7. INPUT HANDLERS ===
function send() {
  if (isGenerating) {
    stopGeneration();
    return;
  }
  const text = mainInput.value.trim();
  if (!text && !attachedFile) return;
  processChat(text);
  mainInput.value = '';
  mainInput.style.height = 'auto';
}

function sendChat() {
  if (isGenerating) {
    stopGeneration();
    return;
  }
  const text = chatInput.value.trim();
  if (!text && !attachedFile) return;
  processChat(text);
  chatInput.value = '';
  chatInput.style.height = 'auto';
}

mainInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
});

// === 8. NEW CHAT FEATURE ===
const newChatBtn = document.querySelector('.btn-new-chat');
if (newChatBtn) {
  newChatBtn.addEventListener('click', () => {
    startNewChat();
  });
}

function startNewChat() {
  currentSessionId = 'chat-' + Date.now();
  localStorage.setItem('last_session_id', currentSessionId);
  // 2. Bersihkan UI
  messages.innerHTML = '';
  chat.classList.add('hidden');
  landing.classList.remove('hidden');
}

// === 9. AUTHENTICATION UI & LOGIC ===

function checkAuth() {
  if (!authToken) {
    // Redirect ke Landing Page jika belum login
    window.location.href = '/landing.html';
  } else {
    loadHistory();
    addLogoutButton();
  }
}

function addLogoutButton() {
  const sidebar = document.querySelector('.sidebar');
  // Cek agar tidak duplikat
  if (!sidebar || document.querySelector('.btn-logout')) return;

  const logoutBtn = document.createElement('div');
  logoutBtn.className = 'nav-item btn-logout';
  logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
  logoutBtn.onclick = logout;

  // Insert before user profile so profile stays at bottom
  const userProfile = sidebar.querySelector('.user-profile');
  if (userProfile) {
    sidebar.insertBefore(logoutBtn, userProfile);
  } else {
    sidebar.appendChild(logoutBtn);
  }
}

window.showAuthModal = function (type) {
  const existing = document.querySelector('.auth-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'auth-overlay';

  const isLogin = type === 'login';

  overlay.innerHTML = `
    <div class="auth-box">
      <h2>${isLogin ? 'Welcome Back' : 'Create Account'}</h2>
      <input type="email" id="auth-email" class="auth-input" placeholder="Email Address">
      <input type="password" id="auth-pass" class="auth-input" placeholder="Password">
      <button class="auth-btn" onclick="${isLogin ? 'doLogin()' : 'doSignup()'}">
        ${isLogin ? 'Login' : 'Sign Up'}
      </button>
      <div class="auth-link" onclick="showAuthModal('${isLogin ? 'signup' : 'login'}')">
        ${isLogin ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Login'}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
};

window.doLogin = async () => {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-pass').value;

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      authToken = data.token;
      localStorage.setItem('auth_token', authToken);
      document.querySelector('.auth-overlay').remove();
      checkAuth(); // Refresh UI untuk masuk ke aplikasi
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert('Gagal menghubungi server. Pastikan server berjalan.');
    console.error(err);
  }
};

window.doSignup = async () => {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-pass').value;

  try {
    const res = await fetch('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    alert(data.message || data.error);
  } catch (err) {
    alert('Gagal menghubungi server. Pastikan server berjalan.');
    console.error(err);
  }
};

function logout() {
  localStorage.removeItem('auth_token');
  window.location.href = '/landing.html';
}

// === 10. HISTORY MANAGEMENT ===
async function loadHistory() {
  const list = document.getElementById('history-dropdown');
  if (!list) return;

  const res = await fetch('/api/chats', {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  if (res.ok) {
    const chats = await res.json();
    list.innerHTML = '';
    chats.forEach((c) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.textContent = c.title || 'Untitled Chat';
      item.onclick = () => loadChatSession(c.id);
      list.appendChild(item);
    });
  }
}

// === HISTORY DROPDOWN LOGIC ===
const historyToggle = document.getElementById('history-toggle');
const historyDropdown = document.getElementById('history-dropdown');
const historyArrow = document.getElementById('history-arrow');

if (historyToggle) {
  historyToggle.addEventListener('click', () => {
    historyDropdown.classList.toggle('active');
    if (historyDropdown.classList.contains('active')) {
      historyArrow.style.transform = 'rotate(180deg)';
    } else {
      historyArrow.style.transform = 'rotate(0deg)';
    }
  });
}

async function loadChatSession(id) {
  currentSessionId = id;
  localStorage.setItem('last_session_id', id);

  const res = await fetch(`/api/chat/${id}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  const msgs = await res.json();

  // UI Update
  landing.classList.add('hidden');
  chat.classList.remove('hidden');
  messages.innerHTML = '';

  msgs.forEach((m) => {
    const div = document.createElement('div');
    div.className = `msg ${m.role === 'assistant' ? 'bot' : 'user'}`;
    div.innerHTML = m.role === 'assistant' ? marked.parse(m.content) : m.content;
    messages.appendChild(div);

    // Highlight code blocks
    if (m.role === 'assistant') {
      div.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  });
  messages.scrollTop = messages.scrollHeight;
}

// === 11. MOBILE SIDEBAR LOGIC ===
window.toggleSidebar = function () {
  sidebar.classList.toggle('active');
  sidebarOverlay.classList.toggle('active');
};

// === 12. FILE UPLOAD LOGIC ===
window.handleFileUpload = function (input) {
  const file = input.files[0];
  if (!file) return;

  attachedFile = file;

  // Ganti klip jadi ikon file berwarna biru (success state)
  const btnIcon = input.nextElementSibling.querySelector('i');
  btnIcon.className = 'fas fa-file-alt'; 
  input.nextElementSibling.style.color = 'var(--primary)';

  mainInput.placeholder = `Melampirkan: ${file.name} - Ketik pesan tambahan atau kirim...`;
  chatInput.placeholder = `Melampirkan: ${file.name} - Ketik pesan tambahan atau kirim...`;
};

// Init
checkAuth();
