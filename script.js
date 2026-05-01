// --- 1. ЛОКАЛЬНАЯ БАЗА ДАННЫХ (Для фото и видео) ---
// IndexedDB спасает нас от лимита localStorage в 5мб.
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
    followers: 1420,
    following: 35,
    avatarId: null,
    posts: [] // {id, type: 'post'|'reel'|'story', timestamp, myComments: []}
};

let state = JSON.parse(localStorage.getItem('insta_sim_state')) || defaultState;
let currentGridTab = 'posts';
let currentViewItem = null; // Для модалки комментариев

function saveState() {
    localStorage.setItem('insta_sim_state', JSON.stringify(state));
    updateUIFromState();
}

// --- 3. ДВИЖОК СИМУЛЯЦИИ РОСТА ---
const FAKE_COMMENTS = ["Вау 🔥", "Атмосферно!", "Где это?", "Топ", "Очень красиво 🎬", "bro this is good", "love this", "Шедевр!"];
const FAKE_USERS = ["cyber.neo", "dark_matter", "detective_sys", "neon_dreamer", "pastry.pro"];

// Вычисляет лайки/просмотры в зависимости от времени публикации и числа подписчиков
function calculateLiveStats(item) {
    const ageMinutes = Math.max((Date.now() - item.timestamp) / 60000, 0);
    const f = parseInt(state.followers) || 0;
    
    let likes = 0, views = 0, comments = 0, reposts = 0;

    if (item.type === 'story') {
        const progress = Math.min(ageMinutes / 5, 1); // Живет 5 минут
        views = Math.floor(f * 0.4 * progress); // до 40% охвата
        return { views };
    }

    // Логарифмический рост: быстро в начале, медленно потом
    const growth = Math.log10(ageMinutes * 2 + 1);

    if (item.type === 'post') {
        likes = Math.floor(f * 0.15 * growth);
        comments = Math.floor(likes * 0.05);
        reposts = Math.floor(likes * 0.02);
    } else if (item.type === 'reel') {
        views = Math.floor(f * 1.5 * growth); // Виральность (больше подписчиков)
        likes = Math.floor(views * 0.12);
        comments = Math.floor(likes * 0.1);
        reposts = Math.floor(views * 0.05);
    }

    // Добавляем свои комменты к фейковым
    const myCommentsCount = item.myComments ? item.myComments.length : 0;

    return { likes, views, comments: comments + myCommentsCount, reposts };
}

// --- 4. ИНТЕРФЕЙС И ЛОГИКА ---
function updateUIFromState() {
    // Тема
    document.body.className = state.theme === 'dark' ? 'dark-mode' : '';
    
    // Тексты в профиле
    document.getElementById('header-username').innerText = `@${state.username}`;
    document.getElementById('stat-followers').innerText = state.followers;
    document.getElementById('stat-following').innerText = state.following;
    
    // Настройки
    document.getElementById('inp-username').value = state.username;
    document.getElementById('inp-followers').value = state.followers;

    // Аватар
    if (state.avatarId) {
        getMediaFile(state.avatarId).then(src => {
            if(src) document.getElementById('profile-avatar').src = src;
        });
    }

    renderGrid();
    renderStories();
    renderStatsPage();
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

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveState();
}

function saveSettings() {
    state.username = document.getElementById('inp-username').value;
    state.followers = document.getElementById('inp-followers').value;
    saveState();
    switchTab('profile');
}

async function resetProgress() {
    if(confirm('Точно сбросить? Все фото и видео удалятся.')) {
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
        const div = document.createElement('div');
        div.className = `feed-item ${currentGridTab === 'reels' ? 'reel' : 'square'}`;
        div.onclick = () => openViewer(item, src);
        
        const isVideo = src.startsWith('data:video');
        div.innerHTML = isVideo 
            ? `<video src="${src}" muted></video><div class="feed-icon">▶</div>` 
            : `<img src="${src}">`;
        
        grid.appendChild(div);
    }
}

