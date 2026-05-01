// Элементы
const appBody = document.body;
const themeToggle = document.getElementById('theme-toggle');
const resetBtn = document.getElementById('reset-btn');

// Элементы профиля
const followersEl = document.getElementById('followers-count');
const followingEl = document.getElementById('following-count');
const postsCountEl = document.getElementById('posts-count');
const profileAvatar = document.getElementById('profile-avatar');
const homeAvatar = document.getElementById('home-avatar');
const navAvatar = document.getElementById('nav-avatar');

// Хранилища
let isDarkMode = false;
let postsData = [];
let storiesData = [];
let totalLikesEarned = 0;
let sessionsCount = 1;

// Константы
const STORY_LIFETIME_MS = 5 * 60 * 1000; // 5 минут
const FAKE_USERS = ['artnik_film', 'detective_sys', 'cyber.neo', 'pastry.chef.pro', 'warden_official'];

// ==========================================
// НАВИГАЦИЯ И ВИДЫ
// ==========================================
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    if(viewId === 'view-home') renderFakeFeed();
}

// ==========================================
// ТЕМА И НАСТРОЙКИ
// ==========================================
themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    appBody.classList.toggle('dark-mode', isDarkMode);
    saveState();
});

resetBtn.addEventListener('click', () => {
    if(confirm('Точно удалить все фото, сторис и прогресс?')) {
        localStorage.clear();
        location.reload();
    }
});

// ==========================================
// СТОРИС (5 минут жизни + просмотры)
// ==========================================
document.getElementById('add-story-btn').addEventListener('click', () => document.getElementById('story-upload').click());

document.getElementById('story-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        storiesData.push({ 
            id: Date.now(), 
            url: event.target.result, 
            timestamp: Date.now(),
            views: 0 
        });
        renderStoriesFeed();
        saveState();
    };
    reader.readAsDataURL(file);
});

function renderStoriesFeed() {
    const feed = document.getElementById('home-stories');
    const addBtn = document.getElementById('add-story-btn');
    feed.innerHTML = '';
    feed.appendChild(addBtn);

    const now = Date.now();
    // Фильтруем: оставляем только те, что моложе 5 минут
    storiesData = storiesData.filter(s => now - s.timestamp < STORY_LIFETIME_MS);
    
    document.getElementById('active-stories-stat').innerText = storiesData.length;

    storiesData.forEach((story, index) => {
        const div = document.createElement('div');
        div.className = 'story';
        div.onclick = () => viewStory(story);
        div.innerHTML = `
            <div class="story-ring"><img src="${story.url}" alt="Story"></div>
            <span class="story-name">История ${index + 1}</span>
        `;
        feed.appendChild(div);
    });
}

function viewStory(story) {
    const viewer = document.getElementById('story-viewer');
    const img = document.getElementById('story-viewer-img');
    const bar = document.getElementById('story-bar');
    const viewsEl = document.getElementById('story-views-count');
    
    img.src = story.url;
    viewsEl.innerText = story.views;
    viewer.classList.add('active');
    
    bar.style.transition = 'none';
    bar.style.width = '0%';
    setTimeout(() => {
        bar.style.transition = 'width 3s linear';
        bar.style.width = '100%';
    }, 50);

    setTimeout(() => viewer.classList.remove('active'), 3000);
}

// ==========================================
// ПРОФИЛЬ: ФОТО И ЛЕНТА
// ==========================================
document.getElementById('avatar-wrapper').addEventListener('click', () => {
    document.getElementById('avatar-upload').click();
});

function updateAvatars(src) {
    profileAvatar.src = src; homeAvatar.src = src; navAvatar.src = src;
}

document.getElementById('avatar-upload').addEventListener('change', function(e) {
    if (e.target.files[0]) {
        const r = new FileReader();
        r.onload = (ev) => { updateAvatars(ev.target.result); saveState(); };
        r.readAsDataURL(e.target.files[0]);
    }
});

document.getElementById('image-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        postsData.unshift({ id: Date.now(), url: event.target.result, likes: Math.floor(Math.random() * 20) + 5 });
        renderProfileGrid();
        saveState();
    };
    reader.readAsDataURL(file);
});

function renderProfileGrid() {
    const grid = document.getElementById('profile-feed');
    grid.innerHTML = '';
    postsData.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post';
        div.innerHTML = `<img src="${post.url}" alt="Post">`;
        grid.appendChild(div);
    });
    postsCountEl.innerText = postsData.length;
}

