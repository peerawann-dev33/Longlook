function initRealCalendar() {
    const now = new Date();

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    const monthNames = [
        'มกราคม',
        'กุมภาพันธ์',
        'มีนาคม',
        'เมษายน',
        'พฤษภาคม',
        'มิถุนายน',
        'กรกฎาคม',
        'สิงหาคม',
        'กันยายน',
        'ตุลาคม',
        'พฤศจิกายน',
        'ธันวาคม'
    ];

    document.getElementById('calendar-month-year').innerText =
        `ปฏิทิน ${monthNames[currentMonth]}`;

    document.getElementById('current-date-badge').innerText =
        `${currentDate} ${monthNames[currentMonth]} ${currentYear + 543}`;

    const calendarGrid =
        document.getElementById('real-calendar-grid');

    let calendarHtml = '';

    let startOfWeek = new Date(now);

    startOfWeek.setDate(
        currentDate - now.getDay()
    );

    for (let i = 0; i < 7; i++) {

        let loopDate = new Date(startOfWeek);

        loopDate.setDate(
            startOfWeek.getDate() + i
        );

        let dateNum = loopDate.getDate();

        if (dateNum === currentDate) {
            calendarHtml += `
                <span class="bg-[#E89387] text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto font-bold shadow-sm">
                    ${dateNum}
                </span>
            `;
        } else {
            calendarHtml += `
                <span class="text-gray-600 flex items-center justify-center h-6">
                    ${dateNum}
                </span>
            `;
        }
    }

    calendarGrid.innerHTML = calendarHtml;
}

function renderFullCalendar() {
    const now = new Date();

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    const monthNames = [
        'มกราคม',
        'กุมภาพันธ์',
        'มีนาคม',
        'เมษายน',
        'พฤษภาคม',
        'มิถุนายน',
        'กรกฎาคม',
        'สิงหาคม',
        'กันยายน',
        'ตุลาคม',
        'พฤศจิกายน',
        'ธันวาคม'
    ];

    document.getElementById('full-calendar-title').innerText =
        `${monthNames[currentMonth]} ${currentYear + 543}`;

    const calendarGrid =
        document.getElementById('full-calendar-grid');

    let calendarHtml = '';

    const firstDayIndex =
        new Date(
            currentYear,
            currentMonth,
            1
        ).getDay();

    const totalDays =
        new Date(
            currentYear,
            currentMonth + 1,
            0
        ).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
        calendarHtml += `<div></div>`;
    }

    for (let day = 1; day <= totalDays; day++) {

        let monthStr =
            String(currentMonth + 1).padStart(2, '0');

        let dayStr =
            String(day).padStart(2, '0');

        let dateKey =
            `${currentYear}-${monthStr}-${dayStr}`;

        let hasOutfit =
            calendarOutfits[dateKey] &&
            calendarOutfits[dateKey].length > 0;

        let isToday =
            day === currentDate;

        let bgClass =
            "bg-[#FAF7F2] hover:bg-gray-100 text-gray-700 border border-[#EFECE6]";

        let badgeText =
            hasOutfit ? '✨ มีชุดแล้ว' : 'ว่าง';

        if (isToday) {
            bgClass =
                "bg-[#F3ECE4] border-2 border-[#E89387] text-gray-800 font-bold";
        }

        calendarHtml += `
            <div
                onclick="openDayModal('${dateKey}', ${day})"
                class="${bgClass} rounded-2xl h-20 flex flex-col items-center justify-center transition cursor-pointer p-1 relative"
            >
                <span class="text-sm font-semibold">
                    ${day}
                </span>

                <span class="text-[9px] text-[#8C6D53] mt-1 truncate w-full px-1">
                    ${hasOutfit
                        ? '🧥 ' + calendarOutfits[dateKey].length + ' ชิ้น'
                        : badgeText}
                </span>
            </div>
        `;
    }

    calendarGrid.innerHTML = calendarHtml;
}

function openDayModal(dateKey, dayNum) {

    if (!isLoggedIn) {
        showPopup(
            '🔒 กรุณาเข้าสู่ระบบก่อนจัดการปฏิทินชุด',
            () => {
                switchPage('login');
            }
        );
        return;
    }

    selectedDateKey = dateKey;

    document.getElementById('modal-day-title').innerText =
        `จัดการชุดวันที่ ${dayNum} สิงหาคม 2569`;

    renderDayModalContent();

    document.getElementById('day-modal')
        .classList.remove('hidden');
}

function closeDayModal() {
    document.getElementById('day-modal')
        .classList.add('hidden');

    renderFullCalendar();
}

