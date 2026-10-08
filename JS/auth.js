function checkActiveSession() {
    const savedUser =
        localStorage.getItem('wardrobe_current_user');

    if (savedUser) {
        isLoggedIn = true;

        let users =
            JSON.parse(localStorage.getItem('wardrobe_users')) || [];

        let userObj =
            users.find(u => u.username === savedUser);

        let displayName =
            userObj
                ? (userObj.displayName || userObj.username)
                : savedUser;

        updateUserUI(displayName);
    }
}

function handleRegister(event) {
    event.preventDefault();

    const username =
        document.getElementById('reg-user').value.trim();

    const displayName =
        document.getElementById('reg-display-name').value.trim();

    const password =
        document.getElementById('reg-pass').value;

    const confirmPassword =
        document.getElementById('reg-pass-confirm').value;

    if (!username || !displayName || !password) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }

    if (password !== confirmPassword) {
        alert('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
        return;
    }

    let users =
        JSON.parse(localStorage.getItem('wardrobe_users')) || [];

    if (users.some(u => u.username === username)) {
        alert('ชื่อผู้ใช้นี้ (Username) ถูกใช้งานไปแล้ว');
        return;
    }

    users.push({
        username,
        displayName,
        password
    });

    localStorage.setItem(
        'wardrobe_users',
        JSON.stringify(users)
    );

    showPopup('🎉 สมัครสมาชิกสำเร็จ!', () => {

        document.getElementById('reg-user').value = '';
        document.getElementById('reg-display-name').value = '';
        document.getElementById('reg-pass').value = '';
        document.getElementById('reg-pass-confirm').value = '';

        loginSuccess(username, displayName);
    });
}

function handleLogin(event) {
    event.preventDefault();

    const username =
        document.getElementById('login-user').value.trim();

    const password =
        document.getElementById('login-pass').value;

    let users =
        JSON.parse(localStorage.getItem('wardrobe_users')) || [];

    const foundUser =
        users.find(
            u =>
                u.username === username &&
                u.password === password
        );

    if (!foundUser) {
        alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        return;
    }

    loginSuccess(
        foundUser.username,
        foundUser.displayName || foundUser.username
    );
}

function loginSuccess(username, displayName) {
    isLoggedIn = true;

    localStorage.setItem(
        'wardrobe_current_user',
        username
    );

    showPopup(`💜 ยินดีต้อนรับคุณ ${displayName}`, () => {
        updateUserUI(displayName);
        switchPage('home');
    });
}

function updateUserUI(displayName) {
    document.getElementById('user-avatar-icon').className =
        'w-7 h-7 bg-[#E89387] text-white rounded-full flex items-center justify-center text-xs font-bold';

    document.getElementById('user-avatar-icon').innerText =
        displayName.charAt(0).toUpperCase();

    document.getElementById('user-name-label').innerText =
        displayName;

    initUserDropdownState();
}

function handleLogout() {
    isLoggedIn = false;

    localStorage.removeItem('wardrobe_current_user');

    showPopup('👋 ออกจากระบบเรียบร้อย', () => {

        document.getElementById('user-avatar-icon').className =
            'w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs';

        document.getElementById('user-avatar-icon').innerText = '👤';

        document.getElementById('user-name-label').innerText =
            'ผู้เยี่ยมชม';

        initUserDropdownState();

        switchPage('home');
    });
}