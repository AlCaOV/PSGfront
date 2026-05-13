let allPostsList = []; 
let postsDisplayed = 0; 
const POSTS_CHUNK = 2; 

let targetUserId = null;
let isOwner = false;
let myId = null; 
let friendshipIdIfFollowing = null; 

function getCleanImageUrl(url) {
    if (!url) return ''; 
    if (url.startsWith('http')) return url;
    const cleanFileName = url.split('/').pop().split('\\').pop();
    return `http://localhost:8080/api/images/${cleanFileName}`;
}

// ==========================================
// 1. ЗАВАНТАЖЕННЯ ПОСТІВ ДЛЯ ПРОФІЛЮ
// ==========================================
async function loadUserPosts() {
    const token = localStorage.getItem('jwt_token') ? localStorage.getItem('jwt_token').replace(/"/g, '') : null;
    if (!token) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        let idFromUrl = urlParams.get('id');

        const meRes = await fetch('http://localhost:8080/api/profiles/me', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // ПРАВИЛЬНИЙ ЗАПИС У ГЛОБАЛЬНУ ЗМІННУ
        if (meRes.ok) {
            const myProfile = await meRes.json();
            myId = myProfile.userId; 
        }

        targetUserId = idFromUrl || myId;
        isOwner = (String(targetUserId) === String(myId));

        if (!targetUserId) {
            console.error("Не вдалося визначити власника профілю");
            return;
        }

        await loadProfileHeader(targetUserId, token);

        const response = await fetch(`http://localhost:8080/api/users/${targetUserId}/posts`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const jsonResponse = await response.json();
            
            if (jsonResponse._embedded && jsonResponse._embedded.postResponseList) {
                allPostsList = jsonResponse._embedded.postResponseList;
            } else {
                allPostsList = Array.isArray(jsonResponse) ? jsonResponse : [];
            }
            
            allPostsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            const totalLikes = allPostsList.reduce((sum, post) => sum + (post.likesCount || 0), 0);
            document.getElementById('statLikes').textContent = totalLikes;
            document.getElementById('statPosts').textContent = allPostsList.length;

            document.getElementById('feedContainer').innerHTML = '';
            postsDisplayed = 0;
            
            if (allPostsList.length === 0) {
                document.getElementById('feedContainer').innerHTML = '<h3 style="text-align:center; color: var(--color-dark); margin-top: 40px;">Немає постів</h3>';
                return;
            }

            showNextPosts();
        }
    } catch (error) {
        console.error("Помилка завантаження профілю:", error);
    }
}

// ==========================================
// 2. ЗАВАНТАЖЕННЯ ДАНИХ ШАПКИ
// ==========================================
async function loadProfileHeader(userId, token) {
    try {
        const profRes = await fetch(`http://localhost:8080/api/profiles/users/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (profRes.ok) {
            const profile = await profRes.json();
            document.getElementById('profileFullName').textContent = profile.fullName || 'Користувач';
            document.getElementById('profileBio').textContent = profile.bio || '';
            document.getElementById('profileUsername').textContent = `@${profile.username || 'username'}`;
            
            const avatarBox = document.getElementById('profileAvatarBox');
            if (profile.avatarUrl) {
                avatarBox.innerHTML = `<img src="${getCleanImageUrl(profile.avatarUrl)}">`;
            } else {
                avatarBox.innerHTML = `<span>${(profile.fullName || 'U').charAt(0).toUpperCase()}</span>`;
            }
        }

        const followersRes = await fetch(`http://localhost:8080/api/friendships/users/${userId}/followers`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (followersRes.ok) {
            const data = await followersRes.json();
            const followersList = data._embedded ? data._embedded.friendshipResponseList : (Array.isArray(data) ? data : []);
            document.getElementById('statFollowers').textContent = followersList.length;
            
            const myFollowRecord = followersList.find(f => String(f.followerId) === String(myId));
            if (myFollowRecord) {
                friendshipIdIfFollowing = myFollowRecord.id; 
            } else {
                friendshipIdIfFollowing = null; 
            }
        }

        const followingRes = await fetch(`http://localhost:8080/api/friendships/users/${userId}/followees`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (followingRes.ok) {
            const data = await followingRes.json();
            const followingList = data._embedded ? data._embedded.friendshipResponseList : (Array.isArray(data) ? data : []);
            document.getElementById('statFollowing').textContent = followingList.length;
        }

        const actionBox = document.getElementById('profileActionButtons');
        const addStoryBtn = document.getElementById('addStoryBtn'); 

        if (isOwner) {
            if (addStoryBtn) addStoryBtn.style.display = 'flex'; 
            
            actionBox.innerHTML = `<button class="edit-profile-btn" id="editProfileBtn">Редагувати профіль</button>`;
            document.getElementById('editProfileBtn').addEventListener('click', () => {
                window.location.href = 'edit_profile.html';
            });
        } else {
            if (addStoryBtn) addStoryBtn.style.display = 'none'; 
            
            if (friendshipIdIfFollowing) {
                actionBox.innerHTML = `
                    <button class="follow-btn" id="followedBtn">Відстежується</button>
                    <button class="unfollow-icon-btn" id="unfollowIconBtn"><i class="fa-solid fa-trash-can"></i></button>
                `;
                document.getElementById('followedBtn').addEventListener('click', unfollowUser);
                document.getElementById('unfollowIconBtn').addEventListener('click', unfollowUser);
            } else {
                actionBox.innerHTML = `
                    <button class="follow-btn not-following" id="followBtn">Стежити</button>
                `;
                document.getElementById('followBtn').addEventListener('click', followUser);
            }
        }
        
        document.getElementById('profileHeader').style.display = 'flex';
        loadStories(token);

    } catch (e) { console.error("Помилка завантаження статистики", e); }
}

// ==========================================
// 3. ПІДПИСКА ТА ВІДПИСКА
// ==========================================
async function followUser() {
    const token = localStorage.getItem('jwt_token') ? localStorage.getItem('jwt_token').replace(/"/g, '') : null;
    try {
        const res = await fetch(`http://localhost:8080/api/friendships/users/${myId}/followees`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                followeeId: parseInt(targetUserId), 
                followerId: parseInt(myId),
                status: "accepted"
            }) 
        });
        if (res.ok) {
            loadProfileHeader(targetUserId, token);
        } else {
            console.error("Бекенд відхилив запит:", await res.text());
        }
    } catch (e) { console.error("Помилка підписки:", e); }
}

