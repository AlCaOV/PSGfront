document.addEventListener('DOMContentLoaded', () => {
    let rawToken = localStorage.getItem('jwt_token');
    const token = rawToken ? rawToken.replace(/"/g, '') : null;

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    let currentUserId = null;
    let selectedAvatarFile = null;

    // Елементи форми
    const fullNameInput = document.getElementById('editFullName');
    const usernameInput = document.getElementById('editUsername');
    const emailInput = document.getElementById('editEmail');
    const bioInput = document.getElementById('editBioInput');
    const charCounter = document.getElementById('editCharCounter');
    
    // Аватар
    const avatarCircle = document.getElementById('editAvatarCircle');
    const avatarInput = document.getElementById('editAvatarInput');
    const avatarPreview = document.getElementById('editAvatarPreview');
    const avatarOverlay = document.getElementById('editAvatarOverlay');

    // Кнопки
    const saveBtn = document.getElementById('saveProfileBtn');
    const declineBtn = document.getElementById('declineProfileBtn');

    // 1. ЗАВАНТАЖЕННЯ ДАНИХ ПРИ СТАРТІ
    async function loadCurrentData() {
    try {
        const profRes = await fetch('http://localhost:8080/api/profiles/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (profRes.ok) {
            const profile = await profRes.json();
            currentUserId = profile.userId;
            
            fullNameInput.value = profile.fullName || '';
            bioInput.value = profile.bio || '';
            updateCharCount();

            // ТЕПЕР МИ БЕРЕМО ДАНІ ПРЯМО З ОБ'ЄКТА profile
            if (profile.username) usernameInput.value = `@${profile.username}`;
            if (profile.email) emailInput.value = profile.email; // ЗАПОВНЮЄМО ІМЕЙЛ ТУТ
            
            if (profile.avatarUrl) {
                const cleanFileName = profile.avatarUrl.split('/').pop().split('\\').pop();
                avatarPreview.src = `http://localhost:8080/api/images/${cleanFileName}`;
                avatarPreview.style.display = 'block';
                avatarOverlay.style.display = 'none';
             }
            }
        
             // ВЕСЬ БЛОК З userRes (запит на /api/users/me) МОЖНА ВИДАЛИТИ
        } catch (e) { console.error("Помилка завантаження даних", e); }
    }

    loadCurrentData();

    // 2. ОБРОБКА АВАТАРА
    avatarCircle.addEventListener('click', () => avatarInput.click());
    
    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            selectedAvatarFile = file;
            const url = URL.createObjectURL(file);
            avatarPreview.src = url;
            avatarPreview.style.display = 'block';
            avatarOverlay.style.display = 'none';
        }
    });

    // Лічильник символів
    bioInput.addEventListener('input', updateCharCount);
    function updateCharCount() {
        charCounter.textContent = `${bioInput.value.length}/2000`;
    }

    // 3. ЗБЕРЕЖЕННЯ ЗМІН (SAVE)
    saveBtn.addEventListener('click', async () => {
        if (!currentUserId) return;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;

        try {
            let finalAvatarUrl = null;

            // Якщо вибрали нову картинку - спочатку завантажуємо її (якщо у тебе є такий ендпоінт)
            // ПРИМІТКА: Якщо ендпоінта для аватара ще немає, цей блок можна закоментувати
            if (selectedAvatarFile) {
                const formData = new FormData();
                formData.append('file', selectedAvatarFile);
                const uploadRes = await fetch(`http://localhost:8080/api/profiles/avatar`, { // Заміни на свій URL
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                if (uploadRes.ok) {
                    finalAvatarUrl = await uploadRes.text(); // Або JSON, залежно від бекенду
                }
            }

            // Відправляємо PUT запит з текстовими даними
            const updatePayload = {
                fullName: fullNameInput.value.trim(),
                bio: bioInput.value.trim()
            };
            if (finalAvatarUrl) updatePayload.avatarUrl = finalAvatarUrl;

            const updateRes = await fetch(`http://localhost:8080/api/profiles/${currentUserId}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatePayload)
            });

            if (updateRes.ok) {
                window.location.href = 'profile.html'; // Повертаємось у профіль
            } else {
                alert("Не вдалося зберегти зміни.");
            }
        } catch (e) {
            console.error("Помилка оновлення", e);
        } finally {
            saveBtn.textContent = 'Save changes';
            saveBtn.disabled = false;
        }
    });

    // 4. ВІДМІНА (DECLINE)
    declineBtn.addEventListener('click', () => {
        window.location.href = 'profile.html';
    });

    // Навігація в сайдбарі
    document.getElementById('homeBtn')?.addEventListener('click', () => window.location.href = 'feed.html');
    document.getElementById('profileRedirectBtn')?.addEventListener('click', () => window.location.href = 'profile.html');
}); 