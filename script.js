// Элементы UI
const followersEl = document.getElementById('followers-count');
const followingEl = document.getElementById('following-count');
const postsCountEl = document.getElementById('posts-count');
const avatarImg = document.getElementById('avatar-image');
const storyAvatarImg = document.getElementById('story-avatar');

// Базы данных генерируемого контента
const FAKE_USERNAMES = ['neon_dreamer', 'cyber.punk', 'noir_aesthetic', 'night.crawler', 'visual.arts', 'dark_matter', 'shadow.walker'];
const FAKE_COMMENTS = [
    "Просто невероятная атмосфера! 🎬", "Идеальный кадр.", "🔥🔥🔥", 
    "Очень стильно вышло.", "Как всегда на высоте!", "Не могу перестать смотреть.", 
    "Это шедевр...", "Научи так же делать! 🖤", "Какой свет, какие тени!", "Вау, просто вау."
];

// Хранилища
let postsData = [];
let reelsData = [];
let storiesData = [];

// ==========================================
// 1. ДВИЖОК МАСШТАБИРОВАНИЯ И ВОВЛЕЧЕННОСТИ
// ==========================================
function getFollowers() {
    return parseInt(followersEl.innerText.replace(/\s/g, '')) || 0;
}

// Лайки зависят от числа подписчиков (ER от 5% до 15%)
function calculateInitialLikes(followers) {
    const engagementRate = (Math.random() * 0.10) + 0.05; 
    let likes = Math.floor(followers * engagementRate);
    return likes < 5 ? Math.floor(Math.random() * 10) + 5 : likes;
}

// Генерация комментариев
function generateComments(count) {
    let comments = [];
    for(let i=0; i<count; i++) {
        comments.push({
            user: FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)],
            text: FAKE_COMMENTS[Math.floor(Math.random() * FAKE_COMMENTS.length)]
        });
    }
    return comments;
}

// ==========================================
// 2. ЗАГРУЗКА КОНТЕНТА (ПОСТЫ И РИЛС)
// ==========================================
function handleUpload(e, type) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const url = event.target.result;
        const currentFollowers = getFollowers();
        
        const newItem = {
            id: Date.now(),
            url: url,
            type: type,
            likes: calculateInitialLikes(currentFollowers),
            commentsArr: generateComments(Math.floor(Math.random() * 5) + 1), // 1-5 стартовых комментов
            reposts: Math.floor(Math.random() * (currentFollowers / 100)) + 1
        };

        if (type === 'post') {
            postsData.unshift(newItem);
        } else {
            reelsData.unshift(newItem);
        }
        
        updateGrid(type);
        postsCountEl.innerText = postsData.length + reelsData.length;
        saveState();
    };
    reader.readAsDataURL(file);
}

document.getElementById('image-upload').addEventListener('change', (e) => handleUpload(e, 'post'));
document.getElementById('reels-upload').addEventListener('change', (e) => handleUpload(e, 'reel'));

// Отрисовка сеток
function updateGrid(type) {
    const grid = type === 'post' ? document.getElementById('feed-posts') : document.getElementById('feed-reels');
    const data = type === 'post' ? postsData : reelsData;
    
    grid.innerHTML = '';
    data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'post';
        div.onclick = () => openModal(item);
        div.innerHTML = `
            <img src="${item.url}" alt="Media">
            <div class="post-overlay">
                <span>❤️ <span id="grid-likes-${item.id}">${item.likes}</span></span>
                <span>💬 <span id="grid-comments-${item.id}">${item.commentsArr.length}</span></span>
            </div>
        `;
        grid.appendChild(div);
    });
}

// ==========================================
// 3. ВКЛАДКИ (TABS)
// ==========================================
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        
        const target = e.target.getAttribute('data-tab');
        document.getElementById('feed-posts').style.display = target === 'posts' ? 'grid' : 'none';
        document.getElementById('feed-reels').style.display = target === 'reels' ? 'grid' : 'none';
    });
});

// ==========================================
// 4. СИСТЕМА ИСТОРИЙ (STORIES)
// ==========================================
document.getElementById('add-story-btn').addEventListener('click', () => document.getElementById('story-upload').click());

document.getElementById('story-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        const newStory = { id: Date.now(), url: event.target.result };
        storiesData.push(newStory);
        renderStoriesFeed();
        saveState();
    };
    reader.readAsDataURL(file);
});

function renderStoriesFeed() {
    const feed = document.getElementById('stories-feed');
    // Удаляем все старые истории, оставляем только кнопку "+"
    const addBtn = document.getElementById('add-story-btn');
    feed.innerHTML = '';
    feed.appendChild(addBtn);

    storiesData.forEach((story, index) => {
        const div = document.createElement('div');
        div.className = 'story';
        div.onclick = () => viewStory(story.url);
        div.innerHTML = `
            <div class="story-ring"><img src="${story.url}" alt="Story"></div>
            <span class="story-name">История ${index + 1}</span>
        `;
        feed.appendChild(div);
    });
}

function viewStory(url) {
    const viewer = document.getElementById('story-viewer');
    const img = document.getElementById('story-viewer-img');
    const bar = document.getElementById('story-bar');
    
    img.src = url;
    viewer.classList.add('active');
    
    // Анимация полоски
    bar.style.transition = 'none';
    bar.style.width = '0%';
    setTimeout(() => {
        bar.style.transition = 'width 3s linear';
        bar.style.width = '100%';
    }, 50);

    // Закрытие через 3 секунды
    setTimeout(() => viewer.classList.remove('active'), 3000);
}

