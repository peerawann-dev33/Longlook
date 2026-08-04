let isLoggedIn = false;
let popupCallback = null;
let selectedDateKey = null;
let currentRandomOutfitItems = [];

let calendarOutfits = JSON.parse(localStorage.getItem('wardrobe_calendar')) || {};
let closetItems = JSON.parse(localStorage.getItem('wardrobe_items')) || [
    { id: 1, name: 'เสื้อเชิ้ตสีขาว', category: 'เสื้อ', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300' },
    { id: 2, name: 'กางเกงยีนส์ขายาว', category: 'กางเกง', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300' }
];

window.addEventListener('DOMContentLoaded', () => {
    checkActiveSession();
    initRealCalendar();
    fetchRealWeather();
    renderCloset();
    initUserDropdownState();

    window.addEventListener('click', (e) => {
        const container = document.getElementById('user-profile-container');
        const menu = document.getElementById('user-dropdown-menu');
        if (container && menu && !container.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });
});

function toggleUserMenu() {
    const menu = document.getElementById('user-dropdown-menu');
    menu.classList.toggle('hidden');
}

function initUserDropdownState() {
    const dropdownContent = document.getElementById('dropdown-action-content');
    if (!isLoggedIn) {
        dropdownContent.innerHTML = `
            <button onclick="switchPage('login'); toggleUserMenu();" class="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-[#FAF7F2] transition flex items-center gap-2">
                <span>🔑</span> เข้าสู่ระบบ
            </button>
            <button onclick="switchPage('register'); toggleUserMenu();" class="w-full text-left px-4 py-2 text-xs font-semibold text-[#E89387] hover:bg-[#FAF7F2] transition flex items-center gap-2">
                <span>✨</span> สมัครสมาชิก
            </button>
        `;
    } else {
        dropdownContent.innerHTML = `
            <button onclick="switchPage('settings'); toggleUserMenu();" class="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-[#FAF7F2] transition flex items-center gap-2">
                <span>⚙️</span> ตั้งค่าระบบ
            </button>
            <hr class="border-gray-100 my-1">
            <button onclick="handleLogout(); toggleUserMenu();" class="w-full text-left px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition flex items-center gap-2">
                <span>🚪</span> ออกจากระบบ
            </button>
        `;
    }
}

function checkActiveSession() {
    const savedUser = localStorage.getItem('wardrobe_current_user');
    if (savedUser) {
        isLoggedIn = true;
        let users = JSON.parse(localStorage.getItem('wardrobe_users')) || [];
        let userObj = users.find(u => u.username === savedUser);
        let displayName = userObj ? (userObj.displayName || userObj.username) : savedUser;
        updateUserUI(displayName);
    }
}

function switchPage(pageId) {
    const protectedPages = ['matcher', 'closet', 'calendar', 'stats', 'settings', 'settings-profile'];

    if (protectedPages.includes(pageId) && !isLoggedIn) {
        showPopup('🔒 กรุณาเข้าสู่ระบบก่อนใช้งานฟังก์ชันนี้', () => {
            switchPage('login');
        });
        return;
    }

    document.querySelectorAll('.page-content').forEach(el => el.classList.add('hidden'));
    document.getElementById('page-' + pageId).classList.remove('hidden');

    document.querySelectorAll('aside nav button').forEach(btn => {
        btn.className = 'w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-gray-500 hover:bg-gray-50 transition';
    });
    const activeBtn = document.getElementById('nav-' + pageId);
    if (activeBtn) {
        activeBtn.className = 'w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium bg-[#F3ECE4] text-[#8C6D53] transition';
    }

    if (pageId === 'closet' || pageId === 'home') {
        renderCloset();
    }
    if (pageId === 'calendar') {
        renderFullCalendar();
    }
    if (pageId === 'stats') {
        document.getElementById('stat-total').innerText = closetItems.length + ' ไอเทมในตู้';
    }
    if (pageId === 'settings-profile') {
        loadProfileDataIntoForm();
    }

    window.scrollTo(0, 0);
}

// โหลดข้อมูลเดิมมาใส่ฟอร์มโปรไฟล์
function loadProfileDataIntoForm() {
    const currentUsername = localStorage.getItem('wardrobe_current_user');
    if (!currentUsername) return;

    let users = JSON.parse(localStorage.getItem('wardrobe_users')) || [];
    let userObj = users.find(u => u.username === currentUsername);

    document.getElementById('settings-username').value = currentUsername;
    document.getElementById('settings-display-name').value = userObj ? (userObj.displayName || currentUsername) : currentUsername;
    document.getElementById('settings-password').value = '';
}

// ฟังก์ชันบันทึกการแก้ไขชื่อแอคเคานต์และรหัสผ่าน
function handleUpdateProfile(event) {
    event.preventDefault();
    const currentUsername = localStorage.getItem('wardrobe_current_user');
    const newDisplayName = document.getElementById('settings-display-name').value.trim();
    const newPassword = document.getElementById('settings-password').value;

    if (!newDisplayName) {
        alert('กรุณากรอกชื่อที่แสดงในแอคเคานต์');
        return;
    }

    let users = JSON.parse(localStorage.getItem('wardrobe_users')) || [];
    let userObj = users.find(u => u.username === currentUsername);

    if (userObj) {
        userObj.displayName = newDisplayName;
        if (newPassword) {
            userObj.password = newPassword;
        }
    }

    localStorage.setItem('wardrobe_users', JSON.stringify(users));

    updateUserUI(newDisplayName);
    showPopup('✨ อัปเดตชื่อแอคเคานต์และข้อมูลส่วนตัวเรียบร้อยแล้ว!', () => {
        switchPage('settings');
    });
}

// ดึงสภาพอากาศจริง
async function fetchRealWeather() {
    try {
        const lat = 13.7563;
        const lon = 100.5018;
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
        const data = await response.json();

        const currentTemp = Math.round(data.current.temperature_2m);
        const humidity = data.current.relative_humidity_2m;
        const maxTemp = Math.round(data.daily.temperature_2m_max[0]);
        const minTemp = Math.round(data.daily.temperature_2m_min[0]);
        const weatherCode = data.current.weather_code;

        let conditionText = 'อากาศแจ่มใส';
        let weatherIcon = '☀️';
        let adviceText = 'แต่งตัวสบายๆ รับแสงแดดได้เลยจ้า ✨';

        if (weatherCode >= 1 && weatherCode <= 3) {
            conditionText = 'มีเมฆบางส่วน';
            weatherIcon = '⛅';
            adviceText = 'อากาศกำลังดี ใส่เสื้อผ้าโปร่งสบายได้เลยครับ';
        } else if (weatherCode >= 51) {
            conditionText = 'มีฝนตก';
            weatherIcon = '🌧️';
            adviceText = 'ฝนอาจตก พกร่มหรือเสื้อกันฝนออกไปด้วยนะ ☂️';
        } else if (currentTemp >= 33) {
            conditionText = 'อากาศร้อนจัด';
            weatherIcon = '🔥';
            adviceText = 'แดดค่อนข้างแรง แนะนำเสื้อผ้าโปร่งและพกร่มกันแดดครับ';
        }

        document.getElementById('weather-temp').innerText = `${currentTemp}°C`;
        document.getElementById('weather-temp-sub').innerText = `${minTemp}-${maxTemp}°C`;
        document.getElementById('weather-condition').innerText = conditionText;
        document.getElementById('weather-icon').innerText = weatherIcon;
        document.getElementById('weather-high-low').innerText = `↑ ${maxTemp}°C  ↓ ${minTemp}°C`;
        document.getElementById('weather-humidity').innerText = `💧 ${humidity}%`;
        document.getElementById('weather-advice').innerHTML = `<span>👕</span> แนะนำ: ${adviceText}`;

    } catch (error) {
        console.error('ไม่สามารถดึงข้อมูลสภาพอากาศได้:', error);
    }
}

// ปฏิทินย่อหน้าหลัก
function initRealCalendar() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    document.getElementById('calendar-month-year').innerText = `ปฏิทิน ${monthNames[currentMonth]}`;
    document.getElementById('current-date-badge').innerText = `${currentDate} ${monthNames[currentMonth]} ${currentYear + 543}`;

    const calendarGrid = document.getElementById('real-calendar-grid');
    let calendarHtml = '';

    let startOfWeek = new Date(now);
    startOfWeek.setDate(currentDate - now.getDay());

    for (let i = 0; i < 7; i++) {
        let loopDate = new Date(startOfWeek);
        loopDate.setDate(startOfWeek.getDate() + i);
        let dateNum = loopDate.getDate();

        if (dateNum === currentDate) {
            calendarHtml += `<span class="bg-[#E89387] text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto font-bold shadow-sm">${dateNum}</span>`;
        } else {
            calendarHtml += `<span class="text-gray-600 flex items-center justify-center h-6">${dateNum}</span>`;
        }
    }
    calendarGrid.innerHTML = calendarHtml;
}

// ปฏิทินเต็มเดือน
function renderFullCalendar() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    document.getElementById('full-calendar-title').innerText = `${monthNames[currentMonth]} ${currentYear + 543}`;

    const calendarGrid = document.getElementById('full-calendar-grid');
    let calendarHtml = '';

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
        calendarHtml += `<div></div>`;
    }

    for (let day = 1; day <= totalDays; day++) {
        let monthStr = String(currentMonth + 1).padStart(2, '0');
        let dayStr = String(day).padStart(2, '0');
        let dateKey = `${currentYear}-${monthStr}-${dayStr}`;
        
        let hasOutfit = calendarOutfits[dateKey] && calendarOutfits[dateKey].length > 0;
        let isToday = (day === currentDate);

        let bgClass = "bg-[#FAF7F2] hover:bg-gray-100 text-gray-700 border border-[#EFECE6]";
        let badgeText = hasOutfit ? '✨ มีชุดแล้ว' : 'ว่าง';

        if (isToday) {
            bgClass = "bg-[#F3ECE4] border-2 border-[#E89387] text-gray-800 font-bold";
        }

        calendarHtml += `
            <div onclick="openDayModal('${dateKey}', ${day})" class="${bgClass} rounded-2xl h-20 flex flex-col items-center justify-center transition cursor-pointer p-1 relative">
                <span class="text-sm font-semibold">${day}</span>
                <span class="text-[9px] text-[#8C6D53] mt-1 truncate w-full px-1">${hasOutfit ? '🧥 ' + calendarOutfits[dateKey].length + ' ชิ้น' : badgeText}</span>
            </div>
        `;
    }

    calendarGrid.innerHTML = calendarHtml;
}

