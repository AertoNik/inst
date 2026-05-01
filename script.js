// Глобальные переменные
let followersElement = document.getElementById('followers-count');
let postsCountElement = document.getElementById('posts-count');
let followingElement = document.getElementById('following-count');
const feed = document.getElementById('feed');
const avatarImage = document.getElementById('avatar-image');

const usernameEl = document.querySelector('.username');
const bioNameEl = document.querySelector('.bio-name');
const bioDescEl = document.querySelector('.bio-description');

// Хранилище
let postsData = [];

// ==========================================
// 1. СИСТЕМА СОХРАНЕНИЯ (LOCALSTORAGE)
// ==========================================

function saveState() {
    const profileState = {
        followers: followersElement.innerText,
        following: followingElement.innerText,
        username: usernameEl.innerText,
        bioName: bioNameEl.innerText,
        bioDesc: bioDescEl.innerText,
        avatar: avatarImage.src
    };
    localStorage.setItem('sim_profile', JSON.stringify(profileState));
    localStorage.setItem('sim_posts', JSON.stringify(postsData));
}

function loadState() {
    const savedProfile = localStorage.getItem('sim_profile');
    const savedPosts = localStorage.getItem('sim_posts');

    if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        followersElement.innerText = profile.followers;
        followingElement.innerText = profile.following;
        usernameEl.innerText = profile.username;
        bioNameEl.innerText = profile.bioName;
        bioDescEl.innerText = profile.bioDesc;
        if (profile.avatar) avatarImage.src = profile.avatar;
    }

    if (savedPosts) {
        postsData = JSON.parse(savedPosts);
        postsCountElement.innerText = postsData.length;
        renderFeed();
    }
}

// Отслеживаем ручные изменения текста, чтобы сразу сохранять
[followersElement, followingElement, usernameEl, bioNameEl, bioDescEl].forEach(el => {
    el.addEventListener('input', saveState);
});

// ==========================================
// 2. ЗАГРУЗКА ФОТО (Через FileReader для Base64)
// ==========================================

document.getElementById('avatar-wrapper').addEventListener('click', () => {
    document.getElementById('avatar-upload').click();
});

document.getElementById('avatar-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            avatarImage.src = event.target.result; // Это Base64 код картинки
            saveState();
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('image-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const imageUrl = event.target.result;
        const postId = Date.now();
        
        const newPost = {
            id: postId,
            url: imageUrl,
            likes: Math.floor(Math.random() * 50) + 5,
            comments: Math.floor(Math.random() * 10),
            reposts: Math.floor(Math.random() * 5)
        };

        postsData.unshift(newPost);
        postsCountElement.innerText = postsData.length;
        renderFeed();
        saveState(); // Сохраняем новый пост
    };
    reader.readAsDataURL(file);
});

// ==========================================
// 3. ОТРИСОВКА И МОДАЛЬНОЕ ОКНО
// ==========================================

function renderFeed() {
    feed.innerHTML = '';
    postsData.forEach(post => {
        const postDiv = document.createElement('div');
        postDiv.className = 'post';
        postDiv.onclick = () => openModal(post.id);
        
        postDiv.innerHTML = `
            <img src="${post.url}" alt="Post">
            <div class="post-overlay">
                <span>❤️ <span id="grid-likes-${post.id}">${post.likes}</span></span>
                <span>💬 <span id="grid-comments-${post.id}">${post.comments}</span></span>
            </div>
        `;
        feed.appendChild(postDiv);
    });
}

const modal = document.getElementById('post-modal');
const modalImage = document.getElementById('modal-image');
const modalAvatar = document.getElementById('modal-avatar');
const modalUsername = document.getElementById('modal-username');
const modalLikes = document.getElementById('modal-likes');
const modalComments = document.getElementById('modal-comments');
const modalReposts = document.getElementById('modal-reposts');
let currentOpenPostId = null;

function openModal(id) {
    const post = postsData.find(p => p.id === id);
    if (!post) return;

    currentOpenPostId = id;
    modalAvatar.src = avatarImage.src;
    modalUsername.innerText = usernameEl.innerText;
    modalImage.src = post.url;
    
    modalLikes.innerText = post.likes;
    modalComments.innerText = post.comments;
    modalReposts.innerText = post.reposts;
    
    modal.classList.add('active');
}

document.getElementById('modal-close').addEventListener('click', () => {
    modal.classList.remove('active');
    currentOpenPostId = null;
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
        currentOpenPostId = null;
    }
});

// ==========================================
// 4. ГЛОБАЛЬНЫЙ ЦИКЛ РОСТА (И АВТОСОХРАНЕНИЕ)
// ==========================================

setInterval(() => {
    let hasChanges = false;

    // Рост подписчиков
    let currentFollowers = parseInt(followersElement.innerText.replace(/\s/g, ''));
    if (!isNaN(currentFollowers)) {
        let newFollowers = Math.floor(Math.random() * 3);
        if (newFollowers > 0) {
            followersElement.innerText = currentFollowers + newFollowers;
            hasChanges = true;
        }
    }

    // Рост реакций на фото
    if (postsData.length > 0) {
        postsData.forEach(post => {
            if (Math.random() > 0.6) {
                post.likes += Math.floor(Math.random() * 4);
                post.comments += Math.random() > 0.8 ? 1 : 0;
                post.reposts += Math.random() > 0.9 ? 1 : 0;
                hasChanges = true;
                
                const gridLikes = document.getElementById(`grid-likes-${post.id}`);
                const gridComments = document.getElementById(`grid-comments-${post.id}`);
                if (gridLikes) gridLikes.innerText = post.likes;
                if (gridComments) gridComments.innerText = post.comments;

                if (currentOpenPostId === post.id) {
                    modalLikes.innerText = post.likes;
                    modalComments.innerText = post.comments;
                    modalReposts.innerText = post.reposts;
                }
            }
        });
    }

    // Если цифры изменились — перезаписываем сохранение
    if (hasChanges) saveState();

}, 3000);

// ==========================================
// 5. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАПУСКЕ
// ==========================================
loadState();