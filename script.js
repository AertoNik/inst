// Глобальные переменные
let followersElement = document.getElementById('followers-count');
let postsCountElement = document.getElementById('posts-count');
const feed = document.getElementById('feed');
const avatarImage = document.getElementById('avatar-image');

// Хранилище всех постов для динамического обновления
let postsData = [];
let currentOpenPostId = null;

// Обработка загрузки аватара
document.getElementById('avatar-wrapper').addEventListener('click', () => {
    document.getElementById('avatar-upload').click();
});

document.getElementById('avatar-upload').addEventListener('change', function(e) {
    if (e.target.files[0]) {
        avatarImage.src = URL.createObjectURL(e.target.files[0]);
    }
});

// Обработка загрузки нового поста
document.getElementById('image-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    const postId = Date.now();
    
    // Базовые стартовые значения для нового фото
    const newPost = {
        id: postId,
        url: imageUrl,
        likes: Math.floor(Math.random() * 50) + 5,
        comments: Math.floor(Math.random() * 10),
        reposts: Math.floor(Math.random() * 5)
    };

    postsData.unshift(newPost); // Добавляем в начало массива
    renderFeed();
    
    postsCountElement.innerText = postsData.length;
});

// Отрисовка сетки постов
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

// Модальное окно
const modal = document.getElementById('post-modal');
const modalImage = document.getElementById('modal-image');
const modalAvatar = document.getElementById('modal-avatar');
const modalUsername = document.getElementById('modal-username');
const modalLikes = document.getElementById('modal-likes');
const modalComments = document.getElementById('modal-comments');
const modalReposts = document.getElementById('modal-reposts');

function openModal(id) {
    const post = postsData.find(p => p.id === id);
    if (!post) return;

    currentOpenPostId = id;
    
    // Копируем текущие данные профиля в модалку
    modalAvatar.src = avatarImage.src;
    modalUsername.innerText = document.querySelector('.username').innerText;
    
    modalImage.src = post.url;
    updateModalStats(post);
    
    modal.classList.add('active');
}

function updateModalStats(post) {
    modalLikes.innerText = post.likes;
    modalComments.innerText = post.comments;
    modalReposts.innerText = post.reposts;
}

document.getElementById('modal-close').addEventListener('click', () => {
    modal.classList.remove('active');
    currentOpenPostId = null;
});

// Закрытие модалки по клику вне контента
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
        currentOpenPostId = null;
    }
});

// Глобальный цикл: Рост подписчиков и реакций
setInterval(() => {
    // 1. Обновление подписчиков
    let currentFollowers = parseInt(followersElement.innerText.replace(/\s/g, ''));
    if (!isNaN(currentFollowers)) {
        let newFollowers = Math.floor(Math.random() * 3); // 0-2 подписчика за тик
        if (newFollowers > 0) {
            followersElement.innerText = currentFollowers + newFollowers;
        }
    }

    // 2. Обновление реакций на загруженных фото
    if (postsData.length > 0) {
        postsData.forEach(post => {
            // С вероятностью 40% на пост прилетают новые реакции
            if (Math.random() > 0.6) {
                post.likes += Math.floor(Math.random() * 4);
                post.comments += Math.random() > 0.8 ? 1 : 0; // Комменты растут реже
                post.reposts += Math.random() > 0.9 ? 1 : 0;
                
                // Обновляем цифры в сетке, если они существуют в DOM
                const gridLikes = document.getElementById(`grid-likes-${post.id}`);
                const gridComments = document.getElementById(`grid-comments-${post.id}`);
                if (gridLikes) gridLikes.innerText = post.likes;
                if (gridComments) gridComments.innerText = post.comments;

                // Если это фото сейчас открыто в модалке, обновляем и там
                if (currentOpenPostId === post.id) {
                    updateModalStats(post);
                }
            }
        });
    }
}, 3000); // Проверка и рост каждые 3 секунды