function openDayModal(dateKey, dayNum) {
    if (!isLoggedIn) {
        showPopup('🔒 กรุณาเข้าสู่ระบบก่อนจัดการปฏิทินชุด', () => { switchPage('login'); });
        return;
    }

    selectedDateKey = dateKey;
    document.getElementById('modal-day-title').innerText = `จัดการชุดวันที่ ${dayNum} สิงหาคม 2569`;
    renderDayModalContent();
    document.getElementById('day-modal').classList.remove('hidden');
}

function closeDayModal() {
    document.getElementById('day-modal').classList.add('hidden');
    renderFullCalendar();
}

function renderDayModalContent() {
    const outfitListContainer = document.getElementById('modal-outfit-list');
    const closetSelector = document.getElementById('modal-closet-selector');

    let currentDayItems = calendarOutfits[selectedDateKey] || [];
    
    if (currentDayItems.length === 0) {
        outfitListContainer.innerHTML = `<p class="text-xs text-gray-400 italic">ยังไม่มีการบันทึกชุดสำหรับวันนี้ เลือกไอเทมด้านล่างเพื่อเพิ่มได้เลย</p>`;
    } else {
        let html = '';
        currentDayItems.forEach((item, index) => {
            html += `
                <div class="bg-white px-3 py-1.5 rounded-xl border border-[#EAE6DF] flex items-center gap-2 text-xs shadow-sm">
                    <img src="${item.image}" class="w-6 h-6 object-contain rounded-md">
                    <span class="font-medium text-gray-800">${item.name}</span>
                    <button onclick="removeItemFromDate(${index})" class="text-red-400 hover:text-red-600 font-bold ml-1">✕</button>
                </div>
            `;
        });
        outfitListContainer.innerHTML = html;
    }

    let closetHtml = '';
    if (closetItems.length === 0) {
        closetHtml = `<p class="text-xs text-gray-400 col-span-full">ตู้เสื้อผ้าว่างเปล่า</p>`;
    } else {
        closetItems.forEach(item => {
            closetHtml += `
                <div onclick="addItemToDate(${item.id})" class="bg-white hover:bg-[#FAF7F2] p-2 rounded-xl border border-[#EAE6DF] text-center cursor-pointer transition">
                    <div class="w-12 h-12 mx-auto mb-1 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                        <img src="${item.image}" class="w-full h-full object-contain">
                    </div>
                    <div class="text-[10px] font-medium text-gray-700 truncate">${item.name}</div>
                </div>
            `;
        });
    }
    closetSelector.innerHTML = closetHtml;
}

