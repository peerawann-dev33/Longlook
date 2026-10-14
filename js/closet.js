let mediaStream = null;
let closetItems = [];
let toastTimer = null;

// UI แจ้งเตือนแบบ Toast สไตล์ LongLook (ช็อกโกแลต & อบอุ่น)
window.showLongLookToast = function(message, type = 'success') {
    const toast = document.getElementById('longlook-toast');
    const msgElem = document.getElementById('longlook-toast-message');
    const iconElem = document.getElementById('longlook-toast-icon');
    if (!toast || !msgElem) {
        alert(message);
        return;
    }

    msgElem.innerText = message;
    if (type === 'success') {
        iconElem.innerHTML = `<i class="fa-solid fa-circle-check text-[#7A9A8B]"></i>`;
    } else if (type === 'error') {
        iconElem.innerHTML = `<i class="fa-solid fa-circle-xmark text-red-400"></i>`;
    } else {
        iconElem.innerHTML = `<i class="fa-solid fa-circle-info text-[#E9B44C]"></i>`;
    }

    // แสดง Toast
    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
    }, 3200);
};

// เปิด Modal ถ่ายรูป/เพิ่มเสื้อผ้า
function openCameraModal() {
    document.getElementById('camera-modal')?.classList.remove('hidden');
}

// ปิด Modal ถ่ายรูป/เพิ่มเสื้อผ้า
function closeCameraModal() {
    document.getElementById('camera-modal')?.classList.add('hidden');
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    window.capturedPhotoData = null;
    
    // รีเซ็ตพรีวิวภาพและกล้อง
    const previewImg = document.getElementById('image-upload-preview');
    const placeholder = document.getElementById('camera-placeholder');
    const videoElem = document.getElementById('webcam-video');
    if (previewImg) { previewImg.src = ''; previewImg.classList.add('hidden'); }
    if (placeholder) placeholder.classList.remove('hidden');
    if (videoElem) videoElem.classList.add('hidden');
}

// ขออนุญาตเปิดใช้งานกล้อง Webcam
async function startCameraPermission() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoElem = document.getElementById('webcam-video');
        if (videoElem) {
            videoElem.srcObject = mediaStream;
            videoElem.classList.remove('hidden');
        }
        document.getElementById('camera-placeholder')?.classList.add('hidden');
    } catch (err) {
        alert("ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้องในเบราว์เซอร์");
    }
}

// ถ่ายรูปจากกล้อง
function takeCameraPhoto() {
    const videoElem = document.getElementById('webcam-video');
    if (!mediaStream) {
        alert("กรุณากดเปิดกล้องก่อนถ่ายรูป");
        return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = videoElem.videoWidth || 300;
    canvas.height = videoElem.videoHeight || 300;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height);
    
    window.capturedPhotoData = canvas.toDataURL('image/png');
    alert("ถ่ายรูปเสื้อผ้าเรียบร้อยแล้ว!");
}

// ฟังก์ชันแปลงไฟล์เป็น Base64
function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// 🤖 ฟังก์ชันส่งรูปภาพไปให้ Gemini AI สแกนวิเคราะห์เสื้อผ้าอัตโนมัติ
async function analyzeClothWithAI(file) {
    const token = localStorage.getItem('longlook_token');
    const formData = new FormData();
    formData.append('image', file);

    const nameInput = document.getElementById('cloth-name-input');
    if (nameInput) nameInput.value = "🤖 Gemini AI กำลังวิเคราะห์เสื้อผ้า...";

    try {
        const response = await fetch(`${window.LONGLOOK_API}/api/ai/analyze-clothing`, {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
        });

        const data = await response.json();
        if (response.ok && data.result) {
            const result = data.result;
            if (nameInput) {
                nameInput.value = `${result.category || 'เสื้อ'} (${result.color || 'ไม่ระบุสี'})`;
            }
            const catSelect = document.getElementById('cloth-category-input');
            const styleSelect = document.getElementById('cloth-style-input');
            if (catSelect && result.category) {
                if (result.category.includes('กางเกง') || result.category.includes('กระโปรง')) catSelect.value = 'กางเกง';
                else if (result.category.includes('เดรส')) catSelect.value = 'เดรส';
                else catSelect.value = 'เสื้อ';
            }
            if (styleSelect && result.style) {
                const matchedStyle = Array.from(styleSelect.options).find(o => o.value.toUpperCase() === result.style.toUpperCase());
                if (matchedStyle) styleSelect.value = matchedStyle.value;
            }
            showAiResultModal(result.category, result.color, result.style);
        } else {
            if (nameInput) nameInput.value = "";
            showLongLookToast(data.message || 'ไม่สามารถวิเคราะห์รูปภาพด้วย AI ได้', 'error');
        }
    } catch (error) {
        console.error('AI Error:', error);
        if (nameInput) nameInput.value = "";
        showLongLookToast('เกิดข้อผิดพลาดในการเชื่อมต่อ AI', 'error');
    }
}

