// --- 0. БИБЛИОТЕКА ИКОНОК (SVG) ---
const ICO_HEART = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
const ICO_COMMENT = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;
const ICO_SHARE = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
const ICO_EYE = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const ICO_PLAY = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="currentColor" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;

// --- 1. ЛОКАЛЬНАЯ БАЗА ДАННЫХ (Для медиа) ---
const DB_NAME = 'InstaSimDB';
function initDB() {
   return new Promise((resolve, reject) => {
       const req = indexedDB.open(DB_NAME, 1);
       req.onupgradeneeded = (e) => e.target.result.createObjectStore('media');
       req.onsuccess = () => resolve(req.result);
       req.onerror = () => reject(req.error);
   });
}
async function saveMediaFile(id, dataUrl) {
   const db = await initDB();
   return new Promise(resolve => {
       const tx = db.transaction('media', 'readwrite');
       tx.objectStore('media').put(dataUrl, id);
       tx.oncomplete = () => resolve();
   });
}
async function getMediaFile(id) {
   const db = await initDB();
   return new Promise(resolve => {
       const req = db.transaction('media', 'readonly').objectStore('media').get(id);
       req.onsuccess = () => resolve(req.result);
   });
}
async function clearDB() {
   const db = await initDB();
   db.transaction('media', 'readwrite').objectStore('media').clear();
}

// --- 2. УПРАВЛЕНИЕ СОСТОЯНИЕМ (STATE) ---
const defaultState = {
   theme: 'dark',
   username: 'artnik_film',
   bioName: 'Твое Имя',
   bioText: 'Режиссер / Креатор\nARCHETYPE System',
   verified: false,
   followers: 1420,
   following: 35,
   avatarId: null,
   posts: [],
   history: []
};

let state = JSON.parse(localStorage.getItem('insta_sim_state')) || defaultState;
if (!state.history) state.history = [];
if (state.verified === undefined) state.verified = false;
if (!state.bioName) state.bioName = defaultState.bioName;
if (!state.bioText) state.bioText = defaultState.bioText;

let currentGridTab = 'posts';
let currentViewItem = null;

function saveStateLocally() { localStorage.setItem('insta_sim_state', JSON.stringify(state)); }

// --- 3. ДВИЖОК СИМУЛЯЦИИ РОСТА И ПАДЕНИЯ ---
const STAR_USERS = ["mrbeast", "zendaya", "cristiano", "tomholland2013", "leomessi", "elonmusk"];
const REGULAR_USERS = ["cyber.neo", "detective_sys", "warden_official", "pastry.pro", "night_owl", "shadow.walker", "neon_dreamer", "art.lover99", "cinematic.vibe", "urban.explore", "user_19924"];
const FAKE_COMMENTS = ["This is insane! 🔥", "Broooo", "Атмосферно!", "Где это?", "Топ", "Очень красиво 🎬", "bro this is good", "love this", "Шедевр!", "Идеальный свет", "Вайбово", "Keep it up! 👏", "Amazing work", "Ну это развал 🤯", "Научи так же", "Как всегда на высоте"];

function formatNum(num) {
   if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
   if (num >= 10000) return (num / 1000).toFixed(1) + 'k';
   return num.toLocaleString('ru-RU');
}

function calculateLiveStats(item) {
   const ageMinutes = Math.max((Date.now() - item.timestamp) / 60000, 0);
   const f = parseInt(state.followers) || 0;
  
   let likes = 0, views = 0, comments = 0, reposts = 0;

   if (item.type === 'story') {
       const progress = Math.min(ageMinutes / 5, 1);
       views = Math.floor(f * 0.4 * progress);
       return { views };
   }

   const growth = Math.log10(ageMinutes * 2 + 1);

   // Добавили поддержку старых фото (item.type === 'photo')
   if (item.type === 'post' || item.type === 'photo') {
       likes = Math.floor(f * 0.15 * growth);
       comments = Math.floor(likes * 0.05);
       reposts = Math.floor(likes * 0.02);
   } else if (item.type === 'reel' || item.type === 'video') {
       views = Math.floor(f * 1.5 * growth);
       likes = Math.floor(views * 0.12);
       comments = Math.floor(likes * 0.1);
       reposts = Math.floor(views * 0.05);
   }

   const myCommentsCount = item.myComments ? item.myComments.length : 0;
   return { likes, views, comments: comments + myCommentsCount, reposts };
}

