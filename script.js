// Логика автоматического прироста подписчиков
let followersElement = document.getElementById('followers-count');

setInterval(() => {
    // Получаем текущее значение (на случай, если ты его изменил вручную)
    let currentFollowers = parseInt(followersElement.innerText.replace(/\s/g, ''));
    
    if (!isNaN(currentFollowers)) {
        // Рандомно добавляем от 0 до 2 подписчиков
        let newFollowers = Math.floor(Math.random() * 3);
        if (newFollowers > 0) {
            currentFollowers += newFollowers;
            followersElement.innerText = currentFollowers;
            
            // Небольшой визуальный эффект при обновлении
            followersElement.style.color = '#4a90e2';
            setTimeout(() => followersElement.style.color = '', 300);
        }
    }
}, 4000); // Проверка каждые 4 секунды

// Логика загрузки фотографий и симуляции активности
const imageUpload = document.getElementById('image-upload');
const feed = document.getElementById('feed');
const postsCountElement = document.getElementById('posts-count');
let postsCount = 0;

imageUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    
    if (file) {
        const imageUrl = URL.createObjectURL(file);
        
        // Генерируем случайные лайки и комменты для нового поста
        const randomLikes = Math.floor(Math.random() * 500) + 10;
        const randomComments = Math.floor(Math.random() * 50) + 1;
        const randomReposts = Math.floor(Math.random() * 15);

        // Создаем элемент поста
        const postDiv = document.createElement('div');
        postDiv.className = 'post';
        postDiv.innerHTML = `
            <img src="${imageUrl}" alt="Uploaded Post">
            <div class="post-overlay">
                <span>LIKES: ${randomLikes}</span>
                <span>COMMENTS: ${randomComments}</span>
                <span>REPOSTS: ${randomReposts}</span>
            </div>
        `;
        
        // Добавляем пост в начало сетки
        feed.prepend(postDiv);
        
        // Обновляем счетчик постов
        postsCount++;
        postsCountElement.innerText = postsCount;
    }
});