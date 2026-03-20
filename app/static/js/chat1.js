
var socket = io();

let destinataire = null;
let groupdest= null;

const now = new Date();
const temps = now.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' });


function appendMessage(msg, me=false, time=null, nom = null) {
    const wrap = document.createElement('div');
    wrap.className = 'flex ' + (me ? 'justify-end' : 'justify-start');

    const bubble = document.createElement('div');
    bubble.className = (me ? 'bg-brand-600 rounded-br-none' : 'bg-slate-800/70 rounded-bl-none') +
        ' max-w-[60%] rounded-2xl px-4 py-2 text-sm text-slate-100 shadow ring-1 ring-white/10 animate-[fadeIn_.3s_ease-out]';

    // Ajout du texte + heure
    bubble.innerHTML = `
      ${nom ? `<span class="block text-[10px] text-slate-400 mt-1">${nom}</span>` : ''}
      <p class="break-words">
        <span class="emoji-text">${msg}</span>
      </p>
      ${time ? `<span class="block text-[10px] text-slate-400 mt-1">${time}</span>` : ''}
    `;

    wrap.appendChild(bubble);
    const container = document.getElementById('messagesArea');
    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
}

socket.on('message', function(msg){
    appendMessage(msg, false);
});

function sendMessage(){
    var input = document.getElementById('message');
    var msg = input.value.trim();
    if (!msg) return;
    // on verifie si le message est privé 
    if (destinataire){
      socket.emit('message_prive', {
        exp: currentUser.id,
        dest: destinataire,
        mes:msg
      });
      appendMessage(msg, true, temps);
    }else if(groupdest){
      socket.emit('message_group',{
        exp: currentUser.id,
        dest: groupdest,
        mes:msg
      });
      appendMessage(msg, true, temps);
    }
    
    input.value = '';
    socket.emit('stopTyping');
    input.focus();
}


/* Indication d' ecriture*/ 
var writedetec=document.getElementById('message');
var indicateurEcriture = document.getElementById('indicateurEcriture');
writedetec.addEventListener('input', () =>{
  if (writedetec.value != ''){
    socket.emit('typing');
  }
  else{
    socket.emit('stopTyping');
  }
});
socket.on('typing',()=>{
  indicateurEcriture.classList.remove('hidden');
});
socket.on('stopTyping',()=>{
  indicateurEcriture.classList.add('hidden');
});

/** button de recherche */

var btn = document.getElementById('btnrech');
btn.addEventListener('click', () => {
  // Vérifie si un champ existe déjà
  if (!document.getElementById('searchInput')) {
    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'searchInput';
    input.placeholder = 'Rechercher...';
    input.className = "px-2 py-1 text-sm rounded-md bg-slate-800 text-slate-200 border border-slate-600 focus:outline-none focus:border-emerald-400";

    // Insère juste avant le bouton
    btn.parentNode.insertBefore(input, btn);
    input.focus();

    // Filtrage en temps réel
    searchInput.addEventListener('input', function() {
      filterMessages(searchInput.value);
    });
  }else{
    var input = document.getElementById('searchInput');
    filterMessages(input.value);

  }
});

// Fermer automatiquement si on clique ailleurs
document.addEventListener('click', (e) => {
  if (searchInput && !searchInput.contains(e.target) && e.target !== btn) {
    searchInput.remove();
    searchInput = null;
  }
});

/** fonction pour filtré les messages */

function filterMessages(query) {
  const container = document.getElementById('chat');
  const wraps = container.querySelectorAll('.flex'); // chaque message est dans un div.flex

  wraps.forEach(wrap => {
    const bubble = wrap.querySelector('div'); // la bulle du message
    if (bubble && bubble.textContent.toLowerCase().includes(query.toLowerCase())) {
      wrap.style.display = ''; // garde le style original (flex)
    } else {
      wrap.style.display = 'none'; // masque le message
    }
  });
}


// Dès la connexion on envoie l'id au serveur 
socket.emit('join', { user_id: currentUser.id });