function renderDayModalContent() {

    const outfitListContainer =
        document.getElementById('modal-outfit-list');

    const closetSelector =
        document.getElementById('modal-closet-selector');

    let currentDayItems =
        calendarOutfits[selectedDateKey] || [];

    if (currentDayItems.length === 0) {

        outfitListContainer.innerHTML = `
            <p class="text-xs text-gray-400 italic">
                ยังไม่มีการบันทึกชุดสำหรับวันนี้
                เลือกไอเทมด้านล่างเพื่อเพิ่มได้เลย
            </p>
        `;

    } else {

        let html = '';

        currentDayItems.forEach((item, index) => {

            html += `
                <div class="bg-white px-3 py-1.5 rounded-xl border border-[#EAE6DF] flex items-center gap-2 text-xs shadow-sm">

                    <img
                        src="${item.image}"
                        class="w-6 h-6 object-contain rounded-md"
                    >

                    <span class="font-medium text-gray-800">
                        ${item.name}
                    </span>

                    <button
                        onclick="removeItemFromDate(${index})"
                        class="text-red-400 hover:text-red-600 font-bold ml-1"
                    >
                        ✕
                    </button>

                </div>
            `;
        });

        outfitListContainer.innerHTML = html;
    }

    let closetHtml = '';

    if (closetItems.length === 0) {

        closetHtml = `
            <p class="text-xs text-gray-400 col-span-full">
                ตู้เสื้อผ้าว่างเปล่า
            </p>
        `;

    } else {

        closetItems.forEach(item => {

            closetHtml += `
                <div
                    onclick="addItemToDate(${item.id})"
                    class="bg-white hover:bg-[#FAF7F2] p-2 rounded-xl border border-[#EAE6DF] text-center cursor-pointer transition"
                >

                    <div class="w-12 h-12 mx-auto mb-1 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">

                        <img
                            src="${item.image}"
                            class="w-full h-full object-contain"
                        >

                    </div>

                    <div class="text-[10px] font-medium text-gray-700 truncate">
                        ${item.name}
                    </div>

                </div>
            `;
        });
    }

    closetSelector.innerHTML = closetHtml;
}

function addItemToDate(itemId) {

    const item =
        closetItems.find(i => i.id === itemId);

    if (!item) return;

    if (!calendarOutfits[selectedDateKey]) {
        calendarOutfits[selectedDateKey] = [];
    }

    if (
        !calendarOutfits[selectedDateKey]
            .some(i => i.id === itemId)
    ) {

        calendarOutfits[selectedDateKey].push(item);

        localStorage.setItem(
            'wardrobe_calendar',
            JSON.stringify(calendarOutfits)
        );

        renderDayModalContent();
    }
}

function removeItemFromDate(index) {

    calendarOutfits[selectedDateKey]
        .splice(index, 1);

    if (
        calendarOutfits[selectedDateKey].length === 0
    ) {
        delete calendarOutfits[selectedDateKey];
    }

    localStorage.setItem(
        'wardrobe_calendar',
        JSON.stringify(calendarOutfits)
    );

    renderDayModalContent();
}

function saveTodayOutfit() {

    if (!isLoggedIn) {
        showPopup(
            '🔒 กรุณาเข้าสู่ระบบก่อนบันทึกลุค',
            () => {
                switchPage('login');
            }
        );
        return;
    }

    const now = new Date();

    const currentYear =
        now.getFullYear();

    const monthStr =
        String(now.getMonth() + 1).padStart(2, '0');

    const dayStr =
        String(now.getDate()).padStart(2, '0');

    const todayKey =
        `${currentYear}-${monthStr}-${dayStr}`;

    calendarOutfits[todayKey] =
        [...closetItems.slice(0, 2)];

    localStorage.setItem(
        'wardrobe_calendar',
        JSON.stringify(calendarOutfits)
    );

    showPopup(
        '✨ บันทึกลุคประจำวันลงในปฏิทินเรียบร้อยแล้ว!'
    );
}

function saveRandomOutfitToToday() {

    if (!isLoggedIn) {
        showPopup(
            '🔒 กรุณาเข้าสู่ระบบก่อนบันทึกลุค',
            () => {
                switchPage('login');
            }
        );
        return;
    }

    if (currentRandomOutfitItems.length === 0) {
        showPopup(
            '❌ ยังไม่มีลุคที่สุ่มได้ กรุณาสุ่มชุดก่อนบันทึก'
        );
        return;
    }

    const now = new Date();

    const currentYear =
        now.getFullYear();

    const monthStr =
        String(now.getMonth() + 1).padStart(2, '0');

    const dayStr =
        String(now.getDate()).padStart(2, '0');

    const todayKey =
        `${currentYear}-${monthStr}-${dayStr}`;

    calendarOutfits[todayKey] =
        [...currentRandomOutfitItems];

    localStorage.setItem(
        'wardrobe_calendar',
        JSON.stringify(calendarOutfits)
    );

    showPopup(
        '✨ บันทึกลุคที่สุ่มได้ลงในปฏิทินของวันนี้เรียบร้อยแล้ว!'
    );
}