// ==========================================
// 5. МОДАЛЬНОЕ ОКНО И КОММЕНТАРИИ
// ==========================================
const modal = document.getElementById('post-modal');
let currentOpenItem = null;

function openModal(item) {
    currentOpenItem = item;
    document.getElementById('modal-avatar').src = avatarImg.src;
    document.getElementById('modal-username').innerText = document.querySelector('.username').innerText;
    document.getElementById('modal-image').src = item.url;
    
    updateModalStats(item);
    renderComments(item.commentsArr);
    
    modal.classList.add('active');
}

function renderComments(comments) {
    const list = document.getElementById('modal-comments-list');
    list.innerHTML = '';
    comments.forEach(c => {
        list.innerHTML += `
            <div class="comment-item">
                <div class="comment-avatar"></div>
                <div class="comment-text"><strong>${c.user}</strong>${c.text}</div>
            </div>
        `;
    });
}

function updateModalStats(item) {
    document.getElementById('modal-likes').innerText = item.likes;
    document.getElementById('modal-comments').innerText = item.commentsArr.length;
    document.getElementById('modal-reposts').innerText = item.reposts;
}

document.getElementById('modal-close').addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

// ==========================================
// 6. ЖИВОЙ РОСТ (ЗАВИСИТ ОТ РАЗМЕРА АУДИТОРИИ)
// ==========================================
setInterval(() => {
    let hasChanges = false;
    let currentFollowers = getFollowers();
    
    // Множитель роста: чем больше подписчиков, тем быстрее идет рост
    // Базовый множитель 1. За каждую 1000 подписчиков скорость удваивается.
    let growthMultiplier = 1 + (currentFollowers / 1000); 

    // Рост подписчиков
    let newFollowers = Math.floor(Math.random() * 3 * growthMultiplier);
    if (newFollowers > 0) {
        followersEl.innerText = currentFollowers + newFollowers;
        hasChanges = true;
    }

    // Рост реакций на весь контент
    const allContent = [...postsData, ...reelsData];
    allContent.forEach(item => {
        if (Math.random() > 0.5) { // 50% шанс получить реакцию в этот тик
            item.likes += Math.floor(Math.random() * 5 * growthMultiplier);
            
            // Добавление новых комментариев
            if (Math.random() > 0.8) {
                item.commentsArr.push({
                    user: FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)],
                    text: FAKE_COMMENTS[Math.floor(Math.random() * FAKE_COMMENTS.length)]
                });
            }
            
            item.reposts += Math.random() > 0.8 ? Math.floor(growthMultiplier) : 0;
            hasChanges = true;

            // Обновление UI
            const gridLikes = document.getElementById(`grid-likes-${item.id}`);
            const gridComments = document.getElementById(`grid-comments-${item.id}`);
            if (gridLikes) gridLikes.innerText = item.likes;
            if (gridComments) gridComments.innerText = item.commentsArr.length;

            if (currentOpenItem && currentOpenItem.id === item.id) {
                updateModalStats(item);
                renderComments(item.commentsArr); // Перерисовываем комменты, если они добавились
            }
        }
    });

    if (hasChanges) saveState();
}, 3000);

// ==========================================
// 7. СОХРАНЕНИЕ / ИНИЦИАЛИЗАЦИЯ
// ==========================================
function saveState() {
    const profileState = {
        followers: followersEl.innerText, following: followingEl.innerText,
        username: document.querySelector('.username').innerText,
        bioName: document.querySelector('.bio-name').innerText,
        bioDesc: document.querySelector('.bio-description').innerText,
        avatar: avatarImg.src
    };
    localStorage.setItem('sim_profile', JSON.stringify(profileState));
    localStorage.setItem('sim_posts', JSON.stringify(postsData));
    localStorage.setItem('sim_reels', JSON.stringify(reelsData));
    localStorage.setItem('sim_stories', JSON.stringify(storiesData));
}

function loadState() {
    try {
        const savedProfile = JSON.parse(localStorage.getItem('sim_profile'));
        if (savedProfile) {
            followersEl.innerText = savedProfile.followers; followingEl.innerText = savedProfile.following;
            document.querySelector('.username').innerText = savedProfile.username;
            document.querySelector('.bio-name').innerText = savedProfile.bioName;
            document.querySelector('.bio-description').innerText = savedProfile.bioDesc;
            if (savedProfile.avatar) {
                avatarImg.src = savedProfile.avatar;
                storyAvatarImg.src = savedProfile.avatar;
            }
        }
        postsData = JSON.parse(localStorage.getItem('sim_posts')) || [];
        reelsData = JSON.parse(localStorage.getItem('sim_reels')) || [];
        storiesData = JSON.parse(localStorage.getItem('sim_stories')) || [];
        
        postsCountEl.innerText = postsData.length + reelsData.length;
        updateGrid('post'); updateGrid('reel'); renderStoriesFeed();
    } catch(e) { console.error("Ошибка загрузки сохранений", e); }
}

[followersEl, followingEl].forEach(el => el.addEventListener('input', saveState));
document.getElementById('avatar-upload').addEventListener('change', function(e) {
    if (e.target.files[0]) {
        const r = new FileReader();
        r.onload = (event) => { avatarImg.src = event.target.result; storyAvatarImg.src = event.target.result; saveState(); };
        r.readAsDataURL(e.target.files[0]);
    }
});

loadState();