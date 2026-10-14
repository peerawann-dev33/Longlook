// ==========================================
// LongLook Calendar System (Full Monthly View & Day Modal)
// Theme: LongLook Warm Cream & Dark Chocolate
// ==========================================

let calendarViewDate = new Date();
let selectedDateKey = null;
let calendarOutfits = {};

const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

function changeCalendarMonth(offset) {
    if (offset === 0) {
        calendarViewDate = new Date();
    } else {
        calendarViewDate.setMonth(calendarViewDate.getMonth() + offset);
    }
    renderFullCalendar();
}

// เรนเดอร์ปฏิทินแบบเต็มเดือน
function renderFullCalendar() {
    const titleElem = document.getElementById('full-calendar-title');
    const gridElem = document.getElementById('full-calendar-grid');
    if (!gridElem) return;

    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const today = new Date();

    if (titleElem) {
        titleElem.innerText = `${THAI_MONTHS[month]} ${year + 543}`;
    }

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    let html = '';

    // ช่องว่างก่อนวันแรกของเดือน
    for (let i = 0; i < firstDayIndex; i++) {
        html += `<div class="p-1"></div>`;
    }

    for (let day = 1; day <= totalDays; day++) {
        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateKey = `${year}-${monthStr}-${dayStr}`;

        const isToday = (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day);
        const dayItems = calendarOutfits[dateKey] || [];
        const hasItems = dayItems.length > 0;

        let borderClass = isToday ? 'border-2 border-[#3D2B1F] shadow-md ring-2 ring-[#3D2B1F]/20 pulse-today' : 'border border-[#D8C2B0]';
        let bgClass = isToday ? 'bg-white font-bold' : (hasItems ? 'bg-[#FAF1EC]' : 'bg-[#FCE8E8] hover:bg-white');

        html += `
            <div onclick="openDayModal('${dateKey}', ${day}, ${month}, ${year})"
                 class="${bgClass} ${borderClass} rounded-2xl min-h-[75px] sm:min-h-[85px] p-1.5 flex flex-col justify-between items-center cursor-pointer hover-lift shadow-sm text-[#3D2B1F]">
                <div class="flex justify-between items-center w-full px-1">
                    <span class="text-xs ${isToday ? 'bg-[#3D2B1F] text-white rounded-full w-5 h-5 flex items-center justify-center font-bold text-[10px]' : 'font-semibold'}">
                        ${day}
                    </span>
                    ${hasItems ? `<span class="w-2 h-2 rounded-full bg-[#E89387]"></span>` : ''}
                </div>
                
                <div class="w-full flex flex-col items-center justify-center my-0.5">
                    ${hasItems && dayItems[0]?.image ? `
                        <img src="${dayItems[0].image}" class="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-lg drop-shadow-sm">
                    ` : ''}
                </div>

                <div class="w-full text-center">
                    <span class="text-[9px] truncate block w-full px-1 ${hasItems ? 'text-[#3D2B1F] font-bold' : 'text-[#6B5647]/60'}">
                        ${hasItems ? `${dayItems.length} ไอเทม` : 'ว่าง'}
                    </span>
                </div>
            </div>
        `;
    }

    gridElem.innerHTML = html;
}

// เปิดหน้าต่าง Modal จัดการชุดประจำวัน
function openDayModal(dateKey, day, month, year) {
    selectedDateKey = dateKey;

    const modalTitle = document.getElementById('modal-day-title');
    if (modalTitle) {
        modalTitle.innerHTML = `<i class="fa-solid fa-calendar-day text-[#89C2D9] mr-1"></i> จัดการชุดวันที่ ${day} ${THAI_MONTHS[month]} ${year + 543}`;
    }

    renderDayModalContent();
    document.getElementById('day-modal')?.classList.remove('hidden');
}

function closeDayModal() {
    document.getElementById('day-modal')?.classList.add('hidden');
    renderFullCalendar();
}