// On met a jour la liste 
socket.on('update_members', function(data) {
  const userList = document.getElementById('userList');
  userList.innerHTML = '';

  // Mettre à jour le compteur en ligne
  document.getElementById('countOnline').textContent = data.countOnline;

  // Afficher les utilisateurs
  data.users.forEach(user => {
    const li = document.createElement('li');
    li.className = "flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg hover:bg-slate-700/30 transition";

    // Point vert si en ligne
    const onlineDot = user.online 
      ? '<span class="w-2 h-2 rounded-full bg-emerald-400 inline-block ml-1"></span>'
      : '';

    li.innerHTML = `
      <div class="flex items-center gap-2">
        <i class="fas fa-user w-5 h-5 text-slate-400"></i>
        <span class="text-sm text-slate-200">${user.fullname}</span>
        ${onlineDot}
      </div>
    `;
    li.addEventListener('click',()=>{
      // Retirer la classe de tous les autres
      document.querySelectorAll('#userList li').forEach(el => el.classList.remove('selected-user'));
      // Ajouter la classe à l’utilisateur cliqué
      li.classList.add('selected-user');
      document.getElementById('zonetext').classList.remove('hidden');
      document.getElementById('chat').classList.remove('bg-img');
      ouvrirchatpv(user.id, user.fullname);
    })
    userList.appendChild(li);
  });

  // Séparateur
  const separator = document.createElement('li');
  separator.className = "text-xs text-slate-500 mt-2 mb-1";
  separator.textContent = "Groupes";
  userList.appendChild(separator);

  // Afficher les groupes
  data.groups.forEach(group => {
    const li = document.createElement('li');
    li.className = "flex items-center justify-between px-3 py-2 cursor-pointer rounded-lg hover:bg-slate-700/30 transition";
    li.innerHTML = `
      <div classe="gap-2">
        <i class="fas fa-users w-5 h-5 text-slate-400"></i>
        <span class="text-sm text-slate-200">${group.nomGroup}</span>
      </div>
      ${group.unread > 0 ? `<span class="ml-2 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">${group.unread} <i class="fas fa-envelope"></i>
      </span>` : ""}
    `;
    li.addEventListener('click',()=>{
      document.querySelectorAll('#userList li').forEach(el => el.classList.remove('selected-user') );
      li.classList.add('selected-user');
      document.getElementById('zonetext').classList.remove('hidden');
      document.getElementById('chat').classList.remove('bg-img');
      ouvrirchatgp(group.id, group.nomGroup);
      // 👉 remettre le compteur à zéro quand on ouvre le groupe
      socket.emit("messages_lu", { group_id: group.id, user_id: currentUser.id });
    })
    userList.appendChild(li);
  });
});

function ouvrirchatpv(userId, fullname) {
  const profil = document.getElementById('profil');
  const welcome = document.getElementById('welcomeMessage');
  const messagesArea = document.getElementById('messagesArea');

  // Nettoyer le profil et recréer le bloc
  profil.innerHTML = `
    <div class="mb-2 flex flex-col items-center justify-center">
      <i class="fa-solid fa-circle-user text-4xl  text-slate-400"></i>
      <div class="text-center">
        <p class="text-sm text-slate-200 font-semibold">${fullname}</p>
        <p class="text-xs text-slate-500">Discussion privée</p>
      </div>
    </div>
  `;
  destinataire = userId;
  groupdest = null;
  // Masquer le message de bienvenue
  if (welcome) welcome.style.display = "flex";

  // Nettoyer la zone des messages
  messagesArea.innerHTML = '';

  // Demander au serveur l’historique des messages privés
  socket.emit('load_private', { from: currentUser.id, to: userId });
}

// Chargement de tout les messages de discussion
socket.on('private_history', (messages) => {
  const messagesArea = document.getElementById('messagesArea');
  messagesArea.innerHTML = '';

  messages.forEach(m => {
    appendMessage(m.text, m.exp === currentUser.id, m.time);
  });
});

// Réception d’un nouveau message privé (ajout direct sans recharger)
socket.on('private_message', (data) => {
  appendMessage(data.mes, data.exp === currentUser.id, data.time);
});

function openGroupModal() {
  const modal = document.getElementById("groupModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  // déclenche l’animation fade-in
  setTimeout(() => {
    modal.classList.remove("opacity-0");
    modal.querySelector("div").classList.remove("scale-95");
  }, 10);

  socket.emit("get_users"); // charger la liste des utilisateurs
}

function closeGroupModal() {
  const modal = document.getElementById("groupModal");
  modal.classList.add("opacity-0");
  modal.querySelector("div").classList.add("scale-95");

  // attendre la fin de l’animation avant de cacher
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }, 300);
}

socket.on("users_list", function(users) {
  const userSelect = document.getElementById("userSelect");
  userSelect.innerHTML = "";
  users.forEach(u => {
    userSelect.innerHTML += `
      <label class="flex items-center gap-2 text-slate-200">
        <input type="checkbox" value="${u.id}" class="user-checkbox accent-emerald-500"/>
        ${u.fullname}
      </label>
    `;
  });
});

function createGroup() {
  const name = document.getElementById("groupName").value;
  const selected = [...document.querySelectorAll(".user-checkbox:checked")].map(cb => cb.value);
   // Ajouter automatiquement l’utilisateur courant
  if (!selected.includes(String(currentUser.id))) {
    selected.push(currentUser.id);
  }

  socket.emit("create_group", { name: name, members: selected });
  closeGroupModal();
}