// --- 4. ИНТЕРФЕЙС И ЛОГИКА ---
function updateFullUI() {
   document.body.className = state.theme === 'dark' ? 'dark-mode' : '';
   document.getElementById('header-name-text').innerText = `@${state.username}`;
   document.getElementById('stat-followers').innerText = formatNum(state.followers);
   document.getElementById('stat-following').innerText = state.following;
   document.getElementById('bio-name').innerText = state.bioName;
   document.getElementById('bio-text').innerText = state.bioText;
   document.getElementById('inp-username').value = state.username;
   document.getElementById('inp-followers').value = state.followers;

   const badges = [document.getElementById('badge-header'), document.getElementById('badge-bio')];
   const btnVerify = document.getElementById('btn-verify');
   if (state.verified) {
       badges.forEach(b => b.classList.remove('hidden'));
       btnVerify.innerText = "Убрать галочку верификации";
   } else {
       badges.forEach(b => b.classList.add('hidden'));
       btnVerify.innerText = "Включить галочку верификации";
   }

   if (state.avatarId) {
       getMediaFile(state.avatarId).then(src => { if(src) document.getElementById('profile-avatar').src = src; });
   }

   renderGrid();
   renderStories();
   renderStatsPage();
}

function updateLiveNumbers() {
   document.getElementById('stat-followers').innerText = formatNum(state.followers);
}

function switchTab(tabId) {
   document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
   document.getElementById(`view-${tabId}`).classList.add('active');
   closeModals();
}

function setGridTab(tab) {
   currentGridTab = tab;
   document.getElementById('tab-btn-posts').classList.toggle('active', tab === 'posts');
   document.getElementById('tab-btn-reels').classList.toggle('active', tab === 'reels');
   renderGrid();
}

function toggleTheme() { state.theme = state.theme === 'dark' ? 'light' : 'dark'; saveStateLocally(); document.body.className = state.theme === 'dark' ? 'dark-mode' : ''; }
function toggleVerification() { state.verified = !state.verified; saveStateLocally(); updateFullUI(); }

function saveSettings() {
   state.username = document.getElementById('inp-username').value;
   state.followers = parseInt(document.getElementById('inp-followers').value) || 0;
   saveStateLocally();
   updateFullUI();
   switchTab('profile');
}

async function resetProgress() {
   if(confirm('Точно сбросить? Все фото, история и статистика удалятся навсегда.')) {
       localStorage.removeItem('insta_sim_state');
       await clearDB();
       location.reload();
   }
}

// --- 5. РЕНДЕР КОНТЕНТА ---
async function renderGrid() {
   // Жесткая фильтрация: Reels только в табе Reels, остальное в Постах
   const items = state.posts.filter(p => {
       if (currentGridTab === 'reels') return p.type === 'reel';
       return p.type === 'post' || p.type === 'photo' || p.type === 'video';
   }).reverse();

   // Счетчик постов (без учета сторис)
   document.getElementById('stat-posts').innerText = state.posts.filter(p => p.type !== 'story').length;

   const fragment = document.createDocumentFragment();

   for (const item of items) {
       const src = await getMediaFile(item.id);
       if (!src) continue; // Защита от битых файлов

       const stats = calculateLiveStats(item);
      
       const div = document.createElement('div');
       div.className = `feed-item ${currentGridTab === 'reels' ? 'reel' : 'square'}`;
       div.onclick = () => openViewer(item, src);
      
       const isVideo = src.startsWith('data:video');
       if (isVideo) {
           div.innerHTML = `
               <video src="${src}" muted></video>
               <div class="feed-icon" style="display:flex; align-items:center;">${ICO_PLAY}</div>
               <div class="grid-views-overlay" id="grid-views-${item.id}" style="display:flex; align-items:center; gap:4px;">${ICO_PLAY} ${formatNum(stats.views)}</div>
           `;
       } else {
           div.innerHTML = `<img src="${src}">`;
       }
       fragment.appendChild(div);
   }

   const grid = document.getElementById('profile-grid');
   grid.innerHTML = '';
   grid.appendChild(fragment);
}

function updateGridViews() {
   state.posts.forEach(p => {
       if (p.type === 'video' || p.type === 'reel') {
           const el = document.getElementById(`grid-views-${p.id}`);
           if (el) {
               const s = calculateLiveStats(p);
               el.innerHTML = `${ICO_PLAY} ${formatNum(s.views)}`;
           }
       }
   });
}