// ==========================================
// ФЕЙКОВАЯ ЛЕНТА (ГЛАВНАЯ)
// ==========================================
function renderFakeFeed() {
    const feed = document.getElementById('fake-feed');
    if(feed.innerHTML.trim() !== '') return; // Генерируем 1 раз за сессию

    for(let i=0; i<3; i++) {
        const user = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
        // Подставляем рандомные картинки из Unsplash для атмосферы
        const randomImg = `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random()*100000)}?w=400&q=80`;
        const likes = Math.floor(Math.random() * 1000);
        
        feed.innerHTML += `
            <div class="fake-post">
                <div class="fake-post-header">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user}" alt="avatar">
                    <span>${user}</span>
                </div>
                <img class="fake-post-image" src="${randomImg}" alt="Feed">
                <div class="fake-post-actions">❤️ 💬 ↗️</div>
                <div class="fake-post-likes">${likes} отметок "Нравится"</div>
            </div>
        `;
    }
}

// ==========================================
// ИГРОВОЙ ЦИКЛ РОСТА
// ==========================================
setInterval(() => {
    let hasChanges = false;
    
    // 1. Прирост подписчиков
    let currentFollowers = parseInt(followersEl.innerText) || 0;
    if (Math.random() > 0.4) {
        followersEl.innerText = currentFollowers + Math.floor(Math.random() * 3);
        hasChanges = true;
    }

    // 2. Обновление просмотров на Сторис
    if (storiesData.length > 0) {
        storiesData.forEach(s => { s.views += Math.floor(Math.random() * 4); });
        renderStoriesFeed(); // Перерисовываем для проверки таймера 5 минут
        hasChanges = true;
    }

    // 3. Лайки на профиле
    if (postsData.length > 0) {
        postsData.forEach(p => { 
            if(Math.random() > 0.6) {
                let gained = Math.floor(Math.random() * 3);
                p.likes += gained;
                totalLikesEarned += gained;
            }
        });
        document.getElementById('total-likes-stat').innerText = totalLikesEarned;
        hasChanges = true;
    }

    if(hasChanges) saveState();
}, 4000);

// ==========================================
// СОХРАНЕНИЕ
// ==========================================
function saveState() {
    const state = {
        followers: followersEl.innerText, following: followingEl.innerText,
        bioName: document.querySelector('.bio-name').innerText,
        bioDesc: document.querySelector('.bio-description').innerText,
        username: document.getElementById('header-username').innerText,
        avatar: profileAvatar.src,
        isDark: isDarkMode,
        totalLikes: totalLikesEarned,
        sessions: sessionsCount
    };
    localStorage.setItem('sim_state', JSON.stringify(state));
    localStorage.setItem('sim_posts', JSON.stringify(postsData));
    localStorage.setItem('sim_stories', JSON.stringify(storiesData));
}

function loadState() {
    try {
        const state = JSON.parse(localStorage.getItem('sim_state'));
        if (state) {
            followersEl.innerText = state.followers; followingEl.innerText = state.following;
            document.querySelector('.bio-name').innerText = state.bioName;
            document.querySelector('.bio-description').innerText = state.bioDesc;
            document.getElementById('header-username').innerText = state.username;
            if (state.avatar) updateAvatars(state.avatar);
            
            isDarkMode = state.isDark || false;
            appBody.classList.toggle('dark-mode', isDarkMode);
            
            totalLikesEarned = state.totalLikes || 0;
            sessionsCount = (state.sessions || 0) + 1;
            document.getElementById('total-likes-stat').innerText = totalLikesEarned;
            document.getElementById('sessions-stat').innerText = sessionsCount;
        }
        
        postsData = JSON.parse(localStorage.getItem('sim_posts')) || [];
        storiesData = JSON.parse(localStorage.getItem('sim_stories')) || [];
        
        renderProfileGrid();
        renderStoriesFeed();
    } catch(e) {}
    
    saveState(); // Перезаписываем с новым счетчиком сессий
}

// Отслеживание ручного ввода текста
[followersEl, followingEl, document.querySelector('.bio-name'), document.querySelector('.bio-description')].forEach(el => {
    el.addEventListener('input', saveState);
});

// Запуск
loadState();