async function unfollowUser() {
    if (!friendshipIdIfFollowing) return;
    const token = localStorage.getItem('jwt_token') ? localStorage.getItem('jwt_token').replace(/"/g, '') : null;
    try {
        const res = await fetch(`http://localhost:8080/api/friendships/users/${myId}/${friendshipIdIfFollowing}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            friendshipIdIfFollowing = null;
            loadProfileHeader(targetUserId, token);
        }
    } catch (e) { console.error("Помилка відписки:", e); }
}

// ==========================================
// 4. ВІДОБРАЖЕННЯ ПОСТІВ
// ==========================================
function showNextPosts() {
    const container = document.getElementById('feedContainer');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    const postsToShow = allPostsList.slice(postsDisplayed, postsDisplayed + POSTS_CHUNK);
    
    postsToShow.forEach(post => {
        const dateObj = new Date(post.createdAt);
        const timeStr = dateObj.toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'});
        const dateStr = dateObj.toLocaleDateString('uk-UA');
        
        const commentsHtml = post.comments && post.comments.length > 0 
            ? post.comments.map(c => `
                <div class="comment-item-new">
                    <div class="comment-author-new">
                        <span><span style="color: #a33; margin-right: 5px;">●</span>${c.authorName}</span> 
                        <span class="comment-time-new">${new Date(c.createdAt).toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div>${c.text || c.body || ''}</div>
                </div>
            `).join('') 
            : '<div style="color: rgba(255,255,255,0.5); font-style: italic; font-size: 14px; text-align: center; margin-top: 20px;">No comments yet</div>';

        const avatarHtml = post.ownerAvatar 
            ? `<img src="${getCleanImageUrl(post.ownerAvatar)}" class="avatar-new">` 
            : `<div class="avatar-new">${post.ownerName ? post.ownerName.charAt(0).toUpperCase() : 'U'}</div>`;
        
        const imgHtml = post.imageUrl 
            ? `<img src="${getCleanImageUrl(post.imageUrl)}" class="post-img-new">` 
            : '';
            
        const deleteBtnHtml = isOwner ? `
            <button class="delete-post-btn" onclick="openDeleteModal(${post.id})">
                <i class="fa-regular fa-trash-can"></i>
            </button>
             ` : '';
             
        const postCard = `
            <div class="post-wrapper-new" id="post-${post.id}">
                <div class="post-header-top">
                    <div class="post-author-wrap" style="cursor: pointer;" onclick="window.location.href='profile.html?id=${post.userId || post.ownerId}'">
                        ${avatarHtml}
                        <span>${post.ownerName || 'Unknown'}</span>
                    </div>
                    <span class="post-date-new">${timeStr} ${dateStr}</span>
                </div>
                
                <div class="post-card-body-new">
                    <div class="post-main-column">
                        ${imgHtml}
                        <div class="post-col-content">
                            <p class="post-text-new">${post.caption || ''}</p>
                            <div class="post-stats-new">
                                <hr class="stats-divider">
                                <div class="stats-icons">
                                    <button class="like-btn-new" onclick="toggleLike(${post.id})">
                                        <i class="fa-regular fa-heart"></i> <span id="likes-count-${post.id}">${post.likesCount || 0}</span>
                                    </button>
                                    <span class="comment-count-new">
                                        <i class="fa-solid fa-comment-dots"></i> ${post.comments ? post.comments.length : 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="post-col-comments">
                        <h3 class="comments-title">Comments</h3>
                        <div class="comments-list-new" id="comments-list-${post.id}">
                            ${commentsHtml}
                        </div>
                        <form class="comment-form-new" onsubmit="addComment(event, ${post.id})">
                            <input type="text" id="comment-input-${post.id}" placeholder="Write your opinion!" required autocomplete="off">
                            <button type="submit" title="Send"><i class="fa-solid fa-paper-plane"></i></button>
                        </form>
                    </div>
                </div>
                ${deleteBtnHtml}
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', postCard);
    });

    postsDisplayed += postsToShow.length;

    if (loadMoreBtn) {
        if (postsDisplayed >= allPostsList.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'flex';
        }
    }
}

async function toggleLike(postId) {
    const token = localStorage.getItem('jwt_token') ? localStorage.getItem('jwt_token').replace(/"/g, '') : null;
    try {
        const response = await fetch(`http://localhost:8080/api/posts/${postId}/likes`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({}) 
        });
        if (response.ok) {
            const countSpan = document.getElementById(`likes-count-${postId}`);
            const likeBtn = countSpan.closest('.like-btn-new');
            let currentCount = parseInt(countSpan.textContent) || 0;
            if (likeBtn.classList.contains('liked')) {
                likeBtn.classList.remove('liked');
                countSpan.textContent = Math.max(0, currentCount - 1);
            } else {
                likeBtn.classList.add('liked');
                countSpan.textContent = currentCount + 1;
            }
        }
    } catch (error) { console.error("Помилка лайку:", error); }
}

async function addComment(event, postId) {
    event.preventDefault(); 
    const inputField = document.getElementById(`comment-input-${postId}`);
    const text = inputField.value.trim();
    if (!text) return; 

    const token = localStorage.getItem('jwt_token') ? localStorage.getItem('jwt_token').replace(/"/g, '') : null;
    inputField.disabled = true;

    try {
        const response = await fetch(`http://localhost:8080/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: text }) 
        });

        if (response.ok) {
            inputField.value = ''; 
            const commentsList = document.getElementById(`comments-list-${postId}`);
            const myName = document.getElementById('currentUserNamePost')?.textContent || 'You';
            const newCommentHtml = `
                <div class="comment-item-new">
                    <div class="comment-author-new">
                        <span><span style="color: #a33; margin-right: 5px;">●</span>${myName}</span> 
                        <span class="comment-time-new">Just now</span>
                    </div>
                    <div>${text}</div>
                </div>
            `;
            if (commentsList.innerHTML.includes('No comments yet')) commentsList.innerHTML = '';
            commentsList.insertAdjacentHTML('beforeend', newCommentHtml);
            commentsList.scrollTop = commentsList.scrollHeight;

            const countSpan = document.querySelector(`#post-${postId} .comment-count-new`);
            if (countSpan) {
                let currentCount = parseInt(countSpan.textContent.replace(/[^0-9]/g, '')) || 0;
                countSpan.innerHTML = `<i class="fa-solid fa-comment-dots"></i> ${currentCount + 1}`;
            }
        }
    } catch (error) { console.error(error); } finally {
        inputField.disabled = false; inputField.focus(); 
    }
}

// ==========================================
// 5. ЛОГІКА СТОРІС
// ==========================================
let userStories = [];
let currentStoryIndex = 0;
let storyAnimationId = null;

async function loadStories(token) {
    if (!targetUserId) return;
    
    const container = document.getElementById('storiesContainer');
    if (!container) return;
    container.innerHTML = ''; 

    try {
        const res = await fetch(`http://localhost:8080/api/stories/users/${targetUserId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            let allStories = data._embedded ? data._embedded.storiesResponseList : (Array.isArray(data) ? data : []);
            
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            
            userStories = allStories.filter(s => new Date(s.createdAt) >= threeDaysAgo);
            userStories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); 
            
            renderStoriesPreviews();
        } else {
            container.innerHTML = '<div style="font-size: 14px; color: #fff; text-align:center; padding-top:10px;">Немає активних сторіс</div>';
        }
    } catch (e) { 
        console.error("Помилка сторіс", e); 
        container.innerHTML = '<div style="font-size: 14px; color: #fff; text-align:center; padding-top:10px;">Немає активних сторіс</div>';
    }
}

function renderStoriesPreviews() {
    const container = document.getElementById('storiesContainer');
    if (userStories.length === 0) {
        container.innerHTML = '<div style="font-size: 14px; color: #fff; text-align:center; padding-top:10px;">Немає активних сторіс</div>';
        return;
    }
    
    userStories.forEach((story, index) => {
        const mediaUrl = getCleanImageUrl(story.mediaUrl);
        const mediaHtml = story.kind === 'video' || story.kind === 'VIDEO'
            ? `<video src="${mediaUrl}#t=0.1" preload="metadata" muted></video>`
            : `<img src="${mediaUrl}">`;
            
        const previewHtml = `
            <div class="story-preview" onclick="openStoryViewer(${index})">
                ${mediaHtml}
            </div>
        `;
        container.insertAdjacentHTML('beforeend', previewHtml);
    });
}

window.openStoryViewer = function(index) {
    if (index >= userStories.length) { closeStoryViewer(); return; }
    
    currentStoryIndex = index;
    const story = userStories[index];
    const mediaUrl = getCleanImageUrl(story.mediaUrl);
    
    document.getElementById('viewStoryModal').style.display = 'flex';
    document.getElementById('viewerCaption').textContent = story.caption || '';
    
    const imgEl = document.getElementById('viewerImage');
    const vidEl = document.getElementById('viewerVideo');
    const fillEl = document.getElementById('storyProgressFill');
    const timerEl = document.getElementById('viewerTimer');
    
    cancelAnimationFrame(storyAnimationId);
    fillEl.style.width = '0%';
    
    if (story.kind === 'video' || story.kind === 'VIDEO') {
        imgEl.style.display = 'none'; vidEl.style.display = 'block'; vidEl.src = mediaUrl;
        vidEl.onloadedmetadata = () => { vidEl.play(); updateVideoProgress(vidEl, fillEl, timerEl); };
        vidEl.onended = () => { openStoryViewer(currentStoryIndex + 1); }; 
    } else {
        vidEl.style.display = 'none'; vidEl.pause(); imgEl.style.display = 'block'; imgEl.src = mediaUrl;
        startImageProgress(10000, fillEl, timerEl);
    }
};

function closeStoryViewer() {
    document.getElementById('viewStoryModal').style.display = 'none';
    document.getElementById('viewerVideo').pause();
    cancelAnimationFrame(storyAnimationId);
}

document.getElementById('closeStoryViewerBtn')?.addEventListener('click', closeStoryViewer);

function updateVideoProgress(vidEl, fillEl, timerEl) {
    function step() {
        if (vidEl.paused || vidEl.ended) return;
        fillEl.style.width = `${(vidEl.currentTime / vidEl.duration) * 100}%`;
        const secondsLeft = Math.ceil(vidEl.duration - vidEl.currentTime);
        timerEl.textContent = `00:${secondsLeft < 10 ? '0'+secondsLeft : secondsLeft}`;
        storyAnimationId = requestAnimationFrame(step);
    }
    storyAnimationId = requestAnimationFrame(step);
}

function startImageProgress(durationMs, fillEl, timerEl) {
    const startTime = performance.now();
    function step(currentTime) {
        const elapsed = currentTime - startTime;
        if (elapsed >= durationMs) { fillEl.style.width = '100%'; openStoryViewer(currentStoryIndex + 1); return; }
        fillEl.style.width = `${(elapsed / durationMs) * 100}%`;
        const secondsLeft = Math.ceil((durationMs - elapsed) / 1000);
        timerEl.textContent = `00:${secondsLeft < 10 ? '0'+secondsLeft : secondsLeft}`;
        storyAnimationId = requestAnimationFrame(step);
    }
    storyAnimationId = requestAnimationFrame(step);
}

// ==========================================
// ГЛОБАЛЬНЕ ВІДКРИТТЯ МОДАЛКИ СТОРІС
// ==========================================
window.openCreateStoryModal = function() {
    const modal = document.getElementById('createStoryModal');
    if (modal) {
        const usernameEl = document.getElementById('profileUsername');
        const authorEl = document.getElementById('storyAuthorName');
        if (usernameEl && authorEl) authorEl.textContent = usernameEl.textContent;
        modal.style.display = 'flex';
    }
};

// ==========================================
// ВИДАЛЕННЯ ПОСТА
// ==========================================
let postToDeleteId = null;

window.openDeleteModal = function(postId) {
    postToDeleteId = postId;
    document.getElementById('deletePostModal').style.display = 'flex';
};

// ==========================================
// ІНІЦІАЛІЗАЦІЯ ПІСЛЯ ЗАВАНТАЖЕННЯ DOM
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    let rawToken = localStorage.getItem('jwt_token');
    const token = rawToken ? rawToken.replace(/"/g, '') : null;

    loadUserPosts(); // Головний старт

    const loadMoreBtnEl = document.getElementById('loadMoreBtn');
    if (loadMoreBtnEl) loadMoreBtnEl.addEventListener('click', showNextPosts);

    const profileBtn = document.getElementById('profileRedirectBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => window.location.href = 'profile.html');
        async function loadMyAvatar() {
            if (!token) return;
            try {
                const response = await fetch('http://localhost:8080/api/profiles/me', {
                    method: 'GET', headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const profileData = await response.json();
                    const modalAvatar = document.getElementById('currentUserAvatarPost');
                    const modalName = document.getElementById('currentUserNamePost');
                    if (modalName) modalName.textContent = profileData.fullName || "User";
                    if (profileData.avatarUrl) {
                        const avatarSrc = getCleanImageUrl(profileData.avatarUrl);
                        profileBtn.innerHTML = `<img src="${avatarSrc}" alt="Avatar">`;
                        if (modalAvatar) modalAvatar.src = avatarSrc;
                    } else {
                        const initial = profileData.fullName ? profileData.fullName.charAt(0).toUpperCase() : 'U';
                        profileBtn.innerHTML = `<span>${initial}</span>`;
                    }
                }
            } catch (error) { console.error(error); }
        }
        loadMyAvatar();
    }
   
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
        homeBtn.classList.remove('active'); 
        homeBtn.addEventListener('click', () => window.location.href = 'feed.html');
    }

    const scrollToFooterBtn = document.getElementById('scrollToFooterBtn');
    const footer = document.getElementById('footer');
    if (scrollToFooterBtn && footer) scrollToFooterBtn.addEventListener('click', () => footer.scrollIntoView({ behavior: 'smooth' }));

    // Логіка створення поста
    const createModal = document.getElementById('createPostModal');
    const openCreateBtn = document.getElementById('openCreatePostBtn'); 
    const closeCreateBtn = document.getElementById('closeCreatePostBtn');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('postImageInput');
    const placeholder = document.getElementById('uploadPlaceholder');
    const previewImg = document.getElementById('postImagePreview');
    const changeFileBtn = document.getElementById('changeFileBtn');
    const captionInput = document.getElementById('postCaptionInput');
    const shareBtn = document.getElementById('sharePostBtn');

    if (openCreateBtn && createModal) openCreateBtn.addEventListener('click', () => createModal.style.display = 'flex');
    if (closeCreateBtn) closeCreateBtn.addEventListener('click', () => { createModal.style.display = 'none'; resetForm(); });
    if (uploadArea) uploadArea.addEventListener('click', (e) => { if (e.target !== changeFileBtn && !changeFileBtn.contains(e.target)) fileInput.click(); });
    if (changeFileBtn) changeFileBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
    
    if (fileInput) fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result; previewImg.style.display = 'block';
                placeholder.style.display = 'none'; changeFileBtn.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    if (shareBtn) shareBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        const caption = captionInput.value.trim();
        if (!file && !caption) { alert("Please add a photo or a caption!"); return; }

        const formData = new FormData();
        if (caption) formData.append('caption', caption);
        if (file) formData.append('file', file);

        shareBtn.textContent = 'Sharing...'; shareBtn.disabled = true;
        try {
            const response = await fetch('http://localhost:8080/api/posts/with-media', {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
            });
            if (response.ok) {
                createModal.style.display = 'none'; resetForm();
                loadUserPosts(); 
            } else { alert("Failed to create post."); }
        } catch (error) { console.error(error); alert("Network error."); } 
        finally { shareBtn.textContent = 'Share'; shareBtn.disabled = false; }
    });

    function resetForm() {
        if(fileInput) fileInput.value = ''; if(captionInput) captionInput.value = '';
        if(previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }
        if(placeholder) placeholder.style.display = 'block';
        if(changeFileBtn) changeFileBtn.style.display = 'none';
    }

    // Логіка видалення поста
    const cancelDeleteBtn = document.getElementById('cancelDeletePostBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeletePostBtn');
    const deleteModal = document.getElementById('deletePostModal');

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            deleteModal.style.display = 'none';
            postToDeleteId = null;
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!postToDeleteId) return;
            try {
                const res = await fetch(`http://localhost:8080/api/posts/${postToDeleteId}`, {
                    method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok || res.status === 204) {
                    const postElement = document.getElementById(`post-${postToDeleteId}`);
                    if (postElement) postElement.remove();
                    const statPosts = document.getElementById('statPosts');
                    if (statPosts) statPosts.textContent = Math.max(0, parseInt(statPosts.textContent) - 1);
                    deleteModal.style.display = 'none';
                    postToDeleteId = null;
                } else { alert("Не вдалося видалити пост."); }
            } catch (e) { console.error("Помилка видалення:", e); }
        });
    }

    // Логіка створення сторіс
    const storyMediaInput = document.getElementById('storyMediaInput');
    const storyUploadArea = document.getElementById('storyUploadArea');
    const changeStoryFileBtn = document.getElementById('changeStoryFileBtn');
    const shareStoryBtn = document.getElementById('shareStoryBtn');
    const createStoryModal = document.getElementById('createStoryModal');

    if (storyUploadArea) {
        storyUploadArea.addEventListener('click', (e) => {
            if (e.target !== changeStoryFileBtn && !changeStoryFileBtn.contains(e.target)) storyMediaInput.click();
        });
    }
    if (changeStoryFileBtn) changeStoryFileBtn.addEventListener('click', (e) => { e.stopPropagation(); storyMediaInput.click(); });

    if (storyMediaInput) {
        storyMediaInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            document.getElementById('storyUploadPlaceholder').style.display = 'none';
            changeStoryFileBtn.style.display = 'block';
            if (file.type.startsWith('video/')) {
                document.getElementById('storyImagePreview').style.display = 'none';
                const vid = document.getElementById('storyVideoPreview');
                vid.style.display = 'block'; vid.src = url;
            } else {
                document.getElementById('storyVideoPreview').style.display = 'none';
                const img = document.getElementById('storyImagePreview');
                img.style.display = 'block'; img.src = url;
            }
        });
    }

    if (shareStoryBtn) {
        shareStoryBtn.addEventListener('click', async () => {
            const file = storyMediaInput.files[0];
            const caption = document.getElementById('storyCaptionInput').value.trim();
            if (!file) { alert("Будь ласка, виберіть фото або відео!"); return; }

            const formData = new FormData();
            formData.append('file', file);
            if (caption) formData.append('caption', caption);

            shareStoryBtn.textContent = 'Uploading...';
            shareStoryBtn.disabled = true;

            try {
                const response = await fetch(`http://localhost:8080/api/stories/with-media`, {
                    method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
                });
                if (response.ok) {
                    createStoryModal.style.display = 'none';
                    loadStories(token); 
                    // Скидаємо форму
                    storyMediaInput.value = '';
                    document.getElementById('storyCaptionInput').value = '';
                    document.getElementById('storyUploadPlaceholder').style.display = 'block';
                    document.getElementById('storyImagePreview').style.display = 'none';
                    document.getElementById('storyVideoPreview').style.display = 'none';
                    changeStoryFileBtn.style.display = 'none';
                } else { alert("Помилка завантаження сторіс."); }
            } catch (error) { console.error("Network error:", error); } 
            finally { shareStoryBtn.textContent = 'Share'; shareStoryBtn.disabled = false; }
        });
    }

    // Логаут
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const confirmLogout = document.getElementById('confirmLogout');
    const cancelLogout = document.getElementById('cancelLogout');
    if (logoutBtn && logoutModal) logoutBtn.addEventListener('click', () => logoutModal.style.display = 'flex');
    if (cancelLogout && logoutModal) cancelLogout.addEventListener('click', () => logoutModal.style.display = 'none');
    if (confirmLogout) confirmLogout.addEventListener('click', () => { localStorage.removeItem('jwt_token'); window.location.href = 'index.html'; });

    // Пошук
    const searchInput = document.getElementById('searchInput');
    const searchDropdown = document.getElementById('searchDropdown');
    if (searchInput && searchDropdown) {
        let searchTimeout = null;
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            clearTimeout(searchTimeout);
            if (query.length > 0) {
                searchTimeout = setTimeout(async () => {
                    try {
                        const res = await fetch(`http://localhost:8080/api/profiles`, { headers: { 'Authorization': `Bearer ${token}` } });
                        if (res.ok) {
                            let profiles = await res.json();
                            if (profiles._embedded && profiles._embedded.profileResponseList) profiles = profiles._embedded.profileResponseList;
                            else if (!Array.isArray(profiles)) profiles = [];
                            
                            const filtered = profiles.filter(p => p.username && p.username.toLowerCase().includes(query)).slice(0, 6);
                            searchDropdown.innerHTML = '';
                            if (filtered.length > 0) {
                                filtered.forEach(p => {
                                    const item = `
                                        <div class="search-item" onclick="window.location.href='profile.html?id=${p.userId}'">
                                            <div style="display: flex; flex-direction: column;">
                                                <span style="font-weight:bold; font-size:14px; color: white;">${p.fullName}</span>
                                                <span style="font-size:12px; color: rgba(255,255,255,0.7);">@${p.username}</span>
                                            </div>
                                        </div>
                                    `;
                                    searchDropdown.insertAdjacentHTML('beforeend', item);
                                });
                                searchDropdown.classList.add('active');
                            } else {
                                searchDropdown.innerHTML = '<div style="padding: 10px; color: rgba(255,255,255,0.5); text-align: center;">No users found</div>';
                                searchDropdown.classList.add('active');
                            }
                        }
                    } catch (e) { console.error("Помилка пошуку", e); }
                }, 300);
            } else {
                searchDropdown.classList.remove('active'); searchDropdown.innerHTML = '';
            }
        });
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) searchDropdown.classList.remove('active');
        });
    }
});