async function renderStories() {
   const activeStories = state.posts.filter(p => p.type === 'story' && (Date.now() - p.timestamp) < 300000);
   const fragment = document.createDocumentFragment();

   for (const story of activeStories) {
       const src = await getMediaFile(story.id);
       if (!src) continue;

       const div = document.createElement('div');
       div.className = 'story-circle';
       div.onclick = () => openViewer(story, src);
       div.innerHTML = src.startsWith('data:video') ? `<video src="${src}" muted></video>` : `<img src="${src}">`;
       fragment.appendChild(div);
   }

   const bar = document.getElementById('stories-bar');
   bar.innerHTML = '';
   bar.appendChild(fragment);
}

function renderStatsPage() {
   let tLikes = 0, tViews = 0, tComments = 0, tReposts = 0;
   state.posts.forEach(p => {
       const s = calculateLiveStats(p);
       tLikes += s.likes || 0; tViews += s.views || 0;
       tComments += s.comments || 0; tReposts += s.reposts || 0;
   });
   document.getElementById('total-views').innerText = formatNum(tViews);
   document.getElementById('total-likes').innerText = formatNum(tLikes);
   document.getElementById('total-comments').innerText = formatNum(tComments);
   document.getElementById('total-reposts').innerText = formatNum(tReposts);

   let plus24 = 0, minus24 = 0;
   const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
   state.history.forEach(h => {
       if (h.ts > dayAgo) {
           if (h.diff > 0) plus24 += h.diff;
           else minus24 += Math.abs(h.diff);
       }
   });
   document.getElementById('stat-24-plus').innerText = formatNum(plus24);
   document.getElementById('stat-24-minus').innerText = formatNum(minus24);
}

// --- 6. ВЬЮВЕР И ЗАГРУЗКА ---
function openAddModal() { document.getElementById('modal-add').classList.remove('hidden'); }
function closeModals() {
   document.getElementById('modal-add').classList.add('hidden');
   document.getElementById('modal-viewer').classList.add('hidden');
   document.getElementById('viewer-media').innerHTML = '';
   clearTimeout(window.storyTimer);
}

async function handleUpload(e, type) {
   const file = e.target.files[0];
   if(!file) return;
   const reader = new FileReader();
   reader.onload = async (event) => {
       const id = 'media_' + Date.now();
       await saveMediaFile(id, event.target.result);
      
       let actualType = type;
       // Если заливаем Пост, но это видеофайл — ставим тип video
       if(type === 'post' && file.type.startsWith('video/')) actualType = 'video';

       state.posts.push({ id, type: actualType, timestamp: Date.now(), myComments: [] });
       saveStateLocally();
      
       closeModals();
      
       if (type === 'story') {
           renderStories();
       } else {
           // Автоматически открываем нужную вкладку
           setGridTab(actualType === 'reel' ? 'reels' : 'posts');
       }
      
       if (!document.getElementById('view-profile').classList.contains('active')) {
           switchTab('profile');
       }
   };
   reader.readAsDataURL(file);
}

document.getElementById('avatar-upload').onchange = async (e) => {
   const file = e.target.files[0];
   if(!file) return;
   const reader = new FileReader();
   reader.onload = async (ev) => { await saveMediaFile('avatar', ev.target.result); state.avatarId = 'avatar'; saveStateLocally(); updateFullUI(); };
   reader.readAsDataURL(file);
};
document.getElementById('upload-post').onchange = (e) => handleUpload(e, 'post');
document.getElementById('upload-reel').onchange = (e) => handleUpload(e, 'reel');
document.getElementById('upload-story').onchange = (e) => handleUpload(e, 'story');