function ouvrirchatgp(groupId, groupname) {
  const profil = document.getElementById('profil');
  const welcome = document.getElementById('welcomeMessage');
  const messagesArea = document.getElementById('messagesArea');

  // Nettoyer le profil et recréer le bloc
  profil.innerHTML = `
    <div class="mb-2 flex flex-col items-center justify-center">
      <i class="fas fa-users w-5 h-5 text-2xl mb-2 text-slate-400"></i>
      <div class="text-center">
        <p class="text-sm text-slate-200 font-semibold">${groupname}</p>
        <p class="text-xs text-slate-500">Discussion privée</p>
      </div>
    </div>
  `;
  groupdest = groupId;
  destinataire = null;
  // Masquer le message de bienvenue
  if (welcome) welcome.style.display = "flex";

  // Nettoyer la zone des messages
  messagesArea.innerHTML = '';
  // joindre le groupe
  socket.emit("join_group", { group_id: groupId, user_id: currentUser.id });
  // Demander au serveur l’historique des messages du groupe
  socket.emit("load_group", { group_id: groupId });
}

socket.on("group_history", (messages) => {
  const messagesArea = document.getElementById("messagesArea");
  messagesArea.innerHTML = "";
  messages.forEach(m => {
    if (m.exp !== currentUser.id){appendMessage(m.text, m.exp === currentUser.id, m.time, m.sender);}
    else{ appendMessage(m.text, m.exp === currentUser.id, m.time);}
  });
});

socket.on("group_message", (data) => {
  if ( data.exp !== currentUser.id){
    appendMessage(data.mes,data.exp === currentUser.id, data.time, data.sender);
  }
});

// la recherche d'un utilisateur ou un groupe
var btnSidebarSearch = document.getElementById('btnrech1');
btnSidebarSearch.addEventListener('click', () => {
  if (!document.getElementById('sidebarSearchInput')) {
    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'sidebarSearchInput';
    input.placeholder = 'Rechercher un utilisateur ou un groupe...';
    input.className = "w-full px-2 py-1 text-sm rounded-md bg-slate-800 text-slate-200 border border-slate-600 focus:outline-none focus:border-emerald-400";

    // Insérer au-dessus de la liste
    const userList = document.getElementById('userList');
    userList.parentNode.insertBefore(input, userList);

    input.focus();

    // Filtrage en temps réel
    input.addEventListener('input', function() {
      filterSidebar(input.value);
    });
  }
});

//fonction de filtrage
function filterSidebar(query) {
  const userList = document.getElementById('userList');
  const items = userList.querySelectorAll('li');

  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    if (text.includes(query.toLowerCase())) {
      item.style.display = ''; // visible
    } else {
      item.style.display = 'none'; // caché
    }
  });
}
//si on clique sur une zone de la page le champs de recherche disparaitre
document.addEventListener('click', (e) => {
  const input = document.getElementById('sidebarSearchInput');
  if (input && !input.contains(e.target) && e.target !== btnSidebarSearch) {
    input.remove();
  }
});


const emojiBtn = document.getElementById("emojibtn"); // ton bouton 😊
const emojiPicker = document.getElementById("emojiPicker");
const inputMessage = document.getElementById("message");

// Initialiser le picker
emojiPicker.innerHTML = "<emoji-picker></emoji-picker>";
const picker = emojiPicker.querySelector("emoji-picker");

// Toggle affichage du picker
emojiBtn.addEventListener("click", () => {
  emojiPicker.classList.toggle("hidden");
});

// Quand un emoji est choisi
picker.addEventListener("emoji-click", (event) => {
  const emoji = event.detail.unicode;
  inputMessage.value += emoji;   // 👉 insérer dans le champ
  emojiPicker.classList.add("hidden"); // refermer après sélection
  inputMessage.focus();
});

const themeToggle = document.getElementById("themeToggle");
const iconSun = document.getElementById("iconSun");
const iconMoon = document.getElementById("iconMoon");
const body = document.body;

// Charger le thème sauvegardé (si présent)
if (localStorage.getItem("theme") === "light") {
  body.classList.add("light-theme");
  iconSun.classList.remove("hidden");
  iconMoon.classList.add("hidden");
} else {
  body.classList.add("dark-theme");
  iconSun.classList.add("hidden");
  iconMoon.classList.remove("hidden");
}

themeToggle.addEventListener("click", () => {
  if (body.classList.contains("dark-theme")) {
    body.classList.remove("dark-theme");
    body.classList.add("light-theme");
    iconSun.classList.remove("hidden");
    iconMoon.classList.add("hidden");
    localStorage.setItem("theme", "light");
  } else {
    body.classList.remove("light-theme");
    body.classList.add("dark-theme");
    iconSun.classList.add("hidden");
    iconMoon.classList.remove("hidden");
    localStorage.setItem("theme", "dark");
  }
});