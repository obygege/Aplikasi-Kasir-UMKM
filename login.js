document.addEventListener('DOMContentLoaded', function() {
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbylZOgwX-AnohlwUxFIAAjWHY89Xg1TGMCZkpnHyaflKU70EtgbGEwRR10hVq7Jh4Y7/exec';

    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const loginButton = document.getElementById('login-button');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        errorMessage.classList.add('hidden');
        loginButton.disabled = true;
        loginButton.textContent = 'MEMPROSES...';

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const loginData = {
            action: 'login',
            username: username,
            password: password
        };

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(loginData),
            });
            const result = await response.json();

            if (result.status === 'success') {
                sessionStorage.setItem('userRole', result.role);
                if (result.role === 'admin') {
                    window.location.href = 'admin/index.html';
                } else if (result.role === 'penjual') {
                    window.location.href = 'penjual/index.html';
                }
            } else {
                errorMessage.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.classList.remove('hidden');
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'LOGIN';
        }
    });
});