function openViewer(item, src) {
   currentViewItem = item;
   const viewer = document.getElementById('modal-viewer');
   const mediaBox = document.getElementById('viewer-media');
   const infoBox = document.getElementById('viewer-info');
   const commentBox = document.getElementById('my-comment-box');
   const storyProg = document.getElementById('story-progress');
   const storyBar = document.getElementById('story-bar');
  
   viewer.classList.remove('hidden');
   const isVideo = src.startsWith('data:video');
   mediaBox.innerHTML = isVideo ? `<video src="${src}" autoplay loop controls></video>` : `<img src="${src}">`;
   const stats = calculateLiveStats(item);

   if (item.type === 'story') {
       storyProg.classList.remove('hidden');
       commentBox.classList.add('hidden');
       infoBox.innerHTML = `<div style="display:flex; align-items:center; gap:6px; font-weight: 600;">${ICO_EYE} ${formatNum(stats.views)} просмотров</div>`;
       storyBar.style.transition = 'none'; storyBar.style.width = '0%';
       setTimeout(() => { storyBar.style.transition = 'width 5s linear'; storyBar.style.width = '100%'; }, 50);
       window.storyTimer = setTimeout(closeModals, 5000);
   } else {
       storyProg.classList.add('hidden');
       commentBox.classList.remove('hidden');
      
       let commentsHTML = '';
       if(item.myComments) item.myComments.forEach(c => commentsHTML += `<div style="margin-bottom:8px"><b>@${state.username}</b> <span style="color:#eee">${c}</span></div>`);
      
       const commentsToShow = Math.min(stats.comments, 15);
       for(let i=0; i<commentsToShow; i++) {
           let u, vBadge = '';
          
           if (Math.random() < 0.1) {
               u = STAR_USERS[(i + item.timestamp) % STAR_USERS.length];
               vBadge = `<span class="verified-badge" style="width:12px; height:12px;"></span>`;
           } else {
               u = REGULAR_USERS[(i + item.timestamp) % REGULAR_USERS.length];
           }
          
           const t = FAKE_COMMENTS[(i + item.timestamp) % FAKE_COMMENTS.length];
           commentsHTML += `<div style="margin-bottom:8px; color:#aaa; line-height: 1.3;"><b>${u}</b>${vBadge} <span style="color:#eee">${t}</span></div>`;
       }

       infoBox.innerHTML = `
           <div style="margin-bottom:15px; display:flex; gap:18px; align-items:center;">
               <span style="display:flex; align-items:center; gap:5px; font-weight:600;">${ICO_HEART} ${formatNum(stats.likes)}</span>
               <span style="display:flex; align-items:center; gap:5px; font-weight:600;">${ICO_COMMENT} ${formatNum(stats.comments)}</span>
               <span style="display:flex; align-items:center; gap:5px; font-weight:600;">${ICO_SHARE} ${formatNum(stats.reposts)}</span>
               ${(item.type === 'reel' || item.type === 'video') ? `<span style="display:flex; align-items:center; gap:5px; font-weight:600;">${ICO_EYE} ${formatNum(stats.views)}</span>` : ''}
           </div>
           <div style="max-height:150px; overflow-y:auto; font-size:14px; border-top:1px solid #333; padding-top:10px;">
               ${commentsHTML || '<div style="color:#777">Нет комментариев</div>'}
           </div>
       `;
   }
}

function addMyComment() {
   const inp = document.getElementById('my-comment-input');
   if(inp.value.trim() && currentViewItem) {
       if(!currentViewItem.myComments) currentViewItem.myComments = [];
       currentViewItem.myComments.push(inp.value.trim());
       inp.value = '';
       saveStateLocally();
       getMediaFile(currentViewItem.id).then(src => openViewer(currentViewItem, src));
   }
}

// --- 7. ЖИВОЙ ЦИКЛ ---
setInterval(() => {
   let hasChanges = false;

   if (Math.random() > 0.3) {
       let currentF = parseInt(state.followers) || 0;
       let diff = 0;
       let tierMult = 1;
       if (currentF > 100000) tierMult = 50;
       else if (currentF > 10000) tierMult = 10;
       else if (currentF > 1000) tierMult = 3;

       if (Math.random() < 0.15) {
           diff = -(Math.floor(Math.random() * 2 * tierMult) + 1);
       } else {
           diff = Math.floor(Math.random() * 4 * tierMult) + 1;
       }

       if (currentF + diff < 0) diff = -currentF;

       if (diff !== 0) {
           state.followers = currentF + diff;
           state.history.push({ ts: Date.now(), diff: diff });
           hasChanges = true;
       }
   }

   const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
   if (state.history.length > 0 && state.history[0].ts < dayAgo) {
       state.history = state.history.filter(h => h.ts > dayAgo);
       hasChanges = true;
   }

   if (hasChanges) {
       saveStateLocally();
       updateLiveNumbers();
   }

   renderStatsPage();
   renderStories();
   updateGridViews();
}, 2000);

// Автосохранение при редактировании имени и описания
document.getElementById('bio-name').addEventListener('input', (e) => {
   state.bioName = e.target.innerText;
   saveStateLocally();
});
document.getElementById('bio-text').addEventListener('input', (e) => {
   state.bioText = e.target.innerText;
   saveStateLocally();
});
updateFullUI();