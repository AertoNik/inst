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
    name: 'Artem',
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

let currentGridTab = 'posts';
let currentViewItem = null;

function saveStateLocally() { localStorage.setItem('insta_sim_state', JSON.stringify(state)); }

// --- 3. ДВИЖОК СИМУЛЯЦИИ РОСТА И ПАДЕНИЯ ---
// Добавили звезд и инфлюенсеров
const FAKE_USERS = ["mrbeast", "zendaya", "cristiano", "tomholland2013", "leomessi", "dualipa", "snoopdogg", "elonmusk", "gordongram", "billieeilish", "cyber.neo", "detective_sys", "warden_official"];
const FAKE_COMMENTS = ["This is insane! 🔥", "Broooo", "Атмосферно!", "Где это?", "Топ", "Очень красиво 🎬", "bro this is good", "love this", "Шедевр!", "Идеальный свет", "Вайбово", "Keep it up! 👏", "Amazing work"];

// Форматирование чисел (10k, 1.2M)
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

    if (item.type === 'post') {
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
    
    document.getElementById('inp-username').value = state.username;
    document.getElementById('inp-followers').value = state.followers;

    // Галочка
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
    const grid = document.getElementById('profile-grid');
    grid.innerHTML = '';
    const items = state.posts.filter(p => currentGridTab === 'reels' ? p.type === 'reel' : p.type === 'post').reverse();
    document.getElementById('stat-posts').innerText = state.posts.filter(p => p.type !== 'story').length;

    for (const item of items) {
        const src = await getMediaFile(item.id);
        const stats = calculateLiveStats(item);
        
        const div = document.createElement('div');
        div.className = `feed-item ${currentGridTab === 'reels' ? 'reel' : 'square'}`;
        div.onclick = () => openViewer(item, src);
        
        const isVideo = src.startsWith('data:video');
        if (isVideo) {
            div.innerHTML = `
                <video src="${src}" muted></video>
                <div class="feed-icon">▶</div>
                <div class="grid-views-overlay" id="grid-views-${item.id}">▶ ${formatNum(stats.views)}</div>
            `;
        } else {
            div.innerHTML = `<img src="${src}">`;
        }
        grid.appendChild(div);
    }
}

// Динамическое обновление просмотров на обложках
function updateGridViews() {
    state.posts.forEach(p => {
        if (p.type === 'video' || p.type === 'reel') {
            const el = document.getElementById(`grid-views-${p.id}`);
            if (el) {
                const s = calculateLiveStats(p);
                el.innerText = `▶ ${formatNum(s.views)}`;
            }
        }
    });
}

async function renderStories() {
    const bar = document.getElementById('stories-bar');
    bar.innerHTML = '';
    const activeStories = state.posts.filter(p => p.type === 'story' && (Date.now() - p.timestamp) < 300000);

    for (const story of activeStories) {
        const src = await getMediaFile(story.id);
        const div = document.createElement('div');
        div.className = 'story-circle';
        div.onclick = () => openViewer(story, src);
        div.innerHTML = src.startsWith('data:video') ? `<video src="${src}" muted></video>` : `<img src="${src}">`;
        bar.appendChild(div);
    }
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
        
        // Автоопределение для постов (фото или видео)
        let actualType = type;
        if(type === 'post' && file.type.startsWith('video/')) actualType = 'video';

        state.posts.push({ id, type: actualType, timestamp: Date.now(), myComments: [] });
        saveStateLocally();
        updateFullUI();
        closeModals();
        if(type === 'story') switchTab('profile');
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
        infoBox.innerHTML = `<div>👁 ${formatNum(stats.views)} просмотров</div>`;
        storyBar.style.transition = 'none'; storyBar.style.width = '0%';
        setTimeout(() => { storyBar.style.transition = 'width 5s linear'; storyBar.style.width = '100%'; }, 50);
        window.storyTimer = setTimeout(closeModals, 5000);
    } else {
        storyProg.classList.add('hidden');
        commentBox.classList.remove('hidden');
        
        let commentsHTML = '';
        if(item.myComments) item.myComments.forEach(c => commentsHTML += `<div style="margin-bottom:5px"><b>@${state.username}</b> ${c}</div>`);
        for(let i=0; i<Math.min(stats.comments, 6); i++) {
            const u = FAKE_USERS[(i + item.timestamp) % FAKE_USERS.length];
            const t = FAKE_COMMENTS[(i + item.timestamp) % FAKE_COMMENTS.length];
            const vBadge = ['mrbeast', 'zendaya', 'cristiano', 'tomholland2013', 'leomessi', 'elonmusk'].includes(u) ? `<span class="verified-badge" style="width:12px; height:12px;"></span>` : '';
            commentsHTML += `<div style="margin-bottom:5px; color:#aaa"><b>${u}</b>${vBadge} ${t}</div>`;
        }

        infoBox.innerHTML = `
            <div style="font-size:20px; margin-bottom:10px; display:flex; gap:15px">
                <span>❤️ ${formatNum(stats.likes)}</span>
                <span>💬 ${formatNum(stats.comments)}</span>
                <span>↗️ ${formatNum(stats.reposts)}</span>
                ${(item.type === 'reel' || item.type === 'video') ? `<span>👁 ${formatNum(stats.views)}</span>` : ''}
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

// --- 7. ЖИВОЙ ЦИКЛ (Шанс роста 85%, Отписка 15%) ---
setInterval(() => {
    let hasChanges = false;

    // 70% шанс на триггер события каждую секунду
    if (Math.random() > 0.3) {
        let currentF = parseInt(state.followers) || 0;
        let diff = 0;
        
        // Множитель: чем больше база, тем мощнее скачки
        let tierMult = 1;
        if (currentF > 100000) tierMult = 50;
        else if (currentF > 10000) tierMult = 10;
        else if (currentF > 1000) tierMult = 3;

        // 85% шанс роста, 15% шанс отписки
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
    updateGridViews(); // Обновление счетчиков прямо на обложках
}, 2000);

updateFullUI();