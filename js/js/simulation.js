const FAKE_COMMENTS = ["Кинематографично 🎬", "Вайб", "Где это?", "ARCHETYPE vibes", "🔥🔥🔥", "love this", "bro this is good", "Идеальный свет", "Тень легла шикарно"];
const FAKE_USERS = ["neon_dreamer", "cyber.punk", "dark_matter", "detective_sys", "warden_official", "pastry_chef_art", "night.crawler"];

export function generateComment() {
    return {
        user: FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)],
        text: FAKE_COMMENTS[Math.floor(Math.random() * FAKE_COMMENTS.length)]
    };
}

// Главная формула расчета. Возвращает актуальные статы на данный момент времени
export function calculateLiveStats(item, followers) {
    const ageMs = Date.now() - item.timestamp;
    const ageMinutes = Math.max(ageMs / 60000, 0); // Минуты с момента публикации
    
    let likes = 0, views = 0, commentsCount = 0, reposts = 0;

    if (item.type === 'story') {
        // Сторис живет 5 минут. Охват 10-60% от подписчиков.
        const maxViews = Math.floor(followers * (0.1 + Math.random() * 0.5));
        const progress = Math.min(ageMinutes / 5, 1); // от 0 до 1
        views = Math.floor(maxViews * progress);
        return { views, likes: Math.floor(views * 0.05) };
    }

    // Логарифмический рост для постов (сначала быстро, потом медленно)
    // growthFactor будет расти, но замедляться. Например, на 1 мин = ~0.3, на 60 мин = ~1.7
    const growthFactor = Math.log10(ageMinutes * 2 + 1);

    if (item.type === 'photo') {
        likes = Math.floor(followers * 0.15 * growthFactor); // До ~25% от подписоты
        commentsCount = Math.floor(likes * 0.05);
        reposts = Math.floor(likes * 0.02);
    } else if (item.type === 'video') {
        likes = Math.floor(followers * 0.25 * growthFactor); 
        views = Math.floor(followers * 0.6 * growthFactor);
        commentsCount = Math.floor(likes * 0.08);
        reposts = Math.floor(likes * 0.05);
    } else if (item.type === 'reel') {
        // Рилсы виральны. Просмотры могут сильно превышать кол-во подписчиков.
        views = Math.floor(followers * 1.5 * growthFactor);
        likes = Math.floor(views * 0.12);
        commentsCount = Math.floor(likes * 0.1);
        reposts = Math.floor(views * 0.05);
    }

    // Добавляем немного рандома, чтобы цифры не были одинаковыми у постов загруженных одновременно
    likes = Math.floor(likes * item.randomMultiplier);
    views = Math.floor(views * item.randomMultiplier);

    return { likes, views, commentsCount, reposts };
}