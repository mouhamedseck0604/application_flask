// ─── Avatar color palette ───
    const AVATAR_COLORS = [
      ['#d97706','#fff7ed'], ['#059669','#ecfdf5'], ['#dc2626','#fef2f2'],
      ['#7c3aed','#f5f3ff'], ['#0891b2','#ecfeff'], ['#db2777','#fdf4ff'],
      ['#65a30d','#f7fee7'], ['#ea580c','#fff7ed'],
    ];
    function avatarColor(name) {
      let hash = 0; 
      for (let c of (name||'?')) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
      return AVATAR_COLORS[hash % AVATAR_COLORS.length];
    }
    function initials(name) {
      return (name||'?').slice(0,2).toUpperCase();
    }

    // ─── Theme toggle ───
    let dark = true;
    document.getElementById('themeToggle').addEventListener('click', () => {
      dark = !dark;
      document.documentElement.classList.toggle('dark', dark);
    });

    // ─── Message counter ───
    let msgCount = 0;
    function incrementMsgCount() {
      document.getElementById('countMessages').textContent = ++msgCount;
    }

    // ─── Append message ───
    window.appendMessage = function(username, text, isSelf = false, isSystem = false) {
      const chat = document.getElementById('chat');
      const wrapper = document.createElement('div');
      wrapper.classList.add('msg-in');

      if (isSystem) {
        wrapper.innerHTML = `
          <div class="flex justify-center">
            <div class="bubble-system px-4 py-2 text-xs text-slate-400 font-medium">${text}</div>
          </div>`;
      } else if (isSelf) {
        const [bg] = avatarColor(username);
        const now = new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
        wrapper.innerHTML = `
          <div class="flex items-end gap-2 justify-end">
            <div class="max-w-[72%]">
              <div class="flex items-center justify-end gap-2 mb-1">
                <span class="text-[11px] text-slate-500">${now}</span>
                <span class="text-xs text-amber-400 font-semibold">Vous</span>
              </div>
              <div class="bubble-out px-4 py-2.5 text-sm font-medium shadow-md">${escHtml(text)}</div>
              <div class="flex justify-end mt-1">
                <svg class="h-3 w-3 text-amber-400 opacity-70" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
            </div>
            <div class="user-avatar text-xs" style="background:${bg};color:#fff">${initials(username)}</div>
          </div>`;
      } else {
        const [bg] = avatarColor(username);
        const now = new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
        wrapper.innerHTML = `
          <div class="flex items-end gap-2">
            <div class="user-avatar text-xs" style="background:${bg};color:#fff">${initials(username)}</div>
            <div class="max-w-[72%]">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-semibold" style="color:${bg}">${escHtml(username)}</span>
                <span class="text-[11px] text-slate-500">${now}</span>
              </div>
              <div class="bubble-in px-4 py-2.5 text-sm text-slate-200 shadow">${escHtml(text)}</div>
            </div>
          </div>`;
      }

      chat.appendChild(wrapper);
      chat.scrollTop = chat.scrollHeight;
      incrementMsgCount();
    };

    // ─── Escape HTML ───
    function escHtml(str) {
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ─── Update user list ───
    window.updateUserList = function(users) {
      const ul = document.getElementById('userList');
      document.getElementById('countOnline').textContent = users.length;
      if (!users.length) {
        ul.innerHTML = '<li class="text-slate-500 text-sm text-center py-6 opacity-60"><span class="text-2xl block mb-2">🌙</span>Aucun utilisateur</li>';
        return;
      }
      ul.innerHTML = users.map(u => {
        const [bg] = avatarColor(u);
        return `<li class="user-item border border-transparent flex items-center gap-3">
          <div class="relative">
            <div class="user-avatar text-xs" style="background:${bg};color:#fff">${initials(u)}</div>
            <div class="online-dot absolute -bottom-0.5 -right-0.5"></div>
          </div>
          <span class="text-sm text-slate-300 font-medium truncate">${escHtml(u)}</span>
        </li>`;
      }).join('');
    };

    // ─── sendMessage stub (kept for compatibility with chat.js) ───
    window.sendMessage = window.sendMessage || function() {
      const input = document.getElementById('message');
      const text = input.value.trim();
      if (!text) return;
      // Simulate local display (will be overridden by chat.js socket logic)
      appendMessage('{{current_user.username}}', text, true);
      input.value = '';
      input.focus();
    };

    // ─── Input glow on focus ───
    document.getElementById('message').addEventListener('focus', function() {
      this.style.borderColor = 'rgba(245,158,11,0.4)';
    });
    document.getElementById('message').addEventListener('blur', function() {
      this.style.borderColor = 'rgba(255,255,255,0.09)';
    });

    (function() {
  const root = document.documentElement;
  const stored = localStorage.getItem('theme');
  const preferDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (preferDark) root.classList.add('dark');

  const btn = document.getElementById('themeToggle');
  const iconSun = document.getElementById('iconSun');
  const iconMoon = document.getElementById('iconMoon');

  // fonction pour mettre à jour l’icône
  function updateIcon() {
    if (root.classList.contains('dark')) {
      iconSun.classList.add('hidden');
      iconMoon.classList.remove('hidden');
    } else {
      iconMoon.classList.add('hidden');
      iconSun.classList.remove('hidden');
    }
  }

  updateIcon(); // au chargement

  if (btn) {
    btn.addEventListener('click', () => {
      root.classList.toggle('dark');
      const mode = root.classList.contains('dark') ? 'dark' : 'light';
      localStorage.setItem('theme', mode);
      updateIcon();
    });
  }
})();


socket.on('private_message', (data) => {
  const messagesArea = document.getElementById('messagesArea');

  // Vérifier si le message vient de moi ou de l’autre
  const isMe = (data.exp === currentUser.id);

  // Créer un bloc message
  const wrap = document.createElement('div');
  wrap.className = 'flex ' + (isMe ? 'justify-end' : 'justify-start');

  const bubble = document.createElement('div');
  bubble.className = (isMe ? 'bg-brand-600 rounded-br-none' : 'bg-slate-800/70 rounded-bl-none') +
    ' max-w-[60%] rounded-2xl px-4 py-2 text-sm text-slate-100 shadow ring-1 ring-white/10 animate-[fadeIn_.3s_ease-out]';

  bubble.innerHTML = `
    <p>${data.mes}</p>
    <span class="block text-[10px] text-slate-400 mt-1">${data.time}</span>
  `;

  wrap.appendChild(bubble);
  messagesArea.appendChild(wrap);

  // Scroll automatique vers le bas
  messagesArea.scrollTop = messagesArea.scrollHeight;
});