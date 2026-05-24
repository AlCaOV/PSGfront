let allPostsList = []; 
let postsDisplayed = 0; 
const POSTS_CHUNK = 2; 

function getCleanImageUrl(url) {
    if (!url) return ''; 
    if (url.startsWith('http')) return url;
    const cleanFileName = url.split('/').pop().split('\\').pop();
    return `${API_BASE_URL}/api/images/${cleanFileName}`;
}

async function loadPosts() {
    const token = localStorage.getItem('jwt_token') ? localStorage.getItem('jwt_token').replace(/"/g, '') : null;
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/posts/feed`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            allPostsList = await response.json();
            allPostsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
         
            document.getElementById('feedContainer').innerHTML = '';
            postsDisplayed = 0;
            
          
            showNextPosts();
        }
    } catch (error) {
        console.error("Помилка завантаження постів:", error);
    }
}


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
        const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/likes`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
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
        } else {
            console.error("Помилка при постановці лайку");
        }
    } catch (error) {
        console.error("Помилка лайку:", error);
    }
}

async function addComment(event, postId) {
    event.preventDefault(); 
    const inputField = document.getElementById(`comment-input-${postId}`);
    const text = inputField.value.trim();
    
    if (!text) return; 

    const token = localStorage.getItem('jwt_token') ? localStorage.getItem('jwt_token').replace(/"/g, '') : null;
    inputField.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
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
            
            if (commentsList.innerHTML.includes('No comments yet')) {
                commentsList.innerHTML = '';
            }
            
            commentsList.insertAdjacentHTML('beforeend', newCommentHtml);
            commentsList.scrollTop = commentsList.scrollHeight;

            const countSpan = document.querySelector(`#post-${postId} .comment-count-new`);
            if (countSpan) {
                let currentCount = parseInt(countSpan.textContent.replace(/[^0-9]/g, '')) || 0;
                countSpan.innerHTML = `<i class="fa-solid fa-comment-dots"></i> ${currentCount + 1}`;
            }
            
        }
    } catch (error) {
        console.error("Помилка відправки коментаря:", error);
    } finally {
        inputField.disabled = false;
        inputField.focus(); 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    let rawToken = localStorage.getItem('jwt_token');
    const token = rawToken ? rawToken.replace(/"/g, '') : null;

    
    loadPosts();

    
    const loadMoreBtnEl = document.getElementById('loadMoreBtn');
    if (loadMoreBtnEl) {
        loadMoreBtnEl.addEventListener('click', showNextPosts);
    }

 
    const profileBtn = document.getElementById('profileRedirectBtn');
    if (profileBtn) {
        profileBtn.addEventListener('click', () => window.location.href = 'profile.html');

        async function loadMyAvatar() {
            if (!token) return;
            try {
                const response = await fetch(`${API_BASE_URL}/api/profiles/me`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const profileData = await response.json();
                    
                    const modalAvatar = document.getElementById('currentUserAvatarPost');
                    const modalName = document.getElementById('currentUserNamePost');
                    
                    if (modalName) modalName.textContent = profileData.fullName || "User";

                    if (profileData.avatarUrl) {
                        const cleanFileName = profileData.avatarUrl.split('/').pop().split('\\').pop(); 
                        const avatarSrc = `${API_BASE_URL}/api/images/${cleanFileName}`;
                        
                        profileBtn.innerHTML = `<img src="${avatarSrc}" alt="Avatar">`;
                        if (modalAvatar) modalAvatar.src = avatarSrc;
                    } else {
                        const initial = profileData.fullName ? profileData.fullName.charAt(0).toUpperCase() : 'U';
                        profileBtn.innerHTML = `<span>${initial}</span>`;
                    }
                }
            } catch (error) {
                console.error("Не вдалося завантажити аватарку:", error);
            }
        }
        loadMyAvatar();
    }
   
    // 4. НАВІГАЦІЯ
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) homeBtn.addEventListener('click', () => window.location.href = 'feed.html');

    const scrollToFooterBtn = document.getElementById('scrollToFooterBtn');
    const footer = document.getElementById('footer');
    if (scrollToFooterBtn && footer) {
        scrollToFooterBtn.addEventListener('click', () => {
            footer.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // 5. ВІКНО СТВОРЕННЯ ПОСТА
    const createModal = document.getElementById('createPostModal');
    const openCreateBtn = document.getElementById('openCreatePostBtn'); 
    const closeCreateBtn = document.getElementById('closeCreatePostBtn');
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('postImageInput');
    const placeholder = document.getElementById('uploadPlaceholder');
    const previewImg = document.getElementById('postImagePreview');
    const changeFileBtn = document.getElementById('changeFileBtn');
    const captionInput = document.getElementById('postCaptionInput');
    const charCounter = document.getElementById('charCounter');
    const shareBtn = document.getElementById('sharePostBtn');

    if (openCreateBtn && createModal) {
        openCreateBtn.addEventListener('click', () => {
            createModal.style.display = 'flex';
        });
    }

    if (closeCreateBtn) {
        closeCreateBtn.addEventListener('click', () => {
            createModal.style.display = 'none';
            resetForm();
        });
    }

    if (uploadArea) uploadArea.addEventListener('click', (e) => {
        if (e.target !== changeFileBtn && !changeFileBtn.contains(e.target)) fileInput.click();
    });
    
    if (changeFileBtn) changeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        fileInput.click();
    });

    if (fileInput) fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                placeholder.style.display = 'none';
                changeFileBtn.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    if (captionInput) {
        captionInput.addEventListener('input', () => {
            charCounter.textContent = `${captionInput.value.length}/2000`;
        });
    }

    if (shareBtn) shareBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        const caption = captionInput.value.trim();

        if (!file && !caption) {
            alert("Please add a photo or a caption!");
            return;
        }

        const formData = new FormData();
        if (caption) formData.append('caption', caption);
        if (file) formData.append('file', file);

        shareBtn.textContent = 'Sharing...';
        shareBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/api/posts/with-media`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                createModal.style.display = 'none';
                resetForm();
                loadPosts(); 
            } else {
                alert("Failed to create post.");
            }
        } catch (error) {
            console.error("Помилка:", error);
            alert("Network error.");
        } finally {
            shareBtn.textContent = 'Share';
            shareBtn.disabled = false;
        }
    });

    function resetForm() {
        if(fileInput) fileInput.value = '';
        if(captionInput) captionInput.value = '';
        if(previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }
        if(placeholder) placeholder.style.display = 'block';
        if(changeFileBtn) changeFileBtn.style.display = 'none';
        if(charCounter) charCounter.textContent = '0/2000';
    }

    // 6. ВІКНО ВИХОДУ З АКАУНТУ
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const confirmLogout = document.getElementById('confirmLogout');
    const cancelLogout = document.getElementById('cancelLogout');

    if (logoutBtn && logoutModal) logoutBtn.addEventListener('click', () => logoutModal.style.display = 'flex');
    if (cancelLogout && logoutModal) cancelLogout.addEventListener('click', () => logoutModal.style.display = 'none');
    if (confirmLogout) confirmLogout.addEventListener('click', () => {
        localStorage.removeItem('jwt_token');
        window.location.href = 'index.html'; 
    });

    // 7. ПОШУК
    // ==========================================
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
                        const res = await fetch(`${API_BASE_URL}/api/profiles`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if (res.ok) {
                            let profiles = await res.json();
                            
                            if (profiles._embedded && profiles._embedded.profileResponseList) {
                                profiles = profiles._embedded.profileResponseList;
                            } else if (!Array.isArray(profiles)) {
                                profiles = [];
                            }
                            
                            const filtered = profiles.filter(p => 
                                p.username && p.username.toLowerCase().includes(query)
                            ).slice(0, 6);

                            // 1. ОЧИЩАЄМО СПИСОК ПЕРЕД НОВИМ ВИВОДОМ
                            searchDropdown.innerHTML = '';

                            if (filtered.length > 0) {
                                filtered.forEach(p => {
                                    const targetId = p.userId;
                                    const item = `
                                        <div class="search-item" onclick="window.location.href='profile.html?id=${targetId}'">
                                            <div style="display: flex; flex-direction: column;">
                                                <span style="font-weight:bold; font-size:14px; color: white;">${p.fullName}</span>
                                                <span style="font-size:12px; color: rgba(255,255,255,0.7);">@${p.username}</span>
                                            </div>
                                        </div>
                                    `;
                                    searchDropdown.insertAdjacentHTML('beforeend', item);
                                });
                                // 2. РОБИМО СПИСОК ВИДИМИМ
                                searchDropdown.classList.add('active');
                            } else {
                                // Якщо нікого не знайшли
                                searchDropdown.innerHTML = '<div style="padding: 10px; color: rgba(255,255,255,0.5); text-align: center;">No users found</div>';
                                searchDropdown.classList.add('active');
                            }
                        }
                    } catch (e) {
                        console.error("Помилка пошуку", e);
                    }
                }, 300);
            } else {
                searchDropdown.classList.remove('active');
                searchDropdown.innerHTML = '';
            }
        });

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.classList.remove('active');
            }
        });
    }
});