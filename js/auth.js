function openLoginModal() {
    document.getElementById('login-modal')?.classList.remove('hidden');
}

function closeLoginModal() {
    document.getElementById('login-modal')?.classList.add('hidden');
}

function toggleAuthTab(tab) {
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');
    const loginBtn = document.getElementById('tab-login-btn');
    const registerBtn = document.getElementById('tab-register-btn');

    const active = 'flex-1 py-2 text-xs font-bold text-[#3D2B1F] border-b-2 border-[#3D2B1F]';
    const idle = 'flex-1 py-2 text-xs font-bold text-[#6B5647]';

    if (tab === 'register') {
        loginForm?.classList.add('hidden');
        registerForm?.classList.remove('hidden');
        if (loginBtn) loginBtn.className = idle;
        if (registerBtn) registerBtn.className = active;
    } else {
        registerForm?.classList.add('hidden');
        loginForm?.classList.remove('hidden');
        if (registerBtn) registerBtn.className = idle;
        if (loginBtn) loginBtn.className = active;
    }
}

function applyLoggedInUser(user) {
    const name = user?.username || 'ผู้เยี่ยมชม';
    document.querySelectorAll('#user-name-label, .user-name, #user-name-display').forEach((el) => {
        el.innerText = name;
    });
    const loginBtn = document.getElementById('btn-login-trigger');
    if (loginBtn) {
        loginBtn.innerText = 'ออกจากระบบ';
        loginBtn.onclick = handleUserLogout;
    }
}

function applyLoggedOutUser() {
    document.querySelectorAll('#user-name-label, .user-name, #user-name-display').forEach((el) => {
        el.innerText = 'ผู้เยี่ยมชม';
    });
    const loginBtn = document.getElementById('btn-login-trigger');
    if (loginBtn) {
        loginBtn.innerText = 'เข้าสู่ระบบ / สมัครสมาชิก';
        loginBtn.onclick = openLoginModal;
    }
}

function handleUserLogout() {
    localStorage.removeItem('longlook_token');
    localStorage.removeItem('longlook_user');
    applyLoggedOutUser();
}

async function handleUserLogin(event) {
    event.preventDefault();
    const username = document.getElementById('login-username')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    try {
        const response = await fetch(`${window.LONGLOOK_API}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (!response.ok) {
            alert(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
            return;
        }
        localStorage.setItem('longlook_token', data.token);
        localStorage.setItem('longlook_user', JSON.stringify(data.user));
        applyLoggedInUser(data.user);
        closeLoginModal();
        if (typeof loadClothesFromDatabase === 'function') loadClothesFromDatabase();
        if (typeof loadCalendarHistory === 'function') loadCalendarHistory();
        alert(data.message);
    } catch (err) {
        console.error(err);
        alert('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณารัน backend ที่พอร์ต 5000');
    }
}

async function handleUserRegister(event) {
    event.preventDefault();
    const username = document.getElementById('reg-username')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    try {
        const response = await fetch(`${window.LONGLOOK_API}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (!response.ok) {
            alert(data.message || 'สมัครสมาชิกไม่สำเร็จ');
            return;
        }
        localStorage.setItem('longlook_token', data.token);
        localStorage.setItem('longlook_user', JSON.stringify(data.user));
        applyLoggedInUser(data.user);
        closeLoginModal();
        alert(data.message);
    } catch (err) {
        console.error(err);
        alert('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณารัน backend ที่พอร์ต 5000');
    }
}

function checkActiveSession() {
    const token = localStorage.getItem('longlook_token');
    const rawUser = localStorage.getItem('longlook_user');
    if (!token || !rawUser) {
        applyLoggedOutUser();
        return;
    }
    try {
        applyLoggedInUser(JSON.parse(rawUser));
        if (typeof loadClothesFromDatabase === 'function') loadClothesFromDatabase();
        if (typeof loadCalendarHistory === 'function') loadCalendarHistory();
    } catch {
        handleUserLogout();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkActiveSession();
});