// แสดงรายการชุดที่เลือก และเสื้อผ้าทั้งหมดในตู้
function renderDayModalContent() {
    const outfitListContainer = document.getElementById('modal-outfit-list');
    const closetSelector = document.getElementById('modal-closet-selector');
    if (!outfitListContainer || !closetSelector) return;

    const currentDayItems = calendarOutfits[selectedDateKey] || [];

    if (currentDayItems.length === 0) {
        outfitListContainer.innerHTML = `
            <p class="text-xs text-[#6B5647] italic w-full text-center py-3">
                ยังไม่มีการเลือกชุดสำหรับวันนี้ — คลิกเลือกไอเทมจากตู้ด้านล่างเพื่อเพิ่มได้เลย ✨
            </p>
        `;
    } else {
        outfitListContainer.innerHTML = currentDayItems.map((item, index) => `
            <div class="bg-[#FCE8E8] px-3 py-1.5 rounded-xl border border-[#D8C2B0] flex items-center gap-2 text-xs shadow-sm">
                <img src="${item.image}" class="w-7 h-7 object-contain rounded-lg bg-white p-0.5 border border-[#D8C2B0]">
                <span class="font-bold text-[#3D2B1F] truncate max-w-[120px]">${item.name}</span>
                <button onclick="removeItemFromDayDate(${index})" class="text-red-500 hover:text-red-700 font-bold ml-1 text-sm">✕</button>
            </div>
        `).join('');
    }

    const saved = localStorage.getItem('wardrobe_clothes');
    let items = closetItems;
    if (saved) {
        try { items = JSON.parse(saved); } catch (e) {}
    }

    if (!items || items.length === 0) {
        closetSelector.innerHTML = `<p class="text-xs text-[#6B5647] col-span-full py-4 text-center">ยังไม่มีเสื้อผ้าในตู้</p>`;
    } else {
        closetSelector.innerHTML = items.map(item => `
            <div onclick="addItemToDayDate(${item.id})"
                 class="bg-[#FCE8E8] hover:bg-white p-2 rounded-xl border border-[#D8C2B0] text-center cursor-pointer transition transform hover:scale-105 shadow-sm">
                <div class="w-12 h-12 mx-auto mb-1 flex items-center justify-center bg-white rounded-lg p-1 border border-[#D8C2B0] overflow-hidden">
                    <img src="${item.image}" class="max-w-full max-h-full object-contain">
                </div>
                <div class="text-[10px] font-bold text-[#3D2B1F] truncate">${item.name}</div>
            </div>
        `).join('');
    }
}

// เพิ่มไอเทมลงในวันที่กำลังเปิด
function addItemToDayDate(itemId) {
    const saved = localStorage.getItem('wardrobe_clothes');
    let items = closetItems;
    if (saved) {
        try { items = JSON.parse(saved); } catch (e) {}
    }

    const item = items.find(i => String(i.id) === String(itemId));
    if (!item || !selectedDateKey) return;

    if (!calendarOutfits[selectedDateKey]) {
        calendarOutfits[selectedDateKey] = [];
    }

    if (!calendarOutfits[selectedDateKey].some(i => String(i.id) === String(itemId))) {
        calendarOutfits[selectedDateKey].push(item);
        localStorage.setItem('wardrobe_calendar', JSON.stringify(calendarOutfits));
        renderDayModalContent();
    }
}

// ลบไอเทมออกจากวันที่กำลังเปิด
function removeItemFromDayDate(index) {
    if (!selectedDateKey || !calendarOutfits[selectedDateKey]) return;
    calendarOutfits[selectedDateKey].splice(index, 1);
    if (calendarOutfits[selectedDateKey].length === 0) {
        delete calendarOutfits[selectedDateKey];
    }
    localStorage.setItem('wardrobe_calendar', JSON.stringify(calendarOutfits));
    renderDayModalContent();
    renderFullCalendar();
}

