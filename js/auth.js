document.addEventListener('DOMContentLoaded', () => {
   
    const loginCard = document.getElementById('loginCard');
    const registerCard = document.getElementById('registerCard');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatarPreview');
    const regCaption = document.getElementById('regCaption');
    const charCount = document.getElementById('charCount');

    // 1. Перемикання карток
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => {
            loginCard.style.display = 'none';
            registerCard.style.display = 'flex';
        });
    }

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            registerCard.style.display = 'none';
            loginCard.style.display = 'flex';
        });
    }

    // 2. Прев'ю аватарки
    if (avatarInput) {
        avatarInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    avatarPreview.innerHTML = `<img src="${e.target.result}" alt="Avatar">`;
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // 3. Лічильник символів для біографії
    if (regCaption && charCount) {
        regCaption.addEventListener('input', () => {
            const currentLength = regCaption.value.length;
            charCount.textContent = currentLength;
        });
    }

  
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    // 4. ЛОГІКА РЕЄСТРАЦІЇ
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const username = document.getElementById('regUsername').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;

            if (password !== confirmPassword) {
                alert("Паролі не співпадають!");
                return; 
            }

            try {
               
                const formData = new FormData();
                formData.append('username', username);
                formData.append('email', email);
                formData.append('password', password);
                formData.append('fullName', document.getElementById('regFullName').value.trim());
                
                
                formData.append('bio', document.getElementById('regCaption').value.trim()); 
                
                const avatarFile = document.getElementById('avatarInput').files[0];
                if (avatarFile) {
                    formData.append('avatar', avatarFile); 
                }

            
                const signupResponse = await fetch(`${API_BASE_URL}/api/auth/signup`, {
                    method: 'POST',
                    body: formData 
                });

                if (!signupResponse.ok) {
                    const errorText = await signupResponse.text();
                    alert(`Помилка реєстрації: ${errorText}`);
                    return; 
                }

                
                const loginResponse = await fetch(`${API_BASE_URL}/api/auth/signin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (!loginResponse.ok) {
                    alert("Акаунт створено, але не вдалося увійти автоматично. Спробуйте увійти вручну.");
                    document.getElementById('showLoginBtn').click();
                    return;
                }
                
                const token = await loginResponse.text();
                localStorage.setItem('jwt_token', token); 

                
                window.location.href = 'feed.html';

            } catch (error) {
                console.error("Помилка мережі:", error);
                alert("Не вдалося підключитися до сервера.");
            }
        });
    }

    // 5. ЛОГІКА ЗВИЧАЙНОГО ЛОГІНУ
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); 

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();

            const loginData = {
                username: username,
                password: password
            };

            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(loginData)
                });

                if (response.ok) {
                    
                    const tokenData = await response.text();
                    localStorage.setItem('jwt_token', tokenData); 
                    
                    window.location.href = 'feed.html';
                } else {
                    alert('Неправильний логін або пароль. Спробуйте ще раз.');
                }

            } catch (error) {
                console.error("Помилка з'єднання:", error);
                alert("Не вдалося підключитися до сервера. Перевірити, чи запущений Spring Boot або тунель Ngrok.");
            }
        });
    }
});