async function renderStories() {
    const bar = document.getElementById('stories-bar');
    bar.innerHTML = '';
    
    // Оставляем только сторис младше 5 минут (300000 мс)
    const activeStories = state.posts.filter(p => p.type === 'story' && (Date.now() - p.timestamp) < 300000);

    for (const story of activeStories) {
        const src = await getMediaFile(story.id);
        const div = document.createElement('div');
        div.className = 'story-circle';
        div.onclick = () => openViewer(story, src);
        
        const isVideo = src.startsWith('data:video');
        div.innerHTML = isVideo ? `<video src="${src}" muted></video>` : `<img src="${src}">`;
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
    document.getElementById('total-views').innerText = tViews;
    document.getElementById('total-likes').innerText = tLikes;
    document.getElementById('total-comments').innerText = tComments;
    document.getElementById('total-reposts').innerText = tReposts;
}

// --- 6. ЗАГРУЗКА И ПРОСМОТР (Модалки) ---
function openAddModal() { document.getElementById('modal-add').classList.remove('hidden'); }
function closeModals() { 
    document.getElementById('modal-add').classList.add('hidden'); 
    document.getElementById('modal-viewer').classList.add('hidden');
    document.getElementById('viewer-media').innerHTML = ''; // стоп видео
    clearTimeout(window.storyTimer);
}

// Универсальный обработчик загрузки
async function handleUpload(e, type) {
    const file = e.target.files[0];
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        const id = 'media_' + Date.now();
        await saveMediaFile(id, event.target.result);
        
        state.posts.push({ id, type, timestamp: Date.now(), myComments: [] });
        saveState();
        closeModals();
        if(type === 'story') switchTab('profile');
    };
    reader.readAsDataURL(file);
}

document.getElementById('avatar-upload').onchange = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        await saveMediaFile('avatar', ev.target.result);
        state.avatarId = 'avatar';
        saveState();
    };
    reader.readAsDataURL(file);
};

document.getElementById('upload-post').onchange = (e) => handleUpload(e, 'post');
document.getElementById('upload-reel').onchange = (e) => handleUpload(e, 'reel');
document.getElementById('upload-story').onchange = (e) => handleUpload(e, 'story');

// Открытие фото/видео во весь экран
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
    mediaBox.innerHTML = isVideo 
        ? `<video src="${src}" autoplay loop controls></video>` 
        : `<img src="${src}">`;

    const stats = calculateLiveStats(item);

    if (item.type === 'story') {
        storyProg.classList.remove('hidden');
        commentBox.classList.add('hidden');
        infoBox.innerHTML = `<div>👁 ${stats.views} просмотров</div>`;
        
        storyBar.style.transition = 'none'; storyBar.style.width = '0%';
        setTimeout(() => {
            storyBar.style.transition = 'width 5s linear'; 
            storyBar.style.width = '100%';
        }, 50);
        window.storyTimer = setTimeout(closeModals, 5000);
    } else {
        storyProg.classList.add('hidden');
        commentBox.classList.remove('hidden');
        
        // Генерируем HTML для комментов
        let commentsHTML = '';
        if(item.myComments) {
            item.myComments.forEach(c => commentsHTML += `<div style="margin-bottom:5px"><b>@${state.username}</b> ${c}</div>`);
        }
        for(let i=0; i<Math.min(stats.comments, 3); i++) {
            const u = FAKE_USERS[i % FAKE_USERS.length];
            const t = FAKE_COMMENTS[(i + item.timestamp) % FAKE_COMMENTS.length];
            commentsHTML += `<div style="margin-bottom:5px; color:#aaa"><b>${u}</b> ${t}</div>`;
        }

        infoBox.innerHTML = `
            <div style="font-size:20px; margin-bottom:10px; display:flex; gap:15px">
                <span>❤️ ${stats.likes}</span>
                <span>💬 ${stats.comments}</span>
                <span>↗️ ${stats.reposts}</span>
                ${item.type === 'reel' ? `<span>👁 ${stats.views}</span>` : ''}
            </div>
            <div style="max-height:100px; overflow-y:auto; font-size:14px; border-top:1px solid #333; padding-top:10px;">
                ${commentsHTML || '<div style="color:#777">Нет комментариев</div>'}
            </div>
        `;
    }
}

// Оставить свой комментарий
function addMyComment() {
    const inp = document.getElementById('my-comment-input');
    if(inp.value.trim() && currentViewItem) {
        if(!currentViewItem.myComments) currentViewItem.myComments = [];
        currentViewItem.myComments.push(inp.value.trim());
        inp.value = '';
        saveState(); // сохраняем
        
        // Обновляем вьювер
        getMediaFile(currentViewItem.id).then(src => openViewer(currentViewItem, src));
    }
}

// --- 7. ЖИВОЙ ЦИКЛ ---
// Каждые 3 секунды пересчитываем статы (создает эффект живой активности)
setInterval(() => {
    renderStatsPage();
    renderStories(); // Чтобы сторис старше 5 мин пропадали
}, 3000);

// СТАРТ
updateUIFromState();