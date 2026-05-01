import { saveMedia, getMedia, clearMedia } from './db.js';
import { calculateLiveStats, generateComment } from './simulation.js';

// --- СОСТОЯНИЕ (STATE) ---
const defaultState = {
    theme: 'dark',
    profile: {
        username: 'artnik_film',
        name: 'Artem',
        bio: 'Director / Creator\nARCHETYPE System Active 🎬',
        link: 'github.com',
        followers: 1420,
        following: 35,
        avatarId: null
    },
    content: [] // { id, type: 'photo'|'video'|'reel'|'story', timestamp, randomMultiplier, desc }
};

let state = JSON.parse(localStorage.getItem('sim_state')) || defaultState;
let currentView = 'profile'; 
let currentTab = 'posts';

// --- КЕШИРОВАНИЕ DOM ---
const mainContent = document.getElementById('main-content');
const headerUsername = document.getElementById('header-username');
const navAvatar = document.getElementById('nav-avatar');

// --- ИНИЦИАЛИЗАЦИЯ ---
async function init() {
    document.documentElement.className = state.theme;
    updateHeaderNav();
    switchView('profile');
    
    // Глобальный тик обновления (каждые 3 секунды пересчитываем статы)
    setInterval(() => {
        if (currentView === 'profile') renderProfileGrid();
        if (currentView === 'stats') renderStats();
    }, 3000);
}

function saveState() {
    localStorage.setItem('sim_state', JSON.stringify(state));
    updateHeaderNav();
}

function updateHeaderNav() {
    headerUsername.innerText = `@${state.profile.username}`;
    if (state.profile.avatarId) {
        getMedia(state.profile.avatarId).then(data => { if(data) navAvatar.src = data; });
    }
}

// --- РОУТИНГ И РЕНДЕР ВИДОВ ---
document.getElementById('tab-profile').onclick = () => switchView('profile');
document.getElementById('tab-stats').onclick = () => switchView('stats');
document.getElementById('nav-btn-settings').onclick = () => switchView('settings');

function switchView(viewName) {
    currentView = viewName;
    mainContent.innerHTML = '';
    
    if (viewName === 'profile') renderProfile();
    else if (viewName === 'stats') renderStats();
    else if (viewName === 'settings') renderSettings();
    else if (viewName === 'reels') renderReelsFeed();
}

// === ПРОФИЛЬ ===
async function renderProfile() {
    const avatarSrc = state.profile.avatarId ? await getMedia(state.profile.avatarId) : 'https://api.dicebear.com/7.x/avataaars/svg?seed=noir';
    const postsCount = state.content.filter(c => c.type === 'photo' || c.type === 'video').length;

    mainContent.innerHTML = `
        <div class="animate-fade-in">
            <div class="flex items-center justify-between p-4">
                <div class="w-20 h-20 rounded-full overflow-hidden border border-gray-700">
                    <img src="${avatarSrc}" class="w-full h-full object-cover">
                </div>
                <div class="flex flex-1 justify-around text-center ml-4">
                    <div><div class="font-bold text-lg">${postsCount}</div><div class="text-xs text-gray-400">Публикаций</div></div>
                    <div><div class="font-bold text-lg">${state.profile.followers}</div><div class="text-xs text-gray-400">Подписчиков</div></div>
                    <div><div class="font-bold text-lg">${state.profile.following}</div><div class="text-xs text-gray-400">Подписок</div></div>
                </div>
            </div>
            <div class="px-4 pb-4">
                <h2 class="font-bold">${state.profile.name}</h2>
                <p class="text-sm whitespace-pre-wrap text-gray-300">${state.profile.bio}</p>
                <a href="#" class="text-accent text-sm">${state.profile.link}</a>
            </div>
            <div class="px-4 flex gap-2 mb-4">
                <button onclick="document.getElementById('nav-btn-settings').click()" class="flex-1 bg-gray-800 py-1.5 rounded-lg text-sm font-semibold">Редактировать</button>
                <button class="flex-1 bg-gray-800 py-1.5 rounded-lg text-sm font-semibold">Поделиться</button>
            </div>
            
            <!-- Сторис Круги -->
            <div class="flex gap-4 px-4 overflow-x-auto hide-scrollbar pb-2" id="stories-bar"></div>

            <!-- Табы сетки -->
            <div class="flex border-t border-gray-800">
                <button id="grid-tab-posts" class="flex-1 py-3 border-b-2 ${currentTab === 'posts' ? 'border-white' : 'border-transparent text-gray-500'}">▦ Посты</button>
                <button id="grid-tab-reels" class="flex-1 py-3 border-b-2 ${currentTab === 'reels' ? 'border-white' : 'border-transparent text-gray-500'}">▶ Reels</button>
            </div>
            
            <div id="profile-grid" class="${currentTab === 'reels' ? 'reels-grid' : 'grid grid-cols-3 gap-0.5'}"></div>
        </div>
    `;

    document.getElementById('grid-tab-posts').onclick = () => { currentTab = 'posts'; renderProfile(); };
    document.getElementById('grid-tab-reels').onclick = () => { currentTab = 'reels'; renderProfile(); };

    renderStoriesBar();
    renderProfileGrid();
}

