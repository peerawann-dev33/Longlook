function toggleUserMenu() {
    const menu = document.getElementById('user-dropdown-menu');
    menu.classList.toggle('hidden');
}

function initUserDropdownState() {
    const dropdownContent =
        document.getElementById('dropdown-action-content');

    if (!isLoggedIn) {
        dropdownContent.innerHTML = `
            <button onclick="switchPage('login'); toggleUserMenu();"
                class="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-[#FAF7F2] transition flex items-center gap-2">
                <span>🔑</span> เข้าสู่ระบบ
            </button>

            <button onclick="switchPage('register'); toggleUserMenu();"
                class="w-full text-left px-4 py-2 text-xs font-semibold text-[#E89387] hover:bg-[#FAF7F2] transition flex items-center gap-2">
                <span>✨</span> สมัครสมาชิก
            </button>
        `;
    } else {
        dropdownContent.innerHTML = `
            <button onclick="switchPage('settings'); toggleUserMenu();"
                class="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-[#FAF7F2] transition flex items-center gap-2">
                <span>⚙️</span> ตั้งค่าระบบ
            </button>

            <hr class="border-gray-100 my-1">

            <button onclick="handleLogout(); toggleUserMenu();"
                class="w-full text-left px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition flex items-center gap-2">
                <span>🚪</span> ออกจากระบบ
            </button>
        `;
    }
}

function loadProfileDataIntoForm() {
    const currentUsername =
        localStorage.getItem('wardrobe_current_user');

    if (!currentUsername) return;

    let users =
        JSON.parse(localStorage.getItem('wardrobe_users')) || [];

    let userObj =
        users.find(u => u.username === currentUsername);

    document.getElementById('settings-username').value =
        currentUsername;

    document.getElementById('settings-display-name').value =
        userObj
            ? (userObj.displayName || currentUsername)
            : currentUsername;

    document.getElementById('settings-password').value = '';
}

function handleUpdateProfile(event) {
    event.preventDefault();

    const currentUsername =
        localStorage.getItem('wardrobe_current_user');

    const newDisplayName =
        document.getElementById('settings-display-name').value.trim();

    const newPassword =
        document.getElementById('settings-password').value;

    if (!newDisplayName) {
        alert('กรุณากรอกชื่อที่แสดงในแอคเคานต์');
        return;
    }

    let users =
        JSON.parse(localStorage.getItem('wardrobe_users')) || [];

    let userObj =
        users.find(u => u.username === currentUsername);

    if (userObj) {
        userObj.displayName = newDisplayName;

        if (newPassword) {
            userObj.password = newPassword;
        }
    }

    localStorage.setItem(
        'wardrobe_users',
        JSON.stringify(users)
    );

    updateUserUI(newDisplayName);

    showPopup(
        '✨ อัปเดตชื่อแอคเคานต์และข้อมูลส่วนตัวเรียบร้อยแล้ว!',
        () => {
            switchPage('settings');
        }
    );
}