function addItemToDate(itemId) {
    const item = closetItems.find(i => i.id === itemId);
    if (!item) return;

    if (!calendarOutfits[selectedDateKey]) {
        calendarOutfits[selectedDateKey] = [];
    }

    if (!calendarOutfits[selectedDateKey].some(i => i.id === itemId)) {
        calendarOutfits[selectedDateKey].push(item);
        localStorage.setItem('wardrobe_calendar', JSON.stringify(calendarOutfits));
        renderDayModalContent();
    }
}

function removeItemFromDate(index) {
    calendarOutfits[selectedDateKey].splice(index, 1);
    if (calendarOutfits[selectedDateKey].length === 0) {
        delete calendarOutfits[selectedDateKey];
    }
    localStorage.setItem('wardrobe_calendar', JSON.stringify(calendarOutfits));
    renderDayModalContent();
}

function saveTodayOutfit() {
    if (!isLoggedIn) {
        showPopup('🔒 กรุณาเข้าสู่ระบบก่อนบันทึกลุค', () => { switchPage('login'); });
        return;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const dayStr = String(now.getDate()).padStart(2, '0');
    const todayKey = `${currentYear}-${monthStr}-${dayStr}`;

    calendarOutfits[todayKey] = [...closetItems.slice(0, 2)];
    localStorage.setItem('wardrobe_calendar', JSON.stringify(calendarOutfits));

    showPopup('✨ บันทึกลุคประจำวันลงในปฏิทินเรียบร้อยแล้ว!');
}

function saveRandomOutfitToToday() {
    if (!isLoggedIn) {
        showPopup('🔒 กรุณาเข้าสู่ระบบก่อนบันทึกลุค', () => { switchPage('login'); });
        return;
    }

    if (currentRandomOutfitItems.length === 0) {
        showPopup('❌ ยังไม่มีลุคที่สุ่มได้ กรุณาสุ่มชุดก่อนบันทึก');
        return;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const dayStr = String(now.getDate()).padStart(2, '0');
    const todayKey = `${currentYear}-${monthStr}-${dayStr}`;

    calendarOutfits[todayKey] = [...currentRandomOutfitItems];
    localStorage.setItem('wardrobe_calendar', JSON.stringify(calendarOutfits));

    showPopup('✨ บันทึกลุคที่สุ่มได้ลงในปฏิทินของวันนี้เรียบร้อยแล้ว!');
}

function openModal() {
    if (!isLoggedIn) {
        showPopup('🔒 กรุณาเข้าสู่ระบบก่อนเพิ่มเสื้อผ้า', () => { switchPage('login'); });
        return;
    }
    document.getElementById('upload-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('upload-modal').classList.add('hidden');
}

function showPopup(msg, cb = null) {
    document.getElementById('popup-message').innerText = msg;
    document.getElementById('custom-popup').classList.remove('hidden');
    popupCallback = cb;
}

function closePopup() {
    document.getElementById('custom-popup').classList.add('hidden');
    if (popupCallback) {
        popupCallback();
        popupCallback = null;
    }
}

function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('reg-user').value.trim();
    const displayName = document.getElementById('reg-display-name').value.trim();
    const password = document.getElementById('reg-pass').value;
    const confirmPassword = document.getElementById('reg-pass-confirm').value;

    if (!username || !displayName || !password) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }

    if (password !== confirmPassword) {
        alert('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
        return;
    }

    let users = JSON.parse(localStorage.getItem('wardrobe_users')) || [];
    if (users.some(u => u.username === username)) {
        alert('ชื่อผู้ใช้นี้ (Username) ถูกใช้งานไปแล้ว');
        return;
    }

    users.push({ username, displayName, password });
    localStorage.setItem('wardrobe_users', JSON.stringify(users));

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
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;

    let users = JSON.parse(localStorage.getItem('wardrobe_users')) || [];
    const foundUser = users.find(u => u.username === username && u.password === password);

    if (!foundUser) {
        alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        return;
    }

    loginSuccess(foundUser.username, foundUser.displayName || foundUser.username);
}

function loginSuccess(username, displayName) {
    isLoggedIn = true;
    localStorage.setItem('wardrobe_current_user', username);

    showPopup(`💜 ยินดีต้อนรับคุณ ${displayName}`, () => {
        updateUserUI(displayName);
        switchPage('home');
    });
}

function updateUserUI(displayName) {
    document.getElementById('user-avatar-icon').className = 'w-7 h-7 bg-[#E89387] text-white rounded-full flex items-center justify-center text-xs font-bold';
    document.getElementById('user-avatar-icon').innerText = displayName.charAt(0).toUpperCase();
    document.getElementById('user-name-label').innerText = displayName;
    initUserDropdownState();
}

function handleLogout() {
    isLoggedIn = false;
    localStorage.removeItem('wardrobe_current_user');

    showPopup('👋 ออกจากระบบเรียบร้อย', () => {
        document.getElementById('user-avatar-icon').className = 'w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs';
        document.getElementById('user-avatar-icon').innerText = '👤';
        document.getElementById('user-name-label').innerText = 'ผู้เยี่ยมชม';
        initUserDropdownState();
        switchPage('home');
    });
}

function addNewItem() {
    const name = document.getElementById('item-name').value.trim();
    const category = document.getElementById('item-category').value;
    const fileInput = document.getElementById('item-image-file');

    if (!name) {
        alert('กรุณากรอกชื่อไอเทม');
        return;
    }

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageBase64 = e.target.result;
            saveItemToCloset(name, category, imageBase64);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        const defaultImage = 'https://images.unsplash.com/photo-1589465257551-f4639982fbc4?w=300';
        saveItemToCloset(name, category, defaultImage);
    }
}

function saveItemToCloset(name, category, image) {
    closetItems.push({
        id: Date.now(),
        name: name,
        category: category,
        image: image
    });

    localStorage.setItem('wardrobe_items', JSON.stringify(closetItems));
    closeModal();
    document.getElementById('item-name').value = '';
    document.getElementById('item-image-file').value = '';
    renderCloset();
    showPopup('🎉 เพิ่มเสื้อผ้าสำเร็จ!');
}

function deleteItem(id) {
    closetItems = closetItems.filter(item => item.id !== id);
    localStorage.setItem('wardrobe_items', JSON.stringify(closetItems));
    renderCloset();
    showPopup('🗑️ ลบไอเทมออกจากตู้แล้ว');
}

function renderCloset() {
    const fullGrid = document.getElementById('full-closet-grid');
    const homePreview = document.getElementById('home-closet-preview');
    
    let htmlContent = '';
    if (closetItems.length === 0) {
        htmlContent = '<p class="text-xs text-gray-400 col-span-full text-center py-6">ยังไม่มีเสื้อผ้าในตู้ กดเพิ่มเสื้อผ้ากันเลย!</p>';
    } else {
        closetItems.forEach(item => {
            htmlContent += `
                <div class="bg-white p-4 rounded-2xl border border-[#EAE6DF] text-center relative group">
                    <button onclick="deleteItem(${item.id})" class="absolute top-2 right-2 bg-red-100 hover:bg-red-200 text-red-500 w-7 h-7 rounded-full text-xs flex items-center justify-center transition" title="ลบไอเทมนี้">✕</button>
                    <div class="h-36 flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden">
                        <img src="${item.image}" class="h-full w-full object-contain">
                    </div>
                    <h4 class="font-bold text-sm mt-2 text-gray-800">${item.name}</h4>
                    <p class="text-xs text-gray-400">${item.category}</p>
                </div>
            `;
        });
    }

    if (fullGrid) fullGrid.innerHTML = htmlContent;
    if (homePreview) homePreview.innerHTML = htmlContent;
}

function randomOutfit() {
    if (closetItems.length === 0) {
        showPopup('❌ ยังไม่มีเสื้อผ้าในตู้ กรุณาเพิ่มเสื้อผ้าก่อนสุ่มลุค');
        return;
    }

    const resultBox = document.getElementById('match-result-box');
    const container = document.getElementById('outfit-display-container');
    const matchText = document.getElementById('match-text');

    resultBox.classList.remove('hidden');
    
    container.innerHTML = `
        <div class="col-span-full py-8 text-center space-y-2">
            <div class="text-3xl animate-bounce">✨ 🧥 👖 👟 ✨</div>
            <p class="text-xs text-[#8C6D53] font-medium animate-pulse">กำลังสลับจับคู่ตู้เสื้อผ้าของคุณ...</p>
        </div>
    `;
    matchText.innerText = '';

    setTimeout(() => {
        const tops = closetItems.filter(i => i.category === 'เสื้อ' || i.category === 'เดรส');
        const bottoms = closetItems.filter(i => i.category === 'กางเกง' || i.category === 'กระโปรง');
        const shoes = closetItems.filter(i => i.category === 'รองเท้า');
        const accessories = closetItems.filter(i => i.category === 'กระเป๋า' || i.category === 'เครื่องประดับ');

        let selectedOutfit = [];
        if (tops.length > 0) selectedOutfit.push(tops[Math.floor(Math.random() * tops.length)]);
        if (bottoms.length > 0) selectedOutfit.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
        if (shoes.length > 0) selectedOutfit.push(shoes[Math.floor(Math.random() * shoes.length)]);
        if (accessories.length > 0) selectedOutfit.push(accessories[Math.floor(Math.random() * accessories.length)]);

        if (selectedOutfit.length === 0) {
            selectedOutfit.push(closetItems[Math.floor(Math.random() * closetItems.length)]);
        }

        currentRandomOutfitItems = selectedOutfit;

        let outfitHtml = '';
        selectedOutfit.forEach(item => {
            outfitHtml += `
                <div class="bg-white p-4 rounded-2xl border border-[#EAE6DF] text-center shadow-sm transition transform hover:scale-105">
                    <div class="h-28 flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden">
                        <img src="${item.image}" class="h-full w-full object-contain">
                    </div>
                    <h4 class="font-bold text-xs mt-2 text-gray-800 truncate">${item.name}</h4>
                    <p class="text-[10px] text-gray-400">${item.category}</p>
                </div>
            `;
        });

        container.innerHTML = outfitHtml;
        matchText.innerText = `💡 เซ็ตนี้เหมาะสำหรับลุคประจำวันของคุณ แมตช์จากไอเทม ${selectedOutfit.length} ชิ้นในตู้!`;
    }, 800);
}