async function renderStoriesBar() {
    const bar = document.getElementById('stories-bar');
    if(!bar) return;
    bar.innerHTML = '';
    const now = Date.now();
    
    // Активные сторис (младше 5 минут)
    const activeStories = state.content.filter(c => c.type === 'story' && (now - c.timestamp) < 300000);
    
    for (const story of activeStories) {
        const src = await getMedia(story.id);
        const div = document.createElement('div');
        div.className = 'flex flex-col items-center gap-1 cursor-pointer flex-shrink-0';
        div.onclick = () => openViewer(story, src);
        div.innerHTML = `
            <div class="story-ring w-16 h-16"><img src="${src}" class="w-full h-full rounded-full border-2 border-black object-cover"></div>
        `;
        bar.appendChild(div);
    }
}

async function renderProfileGrid() {
    const grid = document.getElementById('profile-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const items = state.content.filter(c => currentTab === 'reels' ? c.type === 'reel' : (c.type === 'photo' || c.type === 'video')).reverse();
    
    for (const item of items) {
        const src = await getMedia(item.id);
        const stats = calculateLiveStats(item, state.profile.followers);
        
        const div = document.createElement('div');
        div.className = `relative cursor-pointer group ${currentTab === 'reels' ? 'reels-item' : 'aspect-square'} bg-gray-900`;
        div.onclick = () => openViewer(item, src, stats);
        
        const mediaTag = item.type === 'video' || item.type === 'reel' 
            ? `<video src="${src}" class="w-full h-full object-cover" muted></video>` 
            : `<img src="${src}" class="w-full h-full object-cover">`;

        div.innerHTML = `
            ${mediaTag}
            <div class="absolute inset-0 bg-black/50 hidden group-hover:flex justify-center items-center gap-4 text-white font-bold text-sm">
                <span>❤️ ${stats.likes}</span>
                ${item.type !== 'photo' ? `<span>👁 ${stats.views}</span>` : ''}
            </div>
            ${item.type === 'video' || item.type === 'reel' ? '<div class="absolute top-2 right-2 text-white">▶</div>' : ''}
        `;
        grid.appendChild(div);
    }
}

// === ПРОСМОТРЩИК (VIEWER / MODAL) ===
const viewerModal = document.getElementById('viewer-modal');
const viewerContent = document.getElementById('viewer-content');
const viewerInfo = document.getElementById('viewer-info');
const viewerProgress = document.getElementById('viewer-progress');
const viewerBar = document.getElementById('viewer-bar');

function openViewer(item, src, stats = null) {
    viewerModal.classList.remove('hidden');
    viewerModal.classList.add('flex');
    viewerContent.innerHTML = '';
    
    const mediaObj = (item.type === 'video' || item.type === 'reel') 
        ? `<video src="${src}" class="w-full max-h-full object-contain" autoplay loop controls></video>`
        : `<img src="${src}" class="w-full max-h-full object-contain">`;
    
    viewerContent.innerHTML = mediaObj;

    if (item.type === 'story') {
        const currentStats = calculateLiveStats(item, state.profile.followers);
        viewerProgress.classList.remove('hidden');
        viewerInfo.innerHTML = `<div class="text-white">👁 Просмотров: ${currentStats.views}</div>`;
        
        // Симуляция таймера сторис (как в инсте)
        viewerBar.style.width = '0%';
        setTimeout(() => viewerBar.style.width = '100%', 50);
        item.viewerTimeout = setTimeout(closeViewer, 5000);
    } else {
        viewerProgress.classList.add('hidden');
        
        // Фейковые комменты для визуала
        let commentsHTML = '';
        for(let i=0; i<Math.min(stats.commentsCount, 5); i++) {
            const c = generateComment();
            commentsHTML += `<div class="text-sm"><span class="font-bold">${c.user}</span> ${c.text}</div>`;
        }

        viewerInfo.innerHTML = `
            <div class="text-white">
                <div class="flex gap-4 text-xl mb-2">
                    <span>❤️ ${stats.likes}</span>
                    <span>💬 ${stats.commentsCount}</span>
                    <span>↗️ ${stats.reposts}</span>
                    ${item.type !== 'photo' ? `<span>👁 ${stats.views}</span>` : ''}
                </div>
                <p class="text-sm mb-2"><span class="font-bold">${state.profile.username}</span> ${item.desc || ''}</p>
                <div class="h-20 overflow-y-auto text-gray-300 hide-scrollbar border-t border-gray-700 pt-2">
                    ${commentsHTML || '<span class="text-xs opacity-50">Комментариев пока нет</span>'}
                </div>
            </div>
        `;
    }
}

function closeViewer() {
    viewerModal.classList.add('hidden');
    viewerModal.classList.remove('flex');
    viewerContent.innerHTML = ''; // Очистка чтобы видео перестало играть
}
document.getElementById('close-viewer').onclick = closeViewer;

// === ДОБАВЛЕНИЕ КОНТЕНТА ===
const addModal = document.getElementById('add-modal');
document.getElementById('nav-btn-add').onclick = () => { addModal.classList.remove('hidden'); addModal.classList.add('flex'); };
document.getElementById('close-add-modal').onclick = () => { addModal.classList.add('hidden'); addModal.classList.remove('flex'); };

async function handleUpload(e, type) {
    const file = e.target.files[0];
    if (!file) return;
    
    // В реальном приложении здесь был бы вызов к UI для ввода описания
    const desc = type !== 'story' ? prompt('Введите описание публикации:', '') : '';
    
    const id = Date.now().toString();
    const reader = new FileReader();
    
    reader.onload = async (event) => {
        const dataUrl = event.target.result;
        await saveMedia(id, dataUrl); // Сохраняем в IndexedDB
        
        state.content.push({
            id,
            type: type === 'post' ? (file.type.startsWith('video') ? 'video' : 'photo') : type,
            timestamp: Date.now(),
            desc: desc || '',
            randomMultiplier: 0.8 + Math.random() * 0.4 // Множитель от 0.8 до 1.2
        });
        
        saveState();
        addModal.classList.add('hidden');
        addModal.classList.remove('flex');
        if(type === 'story') currentTab = 'posts'; // Возвращаем на главную
        switchView('profile');
    };
    reader.readAsDataURL(file);
}

document.getElementById('upload-post').onchange = (e) => handleUpload(e, 'post');
document.getElementById('upload-reel').onchange = (e) => handleUpload(e, 'reel');
document.getElementById('upload-story').onchange = (e) => handleUpload(e, 'story');

// === СТАТИСТИКА ===
function renderStats() {
    let totalLikes = 0, totalViews = 0, totalComments = 0;
    
    state.content.forEach(item => {
        const s = calculateLiveStats(item, state.profile.followers);
        totalLikes += s.likes || 0;
        totalViews += s.views || 0;
        totalComments += s.commentsCount || 0;
    });

    mainContent.innerHTML = `
        <div class="p-4 animate-fade-in">
            <h2 class="text-2xl font-bold mb-6">Статистика ARCHETYPE</h2>
            
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-gray-900 p-4 rounded-xl border border-gray-800">
                    <div class="text-xs text-gray-400 uppercase tracking-wider">Подписчики</div>
                    <div class="text-2xl font-display text-accent">${state.profile.followers}</div>
                </div>
                <div class="bg-gray-900 p-4 rounded-xl border border-gray-800">
                    <div class="text-xs text-gray-400 uppercase tracking-wider">Охват (Просмотры)</div>
                    <div class="text-2xl font-display">${totalViews}</div>
                </div>
                <div class="bg-gray-900 p-4 rounded-xl border border-gray-800">
                    <div class="text-xs text-gray-400 uppercase tracking-wider">Лайки</div>
                    <div class="text-2xl font-display">${totalLikes}</div>
                </div>
                <div class="bg-gray-900 p-4 rounded-xl border border-gray-800">
                    <div class="text-xs text-gray-400 uppercase tracking-wider">Комментарии</div>
                    <div class="text-2xl font-display">${totalComments}</div>
                </div>
            </div>
            
            <div class="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-6">
                <h3 class="font-bold mb-2">Активность алгоритма</h3>
                <p class="text-sm text-gray-400">Алгоритмы симуляции работают в реальном времени. Чем больше подписчиков, тем сильнее маховик охватов. Истории исчезают из публичного доступа через 5 минут.</p>
            </div>
        </div>
    `;
}

// === НАСТРОЙКИ ===
function renderSettings() {
    mainContent.innerHTML = `
        <div class="p-4 animate-fade-in flex flex-col gap-4">
            <h2 class="text-xl font-bold mb-2">Настройки Профиля</h2>
            
            <div class="flex flex-col gap-1">
                <label class="text-xs text-gray-400">Никнейм</label>
                <input type="text" id="set-username" value="${state.profile.username}" class="bg-gray-900 border border-gray-700 p-2 rounded text-white">
            </div>
            
            <div class="flex flex-col gap-1">
                <label class="text-xs text-gray-400">Подписчики (Манипуляция алгоритмом)</label>
                <input type="number" id="set-followers" value="${state.profile.followers}" class="bg-gray-900 border border-gray-700 p-2 rounded text-accent font-bold">
            </div>
            
            <div class="flex gap-4 mt-4">
                <label class="btn-primary text-center flex-1 cursor-pointer">
                    Сменить Аватар
                    <input type="file" id="set-avatar" accept="image/*" class="hidden">
                </label>
            </div>

            <button id="save-settings" class="bg-accent text-white py-3 rounded-lg font-bold mt-2">Сохранить изменения</button>
            
            <div class="mt-8 pt-4 border-t border-gray-800">
                <button id="danger-reset" class="w-full bg-red-900/30 text-red-500 py-3 rounded-lg font-bold border border-red-900">⚠️ Сбросить весь прогресс (Очистить БД)</button>
            </div>
        </div>
    `;

    document.getElementById('set-avatar').onchange = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            await saveMedia('avatar', event.target.result);
            state.profile.avatarId = 'avatar';
            saveState();
            alert('Аватар загружен. Сохраните изменения.');
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('save-settings').onclick = () => {
        state.profile.username = document.getElementById('set-username').value;
        state.profile.followers = parseInt(document.getElementById('set-followers').value) || 0;
        saveState();
        switchView('profile');
    };

    document.getElementById('danger-reset').onclick = async () => {
        if(confirm('Точно удалить все посты, рилсы, сторис и настройки?')) {
            localStorage.clear();
            await clearMedia();
            location.reload();
        }
    };
}

// Запуск
init();