// ฟังก์ชันเปิด/ปิด Modal ผลวิเคราะห์ Gemini AI (สไตล์ LongLook)
window.showAiResultModal = function(category, color, style) {
    const catElem = document.getElementById('ai-result-category');
    const colElem = document.getElementById('ai-result-color');
    const styElem = document.getElementById('ai-result-style');
    if (catElem) catElem.innerText = category || 'เสื้อ';
    if (colElem) colElem.innerText = color || 'ไม่ระบุสี';
    if (styElem) styElem.innerText = style || 'CASUAL';

    document.getElementById('ai-result-modal')?.classList.remove('hidden');
};

window.closeAiResultModal = function() {
    document.getElementById('ai-result-modal')?.classList.add('hidden');
};

// บันทึกเสื้อผ้าลง Database และ LocalStorage
async function saveClothToDatabase() {
    const nameInput = document.getElementById('cloth-name-input');
    const fileInput = document.getElementById('file-upload-input');
    const name = nameInput ? nameInput.value.trim() : '';
    let imageUrl = window.capturedPhotoData || '';
    let uploadedFile = null;

    if (!name) {
        showLongLookToast("กรุณากรอกชื่อเสื้อผ้าก่อนบันทึก", "info");
        return;
    }

    // ตรวจสอบไฟล์อัปโหลด
    if (!imageUrl && fileInput && fileInput.files.length > 0) {
        uploadedFile = fileInput.files[0];

        // File Validation: เช็กประเภทไฟล์และขนาดไม่เกิน 5MB
        if (!uploadedFile.type.match(/^image\/(jpeg|png|jpg)$/)) {
            showLongLookToast("กรุณาอัปโหลดเฉพาะไฟล์รูปภาพ JPEG หรือ PNG เท่านั้น", "error");
            return;
        }
        if (uploadedFile.size > 5 * 1024 * 1024) {
            showLongLookToast("ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB", "error");
            return;
        }

        imageUrl = await convertFileToBase64(uploadedFile);
    }

    const categoryInput = document.getElementById('cloth-category-input');
    const styleInput = document.getElementById('cloth-style-input');
    const category = categoryInput ? categoryInput.value : 'เสื้อ';
    const style = styleInput ? styleInput.value : 'CASUAL';

    const clothData = {
        id: Date.now(),
        name: name,
        category: category,
        style: style,
        image: imageUrl || "https://via.placeholder.com/150"
    };

    const token = localStorage.getItem('longlook_token');
    if (!token) {
        showLongLookToast('🔒 กรุณาเข้าสู่ระบบก่อนบันทึกเสื้อผ้า', 'info');
        if (typeof openLoginModal === 'function') openLoginModal();
        return;
    }

    try {
        const response = await fetch(`${window.LONGLOOK_API}/api/clothes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(clothData)
        });
        const data = await response.json();
        if (!response.ok) {
            showLongLookToast(data.message || 'บันทึกเสื้อผ้าไม่สำเร็จ', 'error');
            return;
        }
        closetItems.unshift(data.cloth || clothData);
    } catch (e) {
        console.error("Backend Save Error:", e);
        closetItems.push(clothData);
    }

    localStorage.setItem('wardrobe_clothes', JSON.stringify(closetItems));

    closeCameraModal();
    renderClosetItems();
    populateSelectOptions();
    if (typeof loadCalendarHistory === 'function') loadCalendarHistory();

    if (nameInput) nameInput.value = '';
    if (fileInput) fileInput.value = '';
    showLongLookToast("👕 บันทึกเสื้อผ้าลงตู้เรียบร้อยแล้ว!", "success");
}

// แสดงรายการเสื้อผ้าในตู้
function renderClosetItems() {
    const closetGrid = document.getElementById('closet-grid');
    if (!closetGrid) return;

    const saved = localStorage.getItem('wardrobe_clothes');
    if (saved) closetItems = JSON.parse(saved);

    if (closetItems.length === 0) {
        closetGrid.innerHTML = `<p class="text-xs text-[#6B5647] col-span-full text-center py-6">ยังไม่มีเสื้อผ้าในตู้ กดปุ่ม "+ เพิ่มเสื้อผ้าใหม่" ได้เลย</p>`;
        return;
    }

    closetGrid.innerHTML = closetItems.map(item => `
        <div class="bg-[#FCE8E8] p-3 rounded-2xl border border-[#D8C2B0] text-center shadow-sm hover-lift flex flex-col items-center relative group">
            <button type="button" onclick="deleteClothItem(event, '${item.id || ''}')" title="ลบเสื้อผ้าชิ้นนี้" 
                    class="absolute top-2 right-2 w-7 h-7 bg-white/90 hover:bg-red-500 hover:text-white text-gray-500 rounded-full border border-[#D8C2B0] flex items-center justify-center text-xs shadow-md transition-all duration-200 z-10 cursor-pointer opacity-90 group-hover:opacity-100 group-hover:scale-105">
                <i class="fa-solid fa-trash-can pointer-events-none"></i>
            </button>
            <div class="w-full h-40 bg-white rounded-xl mb-2 border border-[#D8C2B0] flex items-center justify-center p-2 overflow-hidden transition-transform duration-300 group-hover:scale-[1.03]">
                <img src="${item.image}" class="max-w-full max-h-full object-contain" alt="${item.name}">
            </div>
            <h4 class="font-bold text-xs text-[#3D2B1F] truncate w-full" title="${item.name}">${item.name}</h4>
            <span class="text-[9px] text-[#6B5647] bg-[#EBD9CB] px-2 py-0.5 rounded-md mt-1 font-medium">${item.category || 'เสื้อผ้า'}</span>
        </div>
    `).join('');
}

let itemPendingDeleteId = null;

// ฟังก์ชันเปิด Modal ยืนยันการลบแบบสวยงามเข้ากับธีม LongLook
window.deleteClothItem = function(event, clothId) {
    if (event) {
        if (event.preventDefault) event.preventDefault();
        if (event.stopPropagation) event.stopPropagation();
    }
    
    itemPendingDeleteId = clothId;
    const item = closetItems.find(i => String(i.id) === String(clothId));
    const nameElem = document.getElementById('delete-modal-cloth-name');
    if (nameElem) {
        nameElem.innerText = item ? `คุณแน่ใจหรือไม่ว่าต้องการลบ "${item.name}" ออกจากตู้เสื้อผ้า?` : 'คุณแน่ใจหรือไม่ว่าต้องการลบเสื้อผ้าชิ้นนี้ออกจากตู้เสื้อผ้าของคุณ?';
    }

    document.getElementById('delete-confirm-modal')?.classList.remove('hidden');
};

window.closeDeleteConfirmModal = function() {
    itemPendingDeleteId = null;
    document.getElementById('delete-confirm-modal')?.classList.add('hidden');
};

// ดำเนินการลบจริงเมื่อกดยืนยันใน Custom Modal
window.executeDeleteClothItem = async function() {
    const clothId = itemPendingDeleteId;
    if (!clothId) {
        closeDeleteConfirmModal();
        return;
    }

    const token = localStorage.getItem('longlook_token');
    if (token) {
        try {
            await fetch(`${window.LONGLOOK_API}/api/clothes/${clothId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (e) {
            console.error('Delete backend error:', e);
        }
    }

    // ลบออกจาก memory และ local storage ทันที
    closetItems = closetItems.filter(item => String(item.id) !== String(clothId));
    localStorage.setItem('wardrobe_clothes', JSON.stringify(closetItems));

    // ปิด Modal
    closeDeleteConfirmModal();

    // อัปเดตหน้าจอทันที
    renderClosetItems();
    populateSelectOptions();
    if (typeof loadCalendarHistory === 'function') loadCalendarHistory();
    if (typeof renderFullCalendar === 'function') renderFullCalendar();
};

// ฟังก์ชันช่วยแยกประเภทเสื้อผ้า (ท่อนบน vs ท่อนล่าง)
function isBottomClothing(item) {
    const cat = (item.category || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return cat === 'กางเกง' || cat === 'กระโปรง' || cat.includes('กางเกง') || cat.includes('กระโปรง') || cat.includes('bottom') || cat.includes('pants') ||
           name.includes('เกง') || name.includes('กระโปรง') || name.includes('ยีน') || name.includes('jean') || name.includes('skirt') || name.includes('short');
}

function isTopClothing(item) {
    if (isBottomClothing(item)) return false; // ถ้าเป็นท่อนล่าง ต้องไม่ใช่เสื้อเด็ดขาด
    const cat = (item.category || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return cat === 'เสื้อ' || cat.includes('เสื้อ') || cat.includes('top') || cat.includes('แจ็คเก็ต') || 
           name.includes('เสื้อ') || name.includes('shirt') || name.includes('hoodie') || name.includes('jacket') ||
           (!isBottomClothing(item) && cat !== 'เดรส');
}

// สุ่มแมตช์ชุดใส่บนหุ่นจำลอง
function triggerAutoMatchAndFitting() {
    const saved = localStorage.getItem('wardrobe_clothes');
    if (saved) closetItems = JSON.parse(saved);

    if (closetItems.length === 0) {
        showLongLookToast('ยังไม่มีรายการเสื้อผ้าในตู้ กรุณาอัปโหลดรูปเสื้อผ้าก่อนสุ่มจับคู่นะครับ', 'info');
        return;
    }

    // แอนิเมชันลูกเต๋าหมุนที่ปุ่มสุ่ม
    const diceIcon = document.getElementById('matcher-dice-icon');
    if (diceIcon) {
        diceIcon.classList.remove('animate-dice');
        void diceIcon.offsetWidth;
        diceIcon.classList.add('animate-dice');
    }

    const tops = closetItems.filter(isTopClothing);
    const bottoms = closetItems.filter(isBottomClothing);

    const chosenTop = tops.length > 0 ? tops[Math.floor(Math.random() * tops.length)] : closetItems[0];
    const chosenBottom = bottoms.length > 0 ? bottoms[Math.floor(Math.random() * bottoms.length)] : (closetItems[1] || closetItems[0]);

    window.currentMatchedOutfit = {
        top: chosenTop,
        bottom: chosenBottom
    };

    const topLayer = document.getElementById('avatar-top-layer');
    const bottomLayer = document.getElementById('avatar-bottom-layer');

    if (topLayer && bottomLayer) {
        topLayer.innerHTML = `
            <div class="flex flex-col items-center animate-pop-in">
                <img src="${chosenTop.image}" class="h-28 w-28 object-contain drop-shadow transition-transform hover:scale-105" title="${chosenTop.name}">
                <span class="text-[9px] bg-white/90 text-[#3D2B1F] px-2 py-0.5 rounded-full shadow-sm mt-1 max-w-[120px] truncate font-medium">${chosenTop.name}</span>
            </div>
        `;
        bottomLayer.innerHTML = `
            <div class="flex flex-col items-center animate-pop-in" style="animation-delay: 0.08s;">
                <img src="${chosenBottom.image}" class="h-28 w-28 object-contain drop-shadow transition-transform hover:scale-105" title="${chosenBottom.name}">
                <span class="text-[9px] bg-white/90 text-[#3D2B1F] px-2 py-0.5 rounded-full shadow-sm mt-1 max-w-[120px] truncate font-medium">${chosenBottom.name}</span>
            </div>
        `;
    }
}

// เติมตัวเลือกเสื้อผ้าลงใน Select สำหรับ Builder
function populateSelectOptions() {
    const saved = localStorage.getItem('wardrobe_clothes');
    if (saved) closetItems = JSON.parse(saved);

    const topSelect = document.getElementById('builder-top-select');
    const bottomSelect = document.getElementById('builder-bottom-select');

    if (topSelect && bottomSelect) {
        const tops = closetItems.filter(isTopClothing);
        const bottoms = closetItems.filter(isBottomClothing);

        topSelect.innerHTML = `<option value="">-- เลือกเสื้อท่อนบน --</option>` +
            tops.map(item => `<option value="${item.image}">${item.name}</option>`).join('');

        bottomSelect.innerHTML = `<option value="">-- เลือกกางเกง/กระโปรงท่อนล่าง --</option>` +
            bottoms.map(item => `<option value="${item.image}">${item.name}</option>`).join('');
    }
}

// พรีวิวเสื้อผ้าบนหุ่นจำลองหน้า Builder พร้อมแอนิเมชัน Pop-in
function previewClothesOnModel() {
    const topVal = document.getElementById('builder-top-select')?.value;
    const bottomVal = document.getElementById('builder-bottom-select')?.value;

    const modelTop = document.getElementById('builder-model-top');
    const modelBottom = document.getElementById('builder-model-bottom');

    if (modelTop && topVal) {
        modelTop.innerHTML = `<img src="${topVal}" class="h-20 w-20 object-contain rounded-lg animate-pop-in">`;
    }
    if (modelBottom && bottomVal) {
        modelBottom.innerHTML = `<img src="${bottomVal}" class="h-20 w-20 object-contain rounded-lg animate-pop-in" style="animation-delay: 0.05s;">`;
    }
}

async function loadClothesFromDatabase() {
    const token = localStorage.getItem('longlook_token');
    if (!token) return;

    try {
        const response = await fetch(`${window.LONGLOOK_API}/api/clothes`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) return;
        const rows = await response.json();
        if (Array.isArray(rows)) {
            closetItems = rows;
            localStorage.setItem('wardrobe_clothes', JSON.stringify(closetItems));
            renderClosetItems();
            populateSelectOptions();
        }
    } catch (err) {
        console.error('Load clothes error:', err);
    }
}

async function loadCalendarHistory() {
    const token = localStorage.getItem('longlook_token');
    const container = document.getElementById('calendar-history-container');
    const statClothes = document.getElementById('stat-total-clothes');
    const statOutfits = document.getElementById('stat-total-outfits');
    if (statClothes) statClothes.innerText = String(closetItems.length);

    if (!token || !container) return;

    try {
        const response = await fetch(`${window.LONGLOOK_API}/api/calendar`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) return;
        const rows = await response.json();
        if (statOutfits) statOutfits.innerText = String(rows.length);

        if (!rows.length) {
            container.innerHTML = `<p class="text-xs text-[#6B5647] col-span-full py-6 text-center">ยังไม่มีประวัติการบันทึกชุด</p>`;
            return;
        }

        container.innerHTML = rows.map((log) => `
            <div class="bg-[#FCE8E8] p-4 rounded-2xl border border-[#D8C2B0] shadow-sm flex items-center gap-4 hover:scale-[1.02] transition">
                <div class="w-16 h-16 bg-white rounded-xl border border-[#D8C2B0] flex items-center justify-center p-1 overflow-hidden shrink-0">
                    ${log.image ? `<img src="${log.image}" class="max-w-full max-h-full object-contain">` : `<i class="fa-solid fa-shirt text-gray-400 text-xl"></i>`}
                </div>
                <div class="flex-grow">
                    <span class="text-[10px] font-semibold bg-[#EBD9CB] text-[#3D2B1F] px-2 py-0.5 rounded-md">${log.log_date || ''}</span>
                    <h4 class="font-bold text-sm text-[#3D2B1F] mt-1.5">${log.title || 'ลุควันนี้'}</h4>
                    <p class="text-[10px] text-[#6B5647] mt-0.5"><i class="fa-solid fa-tag text-[#D88AAB] mr-1"></i>สไตล์: ${log.style || 'Casual'}</p>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Load calendar error:', err);
    }
}

async function saveTodayOutfitToCalendar() {
    const token = localStorage.getItem('longlook_token');
    if (!token) {
        alert('กรุณาเข้าสู่ระบบก่อนบันทึกลุค');
        if (typeof openLoginModal === 'function') openLoginModal();
        return;
    }

    const today = typeof window.getLocalTodayString === 'function' ? window.getLocalTodayString() : new Date().toLocaleDateString('en-CA');
    const title = document.getElementById('home-outfit-title')?.innerText || 'ลุคสบายๆ วันชิลล์';
    const style = document.getElementById('home-outfit-style')?.innerText || 'Casual';
    const first = closetItems[0];
    const outfitImg = (window.currentAiLook && window.currentAiLook.image) || (first?.image || '');

    try {
        // เคลียร์ข้อมูลเก่าของวันนี้ในฐานข้อมูลก่อน เพื่อให้ลุคของวันนี้เป็นลุคเดี่ยวที่อัปเดตล่าสุด
        await fetch(`${window.LONGLOOK_API}/api/calendar/date/${today}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });

        const response = await fetch(`${window.LONGLOOK_API}/api/calendar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                title: title,
                style: style,
                image: outfitImg,
                log_date: today,
                occasion: 'ชุดแนะนำประจำวัน'
            })
        });
        const data = await response.json();
        if (!response.ok) {
            alert(data.message || 'บันทึกปฏิทินไม่สำเร็จ');
            return;
        }
        await loadCalendarHistory();
        showLongLookToast('📌 บันทึกลุควันนี้ลงปฏิทินเรียบร้อยแล้ว!', 'success');
    } catch (err) {
        console.error(err);
        showLongLookToast('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ', 'error');
    }
}

// บันทึกชุดที่สุ่มได้จากหน้า Matcher ลงปฏิทิน
async function saveCurrentMatchToCalendar() {
    const token = localStorage.getItem('longlook_token');
    if (!token) {
        showLongLookToast('🔒 กรุณาเข้าสู่ระบบก่อนบันทึกลุค', 'info');
        if (typeof openLoginModal === 'function') openLoginModal();
        return;
    }

    const topImg = document.querySelector('#avatar-top-layer img');
    const bottomImg = document.querySelector('#avatar-bottom-layer img');
    if (!topImg && !bottomImg) {
        showLongLookToast('กรุณากดสุ่มชุดก่อนบันทึกนะครับ', 'info');
        return;
    }

    const today = typeof window.getLocalTodayString === 'function' ? window.getLocalTodayString() : new Date().toLocaleDateString('en-CA');
    const items = [];
    if (window.currentMatchedOutfit?.top) items.push(window.currentMatchedOutfit.top);
    if (window.currentMatchedOutfit?.bottom) items.push(window.currentMatchedOutfit.bottom);

    const topTitle = window.currentMatchedOutfit?.top?.name || 'เสื้อ';
    const bottomTitle = window.currentMatchedOutfit?.bottom?.name || 'กางเกง';
    const outfitTitle = `${topTitle} + ${bottomTitle}`;

    try {
        const response = await fetch(`${window.LONGLOOK_API}/api/calendar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                title: outfitTitle,
                style: 'สุ่มแมตช์ชุด',
                image: topImg?.src || bottomImg?.src || '',
                log_date: today,
                items: items
            })
        });
        const data = await response.json();
        if (response.ok) {
            // ซิงค์ลง calendarOutfits ในหน้าปฏิทินด้วย
            if (typeof calendarOutfits !== 'undefined' && items.length > 0) {
                if (!calendarOutfits[today]) calendarOutfits[today] = [];
                items.forEach(it => {
                    if (!calendarOutfits[today].some(existing => String(existing.id) === String(it.id))) {
                        calendarOutfits[today].push(it);
                    }
                });
                localStorage.setItem('wardrobe_calendar', JSON.stringify(calendarOutfits));
                if (typeof renderFullCalendar === 'function') renderFullCalendar();
            }

            await loadCalendarHistory();
            showLongLookToast('🎉 บันทึก Outfit ลงปฏิทินและ Database เรียบร้อยแล้ว!', 'success');
        } else {
            showLongLookToast(data.message || 'บันทึกไม่สำเร็จ', 'error');
        }
    } catch (e) {
        console.error(e);
        showLongLookToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

// บันทึกชุดจากหน้า Builder (สร้างลุคและจับคู่ใส่บนหุ่น) ลงปฏิทิน
async function saveBuilderOutfitToCalendar() {
    const token = localStorage.getItem('longlook_token');
    if (!token) {
        showLongLookToast('🔒 กรุณาเข้าสู่ระบบก่อนบันทึกลุค', 'info');
        if (typeof openLoginModal === 'function') openLoginModal();
        return;
    }

    const topSelect = document.getElementById('builder-top-select');
    const bottomSelect = document.getElementById('builder-bottom-select');
    const topText = topSelect?.options[topSelect.selectedIndex]?.text || '';
    const bottomText = bottomSelect?.options[bottomSelect.selectedIndex]?.text || '';

    if (!topSelect?.value && !bottomSelect?.value) {
        showLongLookToast('กรุณาเลือกเสื้อหรือกางเกงก่อนบันทึกครับ', 'info');
        return;
    }

    const today = typeof window.getLocalTodayString === 'function' ? window.getLocalTodayString() : new Date().toLocaleDateString('en-CA');
    const title = [topText, bottomText].filter(t => t && !t.includes('--')).join(' + ') || 'ลุคที่สร้างเอง';

    const items = [];
    if (topSelect?.value) {
        const topItem = closetItems.find(i => i.image === topSelect.value) || { name: topText, image: topSelect.value };
        items.push(topItem);
    }
    if (bottomSelect?.value) {
        const bottomItem = closetItems.find(i => i.image === bottomSelect.value) || { name: bottomText, image: bottomSelect.value };
        items.push(bottomItem);
    }

    try {
        const response = await fetch(`${window.LONGLOOK_API}/api/calendar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                title: title,
                style: 'Custom Builder',
                image: topSelect?.value || bottomSelect?.value || '',
                log_date: today,
                items: items
            })
        });
        const data = await response.json();
        if (response.ok) {
            // ซิงค์ลง calendarOutfits ในหน้าปฏิทินด้วย
            if (typeof calendarOutfits !== 'undefined' && items.length > 0) {
                if (!calendarOutfits[today]) calendarOutfits[today] = [];
                items.forEach(it => {
                    if (!calendarOutfits[today].some(existing => String(existing.id) === String(it.id))) {
                        calendarOutfits[today].push(it);
                    }
                });
                localStorage.setItem('wardrobe_calendar', JSON.stringify(calendarOutfits));
                if (typeof renderFullCalendar === 'function') renderFullCalendar();
            }

            await loadCalendarHistory();
            showLongLookToast('💾 บันทึกลุคนี้เข้าสู่ปฏิทินเรียบร้อยแล้ว!', 'success');
        } else {
            showLongLookToast(data.message || 'บันทึกไม่สำเร็จ', 'error');
        }
    } catch (e) {
        console.error(e);
        showLongLookToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

// Event Listener เมื่อเลือกไฟล์รูปภาพ ให้อ่านไฟล์และสแกนด้วย AI อัตโนมัติ
document.addEventListener('DOMContentLoaded', () => {
    renderClosetItems();
    populateSelectOptions();
    loadClothesFromDatabase();
    loadCalendarHistory();

    const fileInput = document.getElementById('file-upload-input');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const previewImg = document.getElementById('image-upload-preview');
                const placeholder = document.getElementById('camera-placeholder');
                const videoElem = document.getElementById('webcam-video');

                if (previewImg) {
                    previewImg.src = URL.createObjectURL(file);
                    previewImg.classList.remove('hidden');
                    if (placeholder) placeholder.classList.add('hidden');
                    if (videoElem) videoElem.classList.add('hidden');
                }

                analyzeClothWithAI(file);
            }
        });
    }
});