// ล้างไอเทมทั้งหมดของวันที่กำลังเปิด
async function clearAllItemsFromDayDate() {
    if (!selectedDateKey) return;
    delete calendarOutfits[selectedDateKey];
    localStorage.setItem('wardrobe_calendar', JSON.stringify(calendarOutfits));
    renderDayModalContent();
    renderFullCalendar();

    const token = localStorage.getItem('longlook_token');
    if (token) {
        try {
            await fetch(`${window.LONGLOOK_API}/api/calendar/date/${selectedDateKey}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (typeof showLongLookToast === 'function') {
                showLongLookToast('🗑️ ล้างข้อมูลชุดของวันนี้เรียบร้อยแล้ว', 'info');
            }
        } catch (e) {
            console.error('Delete calendar date error:', e);
        }
    }
}
window.clearAllItemsFromDayDate = clearAllItemsFromDayDate;

// บันทึกและซิงค์ลง SQLite + Firebase เมื่อกดปุ่มใน Modal
async function saveDayModalOutfits() {
    const token = localStorage.getItem('longlook_token');
    const dayItems = calendarOutfits[selectedDateKey] || [];

    if (token) {
        try {
            // เคลียร์ข้อมูลเก่าของวันนี้ในฐานข้อมูลก่อน เพื่อไม่ให้สะสมทับซ้อนกันมั่ว
            await fetch(`${window.LONGLOOK_API}/api/calendar/date/${selectedDateKey}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (dayItems.length > 0) {
                const title = dayItems.map(i => i.name).join(' + ');
                const firstImg = dayItems[0]?.image || '';
                await fetch(`${window.LONGLOOK_API}/api/calendar`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: title,
                        style: dayItems[0]?.style || 'CASUAL',
                        image: firstImg,
                        log_date: selectedDateKey,
                        items: dayItems
                    })
                });
            }
            if (typeof showLongLookToast === 'function') {
                showLongLookToast('📅 บันทึกชุดปฏิทินเรียบร้อยแล้ว!', 'success');
            }
        } catch (e) {
            console.error('Sync calendar error:', e);
        }
    }

    localStorage.setItem('wardrobe_calendar', JSON.stringify(calendarOutfits));
    closeDayModal();
    renderFullCalendar();
}

// ฟังก์ชันดึงวันที่ปัจจุบันตามเวลาท้องถิ่น (Local Time YYYY-MM-DD)
function getLocalTodayString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
window.getLocalTodayString = getLocalTodayString;

// โหลดข้อมูลปฏิทินเริ่มต้น (ทั้งจาก LocalStorage และดึงซิงค์จาก Database)
async function initCalendar() {
    const saved = localStorage.getItem('wardrobe_calendar');
    if (saved) {
        try { calendarOutfits = JSON.parse(saved); } catch (e) {}
    }
    renderFullCalendar();

    // ดึงข้อมูลจากเซิร์ฟเวอร์มาแมปเข้าสู่ calendarOutfits
    const token = localStorage.getItem('longlook_token');
    if (token) {
        try {
            const res = await fetch(`${window.LONGLOOK_API}/api/calendar`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const logs = await res.json();
                if (Array.isArray(logs) && logs.length > 0) {
                    const newCalendarOutfits = {};
                    logs.forEach(log => {
                        if (log.log_date) {
                            if (!newCalendarOutfits[log.log_date]) {
                                newCalendarOutfits[log.log_date] = [];
                            }
                            if (Array.isArray(log.items) && log.items.length > 0) {
                                log.items.forEach(it => {
                                    if (!newCalendarOutfits[log.log_date].some(existing => existing.name === it.name || (it.image && existing.image === it.image))) {
                                        newCalendarOutfits[log.log_date].push({
                                            id: it.id,
                                            name: it.name,
                                            image: it.image || log.image || '',
                                            style: log.style || 'CASUAL'
                                        });
                                    }
                                });
                            } else if (log.image) {
                                if (!newCalendarOutfits[log.log_date].some(existing => existing.image === log.image)) {
                                    newCalendarOutfits[log.log_date].push({
                                        id: log.id,
                                        name: log.title || 'ลุคบันทึกไว้',
                                        image: log.image,
                                        style: log.style || 'CASUAL'
                                    });
                                }
                            }
                        }
                    });
                    calendarOutfits = newCalendarOutfits;
                    localStorage.setItem('wardrobe_calendar', JSON.stringify(calendarOutfits));
                    renderFullCalendar();
                }
            }
        } catch (e) {
            console.error('Fetch calendar logs error:', e);
        }
    }
}

// อัปเดตป้ายวันที่ในหน้าหลักให้ตรงกับวันปัจจุบันเสมอ
function updateHomeDateBadge() {
    const badge = document.getElementById('current-date-badge');
    if (badge) {
        const now = new Date();
        const d = now.getDate();
        const m = THAI_MONTHS[now.getMonth()];
        const y = now.getFullYear() + 543;
        badge.innerText = `${d} ${m} ${y}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initCalendar();
    updateHomeDateBadge();
});