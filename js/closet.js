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
    if (typeof resetBatchUpload === 'function') resetBatchUpload();
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

// ฟังก์ชันดึงสีเด่นจริง (Real Dominant Color) จากพิกเซลของรูปภาพผ่าน HTML5 Canvas
function extractDominantColorFromImage(file) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 64;
            canvas.height = 64;
            ctx.drawImage(img, 0, 0, 64, 64);
            
            try {
                const imgData = ctx.getImageData(8, 8, 48, 48).data;
                let rTotal = 0, gTotal = 0, bTotal = 0, count = 0;
                
                for (let i = 0; i < imgData.length; i += 4) {
                    const r = imgData[i];
                    const g = imgData[i+1];
                    const b = imgData[i+2];
                    const a = imgData[i+3];
                    if (a < 128) continue; // ข้ามโปร่งใส
                    if (r > 245 && g > 245 && b > 245) continue; // ข้ามพื้นหลังขาว
                    
                    rTotal += r;
                    gTotal += g;
                    bTotal += b;
                    count++;
                }
                
                if (count === 0) return resolve('สีขาว / สีงาช้าง');
                
                const r = Math.round(rTotal / count);
                const g = Math.round(gTotal / count);
                const b = Math.round(bTotal / count);
                
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const diff = max - min;
                
                if (max < 45) return resolve('สีดำคลาสสิก');
                if (min > 215 && diff < 20) return resolve('สีขาว / สีงาช้าง');
                if (diff < 22) return resolve('สีเทาเรียบหรู');
                
                if (r > 160 && g > 140 && b < 120) return resolve('สีเบจ / เอิร์ธโทน');
                if (r > 110 && g < 85 && b < 75) return resolve('สีน้ำตาลเข้ม');
                if (b > r + 25 && b > g) return resolve('สียีนส์ / น้ำเงิน');
                if (r > g + 35 && r > b + 35) return resolve('สีแดง / คอรัล');
                if (g > r + 15 && g > b + 15) return resolve('สีเขียว / โอลีฟ');
                if (r > 175 && g > 155 && b < 110) return resolve('สีเหลืองมัสตาร์ด');
                if (r > 170 && b > 140 && g < 155) return resolve('สีชมพู / ม่วงพาสเทล');
                
                resolve('สีทูโทนมีสไตล์');
            } catch (e) {
                resolve('สีคลาสสิก');
            }
        };
        img.onerror = () => resolve('สีคลาสสิก');
        img.src = URL.createObjectURL(file);
    });
}

// 🤖 ฟังก์ชันส่งรูปภาพไปให้ Gemini AI สแกนวิเคราะห์เสื้อผ้าอัตโนมัติ (พร้อมระบบตรวจจับสีจริงจากพิกเซล)
async function analyzeClothWithAI(file) {
    const token = localStorage.getItem('longlook_token');
    const realPixelColor = await extractDominantColorFromImage(file);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('clientColor', realPixelColor);

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
            const finalColor = result.color && !result.color.includes('จำลอง') ? result.color : realPixelColor;
            if (nameInput) {
                nameInput.value = `${result.category || 'เสื้อ'} (${finalColor})`;
            }
            const catSelect = document.getElementById('cloth-category-input');
            const styleSelect = document.getElementById('cloth-style-input');
            if (catSelect && result.category) {
                const c = (result.category || '').toLowerCase();
                if (c.includes('กางเกง')) catSelect.value = 'กางเกง';
                else if (c.includes('กระโปรง')) catSelect.value = 'กระโปรง';
                else if (c.includes('เดรส')) catSelect.value = 'เดรส';
                else if (c.includes('รองเท้า')) catSelect.value = 'รองเท้า';
                else if (c.includes('ประดับ') || c.includes('สร้อย') || c.includes('กำไล') || c.includes('แหวน') || c.includes('แว่น') || c.includes('นาฬิกา') || c.includes('jewelry') || c.includes('accessory')) catSelect.value = 'เครื่องประดับ';
                else if (c.includes('กระเป๋า') || c.includes('bag')) catSelect.value = 'กระเป๋า';
                else if (c.includes('หมวก') || c.includes('hat') || c.includes('cap')) catSelect.value = 'หมวก';
                else catSelect.value = 'เสื้อ';
            }
            if (styleSelect && result.style) {
                const matchedStyle = Array.from(styleSelect.options).find(o => o.value.toUpperCase() === result.style.toUpperCase());
                if (matchedStyle) styleSelect.value = matchedStyle.value;
            }
            showAiResultModal(result.category, finalColor, result.style);
        } else {
            if (nameInput) nameInput.value = `เสื้อผ้า (${realPixelColor})`;
            showLongLookToast('AI วิเคราะห์สีจากพิกเซลภาพเรียบร้อยแล้ว', 'info');
        }
    } catch (error) {
        console.error('AI Error:', error);
        if (nameInput) nameInput.value = `เสื้อผ้า (${realPixelColor})`;
        showLongLookToast('วิเคราะห์สีจากพิกเซลภาพเรียบร้อยแล้ว', 'info');
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
    const genderInput = document.getElementById('cloth-gender-input');
    const category = categoryInput ? categoryInput.value : 'เสื้อ';
    const style = styleInput ? styleInput.value : 'CASUAL';
    const gender = genderInput ? genderInput.value : 'unisex';

    const clothData = {
        id: Date.now(),
        name: name,
        category: category,
        style: style,
        gender: gender,
        image: imageUrl || "https://via.placeholder.com/150"
    };

    const token = localStorage.getItem('longlook_token');
    let savedToBackend = false;

    if (token) {
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
            if (response.ok) {
                closetItems.unshift(data.cloth || clothData);
                savedToBackend = true;
            } else {
                // หาก Token หมดอายุ หรือไม่ถูกต้อง ให้เคลียร์ทิ้งและบันทึกแบบ Local แทน
                if (response.status === 401 || response.status === 403) {
                    console.warn("Token expired or invalid, clearing local session.");
                    localStorage.removeItem('longlook_token');
                    localStorage.removeItem('longlook_user');
                    if (typeof applyLoggedOutUser === 'function') applyLoggedOutUser();
                }
                closetItems.unshift(clothData);
            }
        } catch (e) {
            console.error("Backend Save Error:", e);
            closetItems.unshift(clothData);
        }
    } else {
        // ไม่มี Token หรือโหมดผู้เยี่ยมชม: บันทึกเข้าเครื่องทันที
        closetItems.unshift(clothData);
    }

    localStorage.setItem('wardrobe_clothes', JSON.stringify(closetItems));

    closeCameraModal();
    renderClosetItems(window.currentClosetGenderFilter || 'all');
    populateSelectOptions();
    if (typeof loadCalendarHistory === 'function') loadCalendarHistory();

    if (nameInput) nameInput.value = '';
    if (fileInput) fileInput.value = '';

    if (savedToBackend) {
        showLongLookToast("👕 บันทึกเสื้อผ้าลงตู้เรียบร้อยแล้ว!", "success");
    } else if (token) {
        showLongLookToast("👕 บันทึกลงตู้แล้ว (เซสชันเดิมหมดอายุ เข้าสู่ระบบใหม่เมื่อต้องการซิงค์ Cloud)", "info");
    } else {
        showLongLookToast("👕 บันทึกเสื้อผ้าลงตู้เรียบร้อยแล้ว!", "success");
    }
}

window.currentClosetGenderFilter = 'all';

window.filterClosetByGender = function(gender) {
    window.currentClosetGenderFilter = gender;
    ['all', 'female', 'male', 'unisex'].forEach(g => {
        const btn = document.getElementById(`closet-filter-${g}`);
        if (btn) {
            if (g === gender) {
                btn.className = "px-3.5 py-1.5 rounded-xl font-extrabold bg-[#3D2B1F] text-[#FFF0F5] shadow-md transition transform scale-105 cursor-pointer border border-[#523B2B]";
            } else {
                btn.className = "px-3.5 py-1.5 rounded-xl font-bold bg-white/80 text-[#6B5647] border border-[#F0DDD0] hover:bg-white hover:text-[#3D2B1F] transition cursor-pointer shadow-2xs hover:scale-102";
            }
        }
    });
    renderClosetItems(gender);
};

// แสดงรายการเสื้อผ้าในตู้
function renderClosetItems(filterGender = 'all') {
    const closetGrid = document.getElementById('closet-grid');
    if (!closetGrid) return;

    const saved = localStorage.getItem('wardrobe_clothes');
    if (saved) closetItems = JSON.parse(saved);

    let displayItems = closetItems;
    if (filterGender && filterGender !== 'all') {
        displayItems = closetItems.filter(i => (i.gender || 'unisex') === filterGender);
    }

    if (displayItems.length === 0) {
        closetGrid.innerHTML = `
            <div class="col-span-full text-center py-12 glass-subcard rounded-3xl p-6">
                <span class="text-3xl block mb-2">🧺</span>
                <p class="text-xs font-bold text-[#6B5647]">ยังไม่มีเสื้อผ้าในหมวดนี้</p>
                <p class="text-[11px] text-[#8C6D53] mt-1">กดปุ่ม "+ เพิ่มเสื้อผ้าใหม่" เพื่อเริ่มสร้างคอลเลกชันในตู้ของคุณ</p>
            </div>
        `;
        return;
    }

    closetGrid.innerHTML = displayItems.map(item => {
        const itemGender = item.gender || 'unisex';
        let gBadge = '⚡ Unisex';
        let gBadgeClass = 'text-[#7C3AED] bg-[#EDE9FE] border-[#DDD6FE]';

        if (itemGender === 'female') {
            gBadge = '🎀 หญิง';
            gBadgeClass = 'text-[#BE185D] bg-[#FFE4E6] border-[#FECDD3]';
        } else if (itemGender === 'male') {
            gBadge = '🧢 ชาย';
            gBadgeClass = 'text-[#0369A1] bg-[#E0F2FE] border-[#BAE6FD]';
        }

        return `
        <div class="glass-subcard p-3 rounded-3xl border border-white/80 text-center shadow-sm hover-pop flex flex-col items-center relative group">
            <button type="button" onclick="deleteClothItem(event, '${item.id || ''}')" title="ลบเสื้อผ้าชิ้นนี้" 
                    class="absolute top-2.5 right-2.5 w-7 h-7 bg-white/90 hover:bg-rose-500 hover:text-white text-gray-400 hover:border-rose-300 rounded-full border border-gray-200 flex items-center justify-center text-xs shadow-md transition-all duration-200 z-10 cursor-pointer opacity-80 group-hover:opacity-100 group-hover:scale-110">
                <i class="fa-solid fa-trash-can pointer-events-none"></i>
            </button>
            <div class="w-full h-40 bg-gradient-to-b from-[#FFF5F8]/60 to-white rounded-2xl mb-2.5 border border-pink-100/60 flex items-center justify-center p-2.5 overflow-hidden transition-transform duration-300 group-hover:scale-[1.04]">
                <img src="${item.image}" class="max-w-full max-h-full object-contain drop-shadow-xs" alt="${item.name}">
            </div>
            <h4 class="font-extrabold text-xs text-[#3D2B1F] truncate w-full" title="${item.name}">${item.name}</h4>
            <div class="flex items-center gap-1.5 mt-1.5 flex-wrap justify-center">
                <span class="text-[9px] text-[#6B5647] bg-white px-2 py-0.5 rounded-lg border border-pink-100 font-bold shadow-2xs">${formatCategoryBadge(item.category)}</span>
                <span class="text-[9px] font-bold ${gBadgeClass} px-2 py-0.5 rounded-lg border shadow-2xs">${gBadge}</span>
            </div>
        </div>
        `;
    }).join('');
}

// ฟังก์ชันจัดไอคอนและป้ายชื่อหมวดหมู่เสื้อผ้าให้สวยงามและถูกต้อง
function formatCategoryBadge(cat) {
    if (!cat) return '👕 เสื้อผ้า';
    const c = String(cat).toLowerCase();
    if (c === 'เครื่องประดับ' || c.includes('ประดับ') || c.includes('สร้อย') || c.includes('กำไล') || c.includes('แหวน') || c.includes('แว่น') || c.includes('นาฬิกา')) return '💍 เครื่องประดับ';
    if (c === 'กระเป๋า' || c.includes('กระเป๋า')) return '👜 กระเป๋า';
    if (c === 'หมวก' || c.includes('หมวก')) return '🧢 หมวก';
    if (c === 'รองเท้า' || c.includes('รองเท้า')) return '👟 รองเท้า';
    if (c === 'กางเกง' || c.includes('กางเกง')) return '👖 กางเกง';
    if (c === 'กระโปรง' || c.includes('กระโปรง')) return '👗 กระโปรง';
    if (c === 'เดรส' || c.includes('เดรส')) return '✨ เดรส';
    return `👕 ${cat}`;
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

// ฟังก์ชันช่วยแยกประเภทเสื้อผ้า (4 หมวดหมู่: ท่อนบน, ท่อนล่าง, รองเท้า, เครื่องประดับ/พร็อพ)
function isShoes(item) {
    const cat = (item.category || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return cat === 'รองเท้า' || cat.includes('รองเท้า') || cat.includes('shoes') || cat.includes('sneaker') || cat.includes('boots') ||
           name.includes('รองเท้า') || name.includes('shoes') || name.includes('sneaker') || name.includes('ผ้าใบ') || name.includes('ส้นสูง') || name.includes('แตะ');
}

function isAccessory(item) {
    const cat = (item.category || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return cat === 'กระเป๋า' || cat === 'เครื่องประดับ' || cat.includes('กระเป๋า') || cat.includes('ประดับ') || cat.includes('หมวก') || cat.includes('แว่น') ||
           cat.includes('accessory') || cat.includes('bag') || cat.includes('hat') || cat.includes('cap') ||
           name.includes('กระเป๋า') || name.includes('หมวก') || name.includes('แว่น') || name.includes('นาฬิกา') || name.includes('สร้อย') || name.includes('bag') || name.includes('hat');
}

function isBottomClothing(item) {
    if (isShoes(item) || isAccessory(item)) return false;
    const cat = (item.category || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return cat === 'กางเกง' || cat === 'กระโปรง' || cat.includes('กางเกง') || cat.includes('กระโปรง') || cat.includes('bottom') || cat.includes('pants') ||
           name.includes('เกง') || name.includes('กระโปรง') || name.includes('ยีน') || name.includes('jean') || name.includes('skirt') || name.includes('short');
}

function isTopClothing(item) {
    if (isShoes(item) || isAccessory(item) || isBottomClothing(item)) return false;
    const cat = (item.category || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    return cat === 'เสื้อ' || cat.includes('เสื้อ') || cat.includes('top') || cat.includes('แจ็คเก็ต') || 
           name.includes('เสื้อ') || name.includes('shirt') || name.includes('hoodie') || name.includes('jacket') ||
           cat === 'เดรส' || (!isBottomClothing(item) && !isShoes(item) && !isAccessory(item));
}

// ฟังก์ชันควบคุมสถานะปุ่มสุ่มแมตช์ชุด (ป้องกันการกดซ้ำ และแสดงแอนิเมชัน)
function setMatchButtonsLoading(isLoading) {
    const heroBtn = document.getElementById('btn-hero-match');
    const heroText = document.getElementById('hero-match-text');
    const colBtn = document.getElementById('btn-col-match');
    const colText = document.getElementById('col-match-text');
    const diceIcon = document.getElementById('matcher-dice-icon');
    const colDice = document.getElementById('col-dice-icon');

    if (isLoading) {
        if (heroBtn) heroBtn.disabled = true;
        if (colBtn) colBtn.disabled = true;
        if (heroText) heroText.innerText = 'กำลังคำนวณลุค...';
        if (colText) colText.innerText = 'AI กำลังแมตช์...';
        if (diceIcon) {
            diceIcon.className = 'text-base fa-solid fa-spinner animate-spin text-[#8C6D53]';
            diceIcon.innerText = '';
        }
        if (colDice) {
            colDice.className = 'text-base fa-solid fa-spinner animate-spin text-[#F5E6DA]';
            colDice.innerText = '';
        }
    } else {
        if (heroBtn) heroBtn.disabled = false;
        if (colBtn) colBtn.disabled = false;
        if (heroText) heroText.innerText = 'สุ่มแมตช์ชุดครบเซ็ต';
        if (colText) colText.innerText = 'สุ่มแมตช์ชุดใหม่';
        if (diceIcon) {
            diceIcon.className = 'text-base';
            diceIcon.innerText = '🎲';
        }
        if (colDice) {
            colDice.className = '';
            colDice.innerText = '🎲';
        }
    }
}

// ฟังก์ชันแสดงสถานะและเปอร์เซ็นต์ความคืบหน้าขณะ AI กำลังแมตช์ชุด
function renderMatchingProgress(percent, stageText) {
    const lookbookView = document.getElementById('fitting-lookbook-view');
    if (!lookbookView) return;

    const clamped = Math.min(Math.max(Math.round(percent), 0), 100);

    const numElem = document.getElementById('match-progress-number');
    const barElem = document.getElementById('match-progress-bar');
    const stageElem = document.getElementById('match-progress-stage');

    // ถ้าสร้าง UI โครงสร้างไว้แล้ว ให้อัปเดตเฉพาะตัวเลขและแถบเพื่อความสมูท
    if (numElem && barElem && stageElem) {
        numElem.innerText = `${clamped}%`;
        barElem.style.width = `${clamped}%`;
        if (stageText) stageElem.innerText = stageText;
        return;
    }

    // สร้างกล่อง Progress สไตล์ LongLook อบอุ่น สวยงาม
    lookbookView.innerHTML = `
        <div class="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-4 animate-modal-in">
            <!-- Animated Icon -->
            <div class="relative flex items-center justify-center">
                <div class="w-20 h-20 rounded-3xl bg-[#FAF1EC] border border-[#D8C2B0] flex items-center justify-center shadow-inner">
                    <i class="fa-solid fa-wand-magic-sparkles text-3xl text-[#E9B44C] animate-spin" style="animation-duration: 4s;"></i>
                </div>
                <span class="absolute -bottom-2 bg-[#3D2B1F] text-[#F5E6DA] text-[9px] font-bold px-2.5 py-0.5 rounded-full border border-[#D8C2B0] shadow-sm">
                    AI Stylist
                </span>
            </div>

            <!-- Percentage Display -->
            <div class="space-y-1.5 w-full max-w-xs">
                <div class="flex items-baseline justify-center gap-1.5">
                    <span id="match-progress-number" class="text-4xl font-extrabold text-[#3D2B1F] tracking-tight font-mono">${clamped}%</span>
                    <span class="text-xs font-bold text-[#7A9A8B] animate-pulse">กำลังประมวลผล...</span>
                </div>
                <p id="match-progress-stage" class="text-xs font-semibold text-[#6B5647] min-h-[38px] flex items-center justify-center px-2 text-center leading-relaxed">
                    ${stageText || 'กำลังเตรียมการแมตช์ชุด...'}
                </p>
            </div>

            <!-- Animated Progress Bar -->
            <div class="w-full max-w-xs bg-[#FAF1EC] h-3.5 rounded-full border border-[#D8C2B0] p-0.5 overflow-hidden shadow-inner">
                <div id="match-progress-bar" 
                     class="h-full bg-gradient-to-r from-[#3D2B1F] via-[#8C6D53] to-[#7A9A8B] rounded-full transition-all duration-300 ease-out shadow-xs" 
                     style="width: ${clamped}%;">
                </div>
            </div>

            <!-- Workflow Steps Indicator -->
            <div class="flex items-center justify-center gap-2 text-[10px] text-[#8C6D53] pt-2 border-t border-dashed border-[#D8C2B0] w-full max-w-xs">
                <span class="flex items-center gap-1 font-medium"><i class="fa-solid fa-shirt text-[#89C2D9]"></i> 1. ตรวจตู้</span>
                <i class="fa-solid fa-chevron-right text-[8px] text-[#D8C2B0]"></i>
                <span class="flex items-center gap-1 font-medium"><i class="fa-brands fa-pinterest text-[#E60023]"></i> 2. Pinterest</span>
                <i class="fa-solid fa-chevron-right text-[8px] text-[#D8C2B0]"></i>
                <span class="flex items-center gap-1 font-medium"><i class="fa-solid fa-circle-check text-[#7A9A8B]"></i> 3. แมตช์ลุค</span>
            </div>
        </div>
    `;
}

// แมตช์ชุดด้วย AI Fashion Stylist (ดึง AI วิเคราะห์ความเข้ากันตามหลักแฟชั่น พร้อมรายงานเปอร์เซ็นต์แบบ Real-time)
async function triggerAutoMatchAndFitting() {
    // ป้องกันการเรียกซ้ำซ้อน (debounce) ถ้ากำลังสุ่มอยู่แล้วจะไม่ทำซ้ำ
    if (window._matchInProgress) return;
    window._matchInProgress = true;

    const saved = localStorage.getItem('wardrobe_clothes');
    if (saved) closetItems = JSON.parse(saved);

    if (closetItems.length === 0) {
        showLongLookToast('ยังไม่มีรายการเสื้อผ้าในตู้ กรุณาอัปโหลดรูปเสื้อผ้าก่อนเริ่มแมตช์ชุดนะครับ', 'info');
        window._matchInProgress = false;
        return;
    }

    setMatchButtonsLoading(true);

    const occasionSelect = document.getElementById('match-occasion-select');
    const styleSelect = document.getElementById('match-style-select');
    const genderSelect = document.getElementById('match-gender-select');
    const includeAcc = document.getElementById('match-include-acc')?.checked || false;
    const occasion = occasionSelect?.value || 'ไปคาเฟ่ / เดินเล่นวันสบายๆ';
    const style = styleSelect?.value || 'CASUAL';
    const gender = genderSelect?.value || localStorage.getItem('longlook_user_gender') || 'unisex';
    const skinTone = localStorage.getItem('longlook_user_skintone') || 'warm';

    showLongLookToast('✨ AI Fashion Stylist กำลังดึงเทรนด์ Pinterest และแมตช์ชุดจากตู้...', 'info');

    // เริ่มต้นแสดงเปอร์เซ็นต์และจำลองสเต็ปการประมวลผลให้เห็นความคืบหน้าอย่างชัดเจน
    let currentPercent = 10;
    renderMatchingProgress(currentPercent, `🧺 ตรวจสอบเสื้อผ้าในตู้ (${closetItems.length} ชิ้น)...`);

    const progressTimer = setInterval(() => {
        if (currentPercent < 28) {
            currentPercent += Math.floor(Math.random() * 5) + 3;
            renderMatchingProgress(currentPercent, `🎨 วิเคราะห์สีผิว (${skinTone}) และโอกาส (${occasion})...`);
        } else if (currentPercent < 55) {
            currentPercent += Math.floor(Math.random() * 4) + 2;
            renderMatchingProgress(currentPercent, `📌 ดึงเทรนด์สไตล์ ${style} ยอดนิยมบน Pinterest...`);
        } else if (currentPercent < 82) {
            currentPercent += Math.floor(Math.random() * 3) + 2;
            renderMatchingProgress(currentPercent, '🤖 AI Stylist กำลังจับคู่สี ท่อนบน และท่อนล่าง...');
        } else if (currentPercent < 94) {
            currentPercent += 1;
            renderMatchingProgress(currentPercent, '✨ ประเมิน Match Score และสร้างคำแนะนำจากสไตลิสต์...');
        }
    }, 180);

    let savedRatings = [];
    try {
        savedRatings = JSON.parse(localStorage.getItem('longlook_outfit_ratings') || '[]');
    } catch(e) { savedRatings = []; }

    let matchResult = null;

    try {
        const response = await fetch(`${window.LONGLOOK_API}/api/ai/match-outfit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wardrobe: closetItems,
                occasion,
                style,
                gender,
                skinTone,
                includeAccessories: includeAcc,
                ratingsHistory: savedRatings
            })
        });

        const data = await response.json();
        if (response.ok && data.match) {
            matchResult = data.match;
        }
    } catch (err) {
        console.warn('AI Stylist Match API error, using smart rule-based fallback:', err);
    }

    // หยุดตัวนับเปอร์เซ็นต์
    clearInterval(progressTimer);

    // Smart Rule-based Fallback (ถ้าออฟไลน์หรือเซิร์ฟเวอร์ตอบช้า)
    if (!matchResult) {
        const isMale = gender === 'male';
        const isFemale = gender === 'female';

        const genderFilteredCloset = closetItems.filter(item => {
            const itemGender = (item.gender || 'unisex').toLowerCase();
            const cat = (item.category || '').toLowerCase();
            const name = (item.name || '').toLowerCase();
            const isFeminine = cat === 'กระโปรง' || cat === 'เดรส' || name.includes('กระโปรง') || name.includes('เดรส') || name.includes('skirt') || name.includes('dress');
            if (isMale) {
                if (isFeminine || itemGender === 'female') return false;
                return true;
            } else if (isFemale) {
                return itemGender === 'female' || itemGender === 'unisex';
            }
            return true;
        });

        const activeWardrobe = genderFilteredCloset.length > 0 ? genderFilteredCloset : (isMale ? closetItems.filter(i => {
            const c = (i.category || '').toLowerCase();
            return c !== 'กระโปรง' && c !== 'เดรส';
        }) : closetItems);

        const tops = activeWardrobe.filter(isTopClothing);
        const bottoms = activeWardrobe.filter(isBottomClothing);
        const shoes = activeWardrobe.filter(isShoes);
        const accessories = activeWardrobe.filter(isAccessory);

        // หลีกเลี่ยงคู่ชุดที่ผู้ใช้ให้ 1-2 ดาว (Disliked Pairs)
        const dislikedPairs = savedRatings.filter(r => r.rating <= 2 || r.feedback === 'dislike');
        const isDisliked = (t, b) => {
            if (!t || !b) return false;
            return dislikedPairs.some(d => {
                const dTop = (d.topName || '').toLowerCase();
                const dBottom = (d.bottomName || '').toLowerCase();
                return dTop && dBottom && t.name.toLowerCase().includes(dTop) && b.name.toLowerCase().includes(dBottom);
            });
        };

        const availableTops = tops.length > 0 ? tops : [activeWardrobe[0] || closetItems[0]];
        const availableBottoms = bottoms.length > 0 ? bottoms : [activeWardrobe[1] || activeWardrobe[0] || closetItems[0]];

        let chosenTop = availableTops[0];
        let chosenBottom = availableBottoms[0];

        // สุ่มหาคู่ที่ไม่เคยถูกเรทลบ
        const shuffledTops = [...availableTops].sort(() => Math.random() - 0.5);
        const shuffledBottoms = [...availableBottoms].sort(() => Math.random() - 0.5);
        let foundPair = false;

        for (const t of shuffledTops) {
            for (const b of shuffledBottoms) {
                if (!isDisliked(t, b)) {
                    chosenTop = t;
                    chosenBottom = b;
                    foundPair = true;
                    break;
                }
            }
            if (foundPair) break;
        }

        const chosenShoes = shoes.length > 0 ? shoes[0] : {
            name: 'รองเท้าผ้าใบสีขาวคลีน',
            category: 'รองเท้า',
            image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&auto=format&fit=crop'
        };
        const chosenAccessory = includeAcc && accessories.length > 0 ? accessories[0] : (includeAcc ? {
            name: isFemale ? 'กระเป๋าสะพายข้างแฟชั่น' : 'กระเป๋าสะพายข้างมินิมอล',
            category: 'กระเป๋า',
            image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&auto=format&fit=crop'
        } : null);

        matchResult = {
            top: chosenTop,
            bottom: chosenBottom,
            shoes: chosenShoes,
            accessory: chosenAccessory,
            matchScore: 96,
            stylistReason: `AI จับคู่ "${chosenTop?.name || 'เสื้อ'}" เข้ากับ "${chosenBottom?.name || 'กางเกง'}" ตามสไตล์ Pinterest ${style} เหมาะกับ ${occasion}`,
            pinterestInspiration: {
                title: `Pinterest ${style} Trend Look`,
                style: style,
                color_tone: 'เอิร์ธโทน & สีพื้นคลาสสิก',
                guide: `คัดสรรไอเทมจากตู้ให้ตรงตามสไตล์และ Silhouettes ยอดนิยมบน Pinterest`,
                pinterest_url: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent((gender === 'male' ? 'men ' : gender === 'female' ? 'women ' : '') + style + ' outfit aesthetic')}`
            }
        };
    }

    // วิ่งเต็ม 100% ให้ผู้ใช้เห็นว่ากระบวนการแมตช์เสร็จสมบูรณ์
    renderMatchingProgress(100, '🎉 แมตช์ชุดสำเร็จแล้ว! กำลังจัดแสดงบนสไตล์บอร์ด...');
    await new Promise(r => setTimeout(r, 450));

    window.currentMatchedOutfit = matchResult;
    renderOutfitLayers();
    setMatchButtonsLoading(false);
    showLongLookToast(`✨ AI สไตลิสต์แมตช์ชุดสไตล์ Pinterest สำเร็จ! (คะแนน: ${matchResult.matchScore || 96}%)`, 'success');
    window._matchInProgress = false;
}

function renderOutfitLayers() {
    const outfit = window.currentMatchedOutfit;
    if (!outfit) return;

    const lookbookView = document.getElementById('fitting-lookbook-view');

    if (lookbookView) {
        const hasAccessory = !!outfit.accessory;

        const cardsHtml = hasAccessory ? `
            <!-- 4-Piece Fashion Lookbook Grid -->
            <div class="grid grid-cols-2 gap-3">
                <!-- Top -->
                <div class="glass-subcard p-3 rounded-2xl border border-purple-200/60 shadow-xs flex flex-col items-center hover-pop">
                    <span class="text-[9px] font-extrabold text-[#7C3AED] bg-[#EDE9FE] px-2 py-0.5 rounded-lg border border-[#DDD6FE] self-start mb-1.5 flex items-center gap-1">
                        <i class="fa-solid fa-shirt text-[10px]"></i> ท่อนบน · TOP
                    </span>
                    <div class="w-full h-24 flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#FAF5FF] to-white border border-[#F3E8FF]">
                        <img src="${outfit.top?.image || ''}" class="max-h-full max-w-full object-contain drop-shadow-2xs">
                    </div>
                    <p class="text-[11px] font-extrabold text-[#3D2B1F] mt-1.5 truncate w-full text-center">${outfit.top?.name || '-'}</p>
                </div>

                <!-- Bottom -->
                <div class="glass-subcard p-3 rounded-2xl border border-sky-200/60 shadow-xs flex flex-col items-center hover-pop">
                    <span class="text-[9px] font-extrabold text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded-lg border border-[#BAE6FD] self-start mb-1.5 flex items-center gap-1">
                        <i class="fa-solid fa-vest text-[10px]"></i> ท่อนล่าง · BOTTOM
                    </span>
                    <div class="w-full h-24 flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#F0F9FF] to-white border border-[#E0F2FE]">
                        <img src="${outfit.bottom?.image || ''}" class="max-h-full max-w-full object-contain drop-shadow-2xs">
                    </div>
                    <p class="text-[11px] font-extrabold text-[#3D2B1F] mt-1.5 truncate w-full text-center">${outfit.bottom?.name || '-'}</p>
                </div>

                <!-- Shoes -->
                <div class="glass-subcard p-3 rounded-2xl border border-emerald-200/60 shadow-xs flex flex-col items-center hover-pop">
                    <span class="text-[9px] font-extrabold text-[#059669] bg-[#DCFCE7] px-2 py-0.5 rounded-lg border border-[#BBF7D0] self-start mb-1.5 flex items-center gap-1">
                        <i class="fa-solid fa-shoe-prints text-[10px]"></i> รองเท้า · SHOES
                    </span>
                    <div class="w-full h-20 flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#F0FDF4] to-white border border-[#DCFCE7]">
                        <img src="${outfit.shoes?.image || ''}" class="max-h-full max-w-full object-contain drop-shadow-2xs">
                    </div>
                    <p class="text-[11px] font-extrabold text-[#3D2B1F] mt-1.5 truncate w-full text-center">${outfit.shoes?.name || '-'}</p>
                </div>

                <!-- Accessory -->
                <div class="glass-subcard p-3 rounded-2xl border border-rose-200/60 shadow-xs flex flex-col items-center hover-pop">
                    <span class="text-[9px] font-extrabold text-[#E11D48] bg-[#FFE4E6] px-2 py-0.5 rounded-lg border border-[#FECDD3] self-start mb-1.5 flex items-center gap-1">
                        <i class="fa-solid fa-gem text-[10px]"></i> พร็อพ · ACC
                    </span>
                    <div class="w-full h-20 flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#FFF1F2] to-white border border-[#FFE4E6]">
                        <img src="${outfit.accessory?.image || ''}" class="max-h-full max-w-full object-contain drop-shadow-2xs">
                    </div>
                    <p class="text-[11px] font-extrabold text-[#3D2B1F] mt-1.5 truncate w-full text-center">${outfit.accessory?.name || '-'}</p>
                </div>
            </div>
        ` : `
            <!-- 3-Piece Clean Minimalist Layout (ไม่มีพร็อพให้รก) -->
            <div class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                    <!-- Top -->
                    <div class="glass-subcard p-3 rounded-2xl border border-purple-200/60 shadow-xs flex flex-col items-center hover-pop">
                        <span class="text-[9px] font-extrabold text-[#7C3AED] bg-[#EDE9FE] px-2 py-0.5 rounded-lg border border-[#DDD6FE] self-start mb-1.5 flex items-center gap-1">
                            <i class="fa-solid fa-shirt text-[10px]"></i> ท่อนบน · TOP
                        </span>
                        <div class="w-full h-28 flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#FAF5FF] to-white border border-[#F3E8FF]">
                            <img src="${outfit.top?.image || ''}" class="max-h-full max-w-full object-contain drop-shadow-2xs">
                        </div>
                        <p class="text-[11px] font-extrabold text-[#3D2B1F] mt-1.5 truncate w-full text-center">${outfit.top?.name || '-'}</p>
                    </div>

                    <!-- Bottom -->
                    <div class="glass-subcard p-3 rounded-2xl border border-sky-200/60 shadow-xs flex flex-col items-center hover-pop">
                        <span class="text-[9px] font-extrabold text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded-lg border border-[#BAE6FD] self-start mb-1.5 flex items-center gap-1">
                            <i class="fa-solid fa-vest text-[10px]"></i> ท่อนล่าง · BOTTOM
                        </span>
                        <div class="w-full h-28 flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#F0F9FF] to-white border border-[#E0F2FE]">
                            <img src="${outfit.bottom?.image || ''}" class="max-h-full max-w-full object-contain drop-shadow-2xs">
                        </div>
                        <p class="text-[11px] font-extrabold text-[#3D2B1F] mt-1.5 truncate w-full text-center">${outfit.bottom?.name || '-'}</p>
                    </div>
                </div>

                <!-- Shoes Full Width Clean Card -->
                <div class="glass-subcard p-3 rounded-2xl border border-emerald-200/60 shadow-xs flex items-center gap-3.5 hover-pop">
                    <div class="w-16 h-16 flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-[#F0FDF4] to-white border border-[#DCFCE7] shrink-0">
                        <img src="${outfit.shoes?.image || ''}" class="max-h-full max-w-full object-contain drop-shadow-2xs">
                    </div>
                    <div class="truncate flex-1">
                        <span class="text-[9px] font-extrabold text-[#059669] bg-[#DCFCE7] px-2 py-0.5 rounded-lg border border-[#BBF7D0] inline-block mb-1">👟 รองเท้า · SHOES</span>
                        <p class="text-xs font-extrabold text-[#3D2B1F] truncate">${outfit.shoes?.name || '-'}</p>
                    </div>
                </div>
            </div>
        `;

        lookbookView.innerHTML = `
            <div class="w-full space-y-3 z-10 p-1 text-left">
                <div class="flex items-center justify-between pb-1">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-black text-[#3D2B1F] flex items-center gap-1.5">
                            <span class="animate-bounce">✨</span> ${hasAccessory ? 'เซ็ตครบ 4 ชิ้น (Full Aesthetic)' : 'เซ็ตคลีนลุค 3 ชิ้น (Clean Cut)'}
                        </span>
                        <span class="text-[9px] bg-[#FAF5FF] text-[#7C3AED] border border-[#DDD6FE] px-2 py-0.5 rounded-full font-bold">OOTD</span>
                    </div>
                    <span class="text-[11px] bg-gradient-to-r from-[#FF6B8B] to-[#FF8E72] text-white px-3 py-1 rounded-full font-black shadow-xs flex items-center gap-1">
                        <i class="fa-solid fa-fire-flame-curved text-xs"></i> ${outfit.matchScore || 96}% MATCH
                    </span>
                </div>

                ${cardsHtml}

                <!-- Stylist Advice Box -->
                <div class="bg-gradient-to-br from-[#FFF7ED] via-[#FFF1F2] to-[#FAF5FF] p-4 rounded-3xl border border-[#FBCFE8] shadow-sm text-xs space-y-1.5 relative overflow-hidden">
                    <div class="absolute -right-2 -bottom-2 text-4xl opacity-10 pointer-events-none">💬</div>
                    <div class="font-black text-[#BE185D] flex items-center gap-2 text-xs">
                        <span class="w-6 h-6 rounded-full bg-white shadow-xs flex items-center justify-center text-[#FF6B8B]"><i class="fa-solid fa-wand-magic-sparkles text-xs"></i></span>
                        AI STYLIST NOTE · คำแนะนำสไตล์
                    </div>
                    <p class="text-xs text-[#4A3E3D] leading-relaxed pl-8 font-medium">
                        "${outfit.stylistReason || 'ชุดนี้แมตช์คู่สีและสัดส่วนได้อย่างลงตัว สไตล์ชิคแบบ Pinterest ใส่แล้วปังแน่นอน ✨'}"
                    </p>
                </div>

                <!-- Outfit Rating & AI Feedback System -->
                <div id="outfit-rating-box" class="glass-subcard p-3.5 rounded-3xl border border-pink-200/80 shadow-xs space-y-2 mt-2">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1.5">
                            <span class="text-sm">⭐</span>
                            <span class="text-xs font-black text-[#3D2B1F]">ให้คะแนนลุคนี้ (AI Feedback)</span>
                        </div>
                        <span id="rating-status-text" class="text-[10px] text-[#8C6D53] font-bold">
                            ${outfit.userRating ? `คุณให้ ${outfit.userRating} ดาวแล้ว` : 'กดเพื่อให้ AI จดจำสไตล์'}
                        </span>
                    </div>

                    <!-- 5 Interactive Star Rating Buttons -->
                    <div class="flex items-center justify-between flex-wrap gap-2 pt-0.5">
                        <div class="flex items-center gap-1.5" id="star-rating-buttons">
                            ${[1, 2, 3, 4, 5].map(star => {
                                const isFilled = (outfit.userRating || 0) >= star;
                                return `
                                    <button type="button" onclick="rateCurrentOutfit(${star})" 
                                            title="${star <= 2 ? 'ไม่พอใจ (สุ่มใหม่ทันที)' : star === 3 ? 'พอใช้' : 'ชอบมาก'}"
                                            class="w-8 h-8 rounded-xl ${isFilled ? 'bg-[#FFE4E6] text-[#FF6B8B] scale-105' : 'bg-white text-gray-300 hover:text-[#FFB100]'} border border-pink-100 flex items-center justify-center text-sm transition hover:scale-110 active:scale-90 cursor-pointer shadow-2xs">
                                        <i class="fa-solid fa-star"></i>
                                    </button>
                                `;
                            }).join('')}
                        </div>

                        <!-- Quick Action Pills -->
                        <div class="flex items-center gap-1.5">
                            <button type="button" onclick="rateCurrentOutfit(1)" 
                                    class="text-[10px] px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold border border-rose-200 shadow-2xs transition hover:scale-102 active:scale-95 cursor-pointer flex items-center gap-1">
                                <span>👎</span> ไม่ชอบ (สุ่มใหม่)
                            </button>
                            <button type="button" onclick="rateCurrentOutfit(5)" 
                                    class="text-[10px] px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold border border-emerald-200 shadow-2xs transition hover:scale-102 active:scale-95 cursor-pointer flex items-center gap-1">
                                <span>❤️</span> ชอบมาก
                            </button>
                        </div>
                    </div>

                    <p class="text-[10px] text-[#8C6D53] leading-relaxed font-medium">
                        💡 <span class="font-bold text-[#E03177]">หากให้ 1-2 ดาว:</span> AI จะจดจำว่าไม่ชอบคู่ชุดนี้ และสุ่มชุดใหม่ขึ้นมาแทนทันที
                    </p>
                </div>
            </div>
        `;
        lookbookView.classList.remove('hidden');
    }

    // อัปเดตการ์ดแรงบันดาลใจ Pinterest Trend ในคอลัมน์ 1
    const inspoTitle = document.getElementById('inspo-title');
    const inspoDesc = document.getElementById('inspo-desc');
    const inspoPalette = document.getElementById('inspo-palette');
    const inspoLink = document.getElementById('inspo-pinterest-link');
    const inspoTag = document.getElementById('match-inspo-tag');

    if (outfit.pinterestInspiration) {
        if (inspoTitle) inspoTitle.innerText = outfit.pinterestInspiration.title || 'Pinterest Aesthetic Match';
        if (inspoDesc) inspoDesc.innerText = outfit.pinterestInspiration.guide || outfit.stylistReason || '';
        if (inspoPalette) inspoPalette.innerText = `🎨 โทน: ${outfit.pinterestInspiration.color_tone || outfit.colorHarmony || 'สมดุลคู่สี'}`;
        if (inspoLink) inspoLink.href = outfit.pinterestInspiration.pinterest_url || `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(outfit.pinterestInspiration.pinterest_query || 'fashion outfit')}`;
        if (inspoTag) inspoTag.innerText = outfit.pinterestInspiration.style || 'Trend Inspo';
    } else {
        const styleSelect = document.getElementById('match-style-select')?.value || 'CASUAL';
        if (inspoTitle) inspoTitle.innerText = `สไตล์ ${styleSelect} (Pinterest Curated)`;
        if (inspoDesc) inspoDesc.innerText = outfit.stylistReason || 'AI เลือกชุดจากตู้ของคุณให้สอดคล้องกับเทรนด์ความนิยมบน Pinterest';
        if (inspoPalette) inspoPalette.innerText = `🎨 โทน: ${outfit.colorHarmony || 'คู่สีเข้าชุดอย่างลงตัว'}`;
        if (inspoLink) inspoLink.href = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(styleSelect + ' fashion aesthetic')}`;
    }
}

// ฟังก์ชันบันทึกเรทติ้งชุด (1 - 5 ดาว) และสุ่มชุดใหม่ทันทีหากคะแนนน้อย
window.rateCurrentOutfit = async function(stars) {
    const outfit = window.currentMatchedOutfit;
    if (!outfit) {
        showLongLookToast('ยังไม่มีชุดให้เรทติ้ง กรุณาสุ่มชุดก่อน', 'info');
        return;
    }

    const numericStars = Math.max(1, Math.min(5, parseInt(stars, 10) || 3));
    outfit.userRating = numericStars;

    let savedRatings = [];
    try {
        savedRatings = JSON.parse(localStorage.getItem('longlook_outfit_ratings') || '[]');
    } catch(e) { savedRatings = []; }

    const topName = outfit.top?.name || '';
    const bottomName = outfit.bottom?.name || '';
    const shoesName = outfit.shoes?.name || '';
    const accName = outfit.accessory?.name || '';
    const occasion = document.getElementById('match-occasion-select')?.value || '';
    const style = document.getElementById('match-style-select')?.value || outfit.pinterestInspiration?.style || 'CASUAL';

    const newRating = {
        id: 'rate_' + Date.now(),
        topName,
        bottomName,
        shoesName,
        accessoryName: accName,
        style,
        occasion,
        rating: numericStars,
        feedback: numericStars <= 2 ? 'dislike' : numericStars >= 4 ? 'like' : 'neutral',
        timestamp: Date.now()
    };

    savedRatings.unshift(newRating);
    if (savedRatings.length > 50) savedRatings.pop();
    localStorage.setItem('longlook_outfit_ratings', JSON.stringify(savedRatings));

    // อัปเดต UI ปุ่มดาวและข้อความสถานะทันที
    const statusText = document.getElementById('rating-status-text');
    if (statusText) {
        if (numericStars <= 2) {
            statusText.innerHTML = `<span class="text-rose-500 font-extrabold animate-pulse">❌ คุณให้ ${numericStars} ดาว (กำลังสุ่มชุดใหม่...)</span>`;
        } else if (numericStars >= 4) {
            statusText.innerHTML = `<span class="text-emerald-600 font-extrabold">💖 คุณให้ ${numericStars} ดาว (AI บันทึกสไตล์แล้ว)</span>`;
        } else {
            statusText.innerHTML = `<span class="text-amber-600 font-extrabold">⭐ คุณให้ 3 ดาว (บันทึกแล้ว)</span>`;
        }
    }

    const starBtns = document.querySelectorAll('#star-rating-buttons button');
    starBtns.forEach((btn, idx) => {
        const starIdx = idx + 1;
        if (starIdx <= numericStars) {
            btn.className = "w-8 h-8 rounded-xl bg-[#FFE4E6] text-[#FF6B8B] border border-pink-100 flex items-center justify-center text-sm transition shadow-2xs scale-105";
        } else {
            btn.className = "w-8 h-8 rounded-xl bg-white text-gray-300 border border-pink-100 flex items-center justify-center text-sm transition shadow-2xs";
        }
    });

    // ส่งคะแนนไปบันทึกที่ Database ของระบบ
    try {
        const token = localStorage.getItem('longlook_token');
        fetch(`${window.LONGLOOK_API}/api/ai/rate-outfit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(newRating)
        }).catch(() => {});
    } catch(err) {}

    // หากคะแนนน้อย (1-2 ดาว) หรือกดไม่ชอบ ให้สุ่มชุดใหม่ขึ้นมาแทนทันที!
    if (numericStars <= 2) {
        showLongLookToast(`🤖 คุณให้ ${numericStars} ดาว AI จดจำว่าไม่ชอบชุดนี้ และกำลังสุ่มลุคใหม่ให้ทันที...`, 'info');
        setTimeout(() => {
            triggerAutoMatchAndFitting();
        }, 550);
    } else if (numericStars >= 4) {
        showLongLookToast(`💖 บันทึกคะแนน ${numericStars} ดาวเรียบร้อย! AI จะนำสไตล์และคู่สีนี้ไปเป็นแนวทางในการสุ่มรอบถัดไป`, 'success');
    } else {
        showLongLookToast(`⭐ บันทึกคะแนน 3 ดาวเรียบร้อยแล้ว AI จะนำไปปรับสมดุลคู่สีในรอบถัดไป`, 'info');
    }
};


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
    const topImg = document.querySelector('#avatar-top-layer img');
    const bottomImg = document.querySelector('#avatar-bottom-layer img');
    if (!topImg && !bottomImg && !window.currentMatchedOutfit?.top) {
        showLongLookToast('กรุณากดสุ่มชุดก่อนบันทึกนะครับ 🎲', 'info');
        return;
    }

    const token = localStorage.getItem('longlook_token');
    const today = typeof window.getLocalTodayString === 'function' ? window.getLocalTodayString() : new Date().toLocaleDateString('en-CA');
    const items = [];
    if (window.currentMatchedOutfit?.top) items.push(window.currentMatchedOutfit.top);
    if (window.currentMatchedOutfit?.bottom) items.push(window.currentMatchedOutfit.bottom);
    if (window.currentMatchedOutfit?.shoes) items.push(window.currentMatchedOutfit.shoes);
    if (window.currentMatchedOutfit?.accessory) items.push(window.currentMatchedOutfit.accessory);

    const topTitle = window.currentMatchedOutfit?.top?.name || 'เสื้อ';
    const bottomTitle = window.currentMatchedOutfit?.bottom?.name || 'กางเกง';
    const outfitTitle = `${topTitle} + ${bottomTitle}`;

    // 1. บันทึกลงในเครื่อง (LocalStorage) ทันทีเสมอ เพื่อให้เพื่อนๆ เล่นได้ไม่มีสะดุด
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

    let savedToBackend = false;
    if (token) {
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
                savedToBackend = true;
                await loadCalendarHistory();
            } else if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('longlook_token');
                localStorage.removeItem('longlook_user');
                if (typeof applyLoggedOutUser === 'function') applyLoggedOutUser();
            }
        } catch (e) {
            console.warn("Backend Calendar Save Warning:", e);
        }
    }

    if (savedToBackend) {
        showLongLookToast('🎉 บันทึก Outfit ครบเซ็ตลงปฏิทินและ Cloud เรียบร้อยแล้ว!', 'success');
    } else {
        showLongLookToast('🎉 บันทึก Outfit ครบเซ็ตลงปฏิทินเรียบร้อยแล้ว!', 'success');
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

// --------------------------------------------------------------------------
// BATCH CLOTHES UPLOAD & GENDER LOGIC
// --------------------------------------------------------------------------
let pendingBatchItems = [];

async function setupBatchUpload(files) {
    const singleForm = document.getElementById('single-cloth-form');
    const batchPanel = document.getElementById('batch-upload-panel');
    const previewImg = document.getElementById('image-upload-preview');
    const placeholder = document.getElementById('camera-placeholder');

    if (singleForm) singleForm.classList.add('hidden');
    if (batchPanel) batchPanel.classList.remove('hidden');
    if (previewImg) previewImg.classList.add('hidden');
    if (placeholder) placeholder.classList.add('hidden');

    pendingBatchItems = [];
    renderBatchItems();

    showLongLookToast(`📁 กำลังเตรียมและสแกนเสื้อผ้า ${files.length} รายการพร้อมกัน...`, 'info');

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const previewUrl = URL.createObjectURL(file);
        const itemObj = {
            id: Date.now() + i,
            file: file,
            previewUrl: previewUrl,
            name: file.name.replace(/\.[^/.]+$/, ""),
            category: 'เสื้อ',
            gender: 'unisex',
            color: 'กำลังสแกนสี...',
            style: 'CASUAL',
            status: 'analyzing'
        };
        pendingBatchItems.push(itemObj);
        renderBatchItems();

        (async (item) => {
            const detectedColor = await extractDominantColorFromImage(item.file);
            item.color = detectedColor;

            const fname = (item.file.name || '').toLowerCase();
            if (fname.includes('pant') || fname.includes('jean') || fname.includes('เกง')) {
                item.category = 'กางเกง';
                item.gender = 'unisex';
            } else if (fname.includes('skirt') || fname.includes('กระโปรง')) {
                item.category = 'กระโปรง';
                item.gender = 'female';
            } else if (fname.includes('dress') || fname.includes('เดรส')) {
                item.category = 'เดรส';
                item.gender = 'female';
            } else if (fname.includes('shoe') || fname.includes('รองเท้า') || fname.includes('sneaker')) {
                item.category = 'รองเท้า';
                item.gender = 'unisex';
            } else if (fname.includes('bag') || fname.includes('กระเป๋า')) {
                item.category = 'กระเป๋า';
                item.gender = 'unisex';
            } else if (fname.includes('hat') || fname.includes('หมวก')) {
                item.category = 'หมวก';
                item.gender = 'unisex';
            } else if (fname.includes('ring') || fname.includes('สร้อย') || fname.includes('กำไล') || fname.includes('acc') || fname.includes('jewelry')) {
                item.category = 'เครื่องประดับ';
                item.gender = 'unisex';
            } else {
                item.category = 'เสื้อ';
                item.gender = 'unisex';
            }

            item.name = `${item.category} (${detectedColor})`;
            item.status = 'ready';
            renderBatchItems();
        })(itemObj);
    }
}

function renderBatchItems() {
    const container = document.getElementById('batch-items-container');
    const badge = document.getElementById('batch-count-badge');
    if (badge) badge.innerText = String(pendingBatchItems.length);
    if (!container) return;

    if (pendingBatchItems.length === 0) {
        container.innerHTML = `<p class="text-xs text-[#6B5647] text-center py-4">ไม่มีรายการที่เลือก</p>`;
        return;
    }

    container.innerHTML = pendingBatchItems.map((item, idx) => `
        <div class="bg-white p-2.5 rounded-xl border border-[#D8C2B0] shadow-xs flex items-center gap-3">
            <div class="w-12 h-12 rounded-lg bg-[#FAF1EC] border border-[#D8C2B0] overflow-hidden flex items-center justify-center shrink-0">
                <img src="${item.previewUrl}" class="max-w-full max-h-full object-contain">
            </div>
            <div class="flex-grow min-w-0">
                <input type="text" value="${item.name}" onchange="updateBatchItemName(${idx}, this.value)" 
                       class="text-xs font-bold text-[#3D2B1F] w-full border-b border-transparent hover:border-[#D8C2B0] focus:border-[#3D2B1F] focus:outline-none bg-transparent truncate">
                <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                    <select onchange="updateBatchItemCategory(${idx}, this.value)" class="text-[10px] bg-[#FAF1EC] text-[#3D2B1F] border border-[#D8C2B0] rounded-md px-1.5 py-0.5 font-medium">
                        <option value="เสื้อ" ${item.category === 'เสื้อ' ? 'selected' : ''}>👕 เสื้อ</option>
                        <option value="กางเกง" ${item.category === 'กางเกง' ? 'selected' : ''}>👖 กางเกง</option>
                        <option value="กระโปรง" ${item.category === 'กระโปรง' ? 'selected' : ''}>👗 กระโปรง</option>
                        <option value="เดรส" ${item.category === 'เดรส' ? 'selected' : ''}>✨ เดรส</option>
                        <option value="รองเท้า" ${item.category === 'รองเท้า' ? 'selected' : ''}>👟 รองเท้า</option>
                        <option value="เครื่องประดับ" ${item.category === 'เครื่องประดับ' ? 'selected' : ''}>💍 พร็อพ</option>
                        <option value="กระเป๋า" ${item.category === 'กระเป๋า' ? 'selected' : ''}>👜 กระเป๋า</option>
                        <option value="หมวก" ${item.category === 'หมวก' ? 'selected' : ''}>🧢 หมวก</option>
                    </select>
                    <select onchange="updateBatchItemGender(${idx}, this.value)" class="text-[10px] bg-[#FAF1EC] text-[#3D2B1F] border border-[#D8C2B0] rounded-md px-1.5 py-0.5 font-medium">
                        <option value="unisex" ${item.gender === 'unisex' ? 'selected' : ''}>🧑 Unisex</option>
                        <option value="female" ${item.gender === 'female' ? 'selected' : ''}>👩 หญิง</option>
                        <option value="male" ${item.gender === 'male' ? 'selected' : ''}>👨 ชาย</option>
                    </select>
                    <span class="text-[10px] text-[#7A9A8B] font-semibold bg-[#EBD9CB]/50 px-2 py-0.5 rounded-md truncate max-w-[100px]">
                        🎨 ${item.color}
                    </span>
                </div>
            </div>
            <button type="button" onclick="removeBatchItem(${idx})" class="text-gray-400 hover:text-red-500 p-1 text-xs shrink-0 cursor-pointer">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `).join('');
}

function updateBatchItemName(idx, val) {
    if (pendingBatchItems[idx]) pendingBatchItems[idx].name = val;
}

function updateBatchItemCategory(idx, val) {
    if (pendingBatchItems[idx]) pendingBatchItems[idx].category = val;
}

function updateBatchItemGender(idx, val) {
    if (pendingBatchItems[idx]) pendingBatchItems[idx].gender = val;
}

function removeBatchItem(idx) {
    pendingBatchItems.splice(idx, 1);
    if (pendingBatchItems.length === 0) {
        resetBatchUpload();
    } else {
        renderBatchItems();
    }
}

function resetBatchUpload() {
    pendingBatchItems = [];
    const singleForm = document.getElementById('single-cloth-form');
    const batchPanel = document.getElementById('batch-upload-panel');
    const fileInput = document.getElementById('file-upload-input');
    const placeholder = document.getElementById('camera-placeholder');
    const previewImg = document.getElementById('image-upload-preview');

    if (singleForm) singleForm.classList.remove('hidden');
    if (batchPanel) batchPanel.classList.add('hidden');
    if (fileInput) fileInput.value = '';
    if (placeholder) placeholder.classList.remove('hidden');
    if (previewImg) previewImg.classList.add('hidden');
}

async function saveBatchClothesToDatabase() {
    if (!pendingBatchItems.length) {
        showLongLookToast('ไม่มีรายการเสื้อผ้าที่จะบันทึก', 'info');
        return;
    }

    const token = localStorage.getItem('longlook_token');
    const btn = document.getElementById('btn-save-batch');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> กำลังบันทึก ${pendingBatchItems.length} รายการ...`;
    }

    let successCount = 0;
    for (let i = 0; i < pendingBatchItems.length; i++) {
        const item = pendingBatchItems[i];
        let base64 = await convertFileToBase64(item.file);
        const clothData = {
            id: Date.now() + i,
            name: item.name || `${item.category} (${item.color})`,
            category: item.category || 'เสื้อ',
            style: item.style || 'CASUAL',
            gender: item.gender || 'unisex',
            image: base64
        };

        if (token) {
            try {
                const response = await fetch(`${window.LONGLOOK_API}/api/clothes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(clothData)
                });
                if (response.ok) {
                    const data = await response.json();
                    closetItems.unshift(data.cloth || clothData);
                } else {
                    closetItems.unshift(clothData);
                }
            } catch (e) {
                closetItems.unshift(clothData);
            }
        } else {
            closetItems.unshift(clothData);
        }
        successCount++;
    }

    localStorage.setItem('wardrobe_clothes', JSON.stringify(closetItems));
    renderClosetItems(window.currentClosetGenderFilter || 'all');
    populateSelectOptions();

    showLongLookToast(`🎉 เพิ่มเสื้อผ้าทั้งหมด ${successCount} ชิ้นลงตู้เรียบร้อยแล้ว!`, 'success');

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> 💾 บันทึกทุกชุดลงตู้พร้อมกัน`;
    }

    resetBatchUpload();
    closeCameraModal();
}

function handleMatchGenderChange(genderVal) {
    localStorage.setItem('longlook_user_gender', genderVal);
    const userGenderSelect = document.getElementById('user-gender');
    if (userGenderSelect) userGenderSelect.value = genderVal;
    showLongLookToast(`👤 ปรับการจัดลุคเป็น: ${genderVal === 'female' ? 'ผู้หญิง' : genderVal === 'male' ? 'ผู้ชาย' : 'Unisex'} เรียบร้อยแล้ว`, 'info');
}

// Event Listener เมื่อเปิดเว็บ หรือ เลือกไฟล์รูปภาพ
document.addEventListener('DOMContentLoaded', () => {
    renderClosetItems();
    populateSelectOptions();
    loadClothesFromDatabase();
    loadCalendarHistory();

    const savedGender = localStorage.getItem('longlook_user_gender') || 'female';
    const matchGenderSelect = document.getElementById('match-gender-select');
    if (matchGenderSelect) matchGenderSelect.value = savedGender;

    const fileInput = document.getElementById('file-upload-input');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            if (files.length === 1) {
                const file = files[0];
                const previewImg = document.getElementById('image-upload-preview');
                const placeholder = document.getElementById('camera-placeholder');
                const videoElem = document.getElementById('webcam-video');
                const singleForm = document.getElementById('single-cloth-form');
                const batchPanel = document.getElementById('batch-upload-panel');

                if (singleForm) singleForm.classList.remove('hidden');
                if (batchPanel) batchPanel.classList.add('hidden');

                if (previewImg) {
                    previewImg.src = URL.createObjectURL(file);
                    previewImg.classList.remove('hidden');
                    if (placeholder) placeholder.classList.add('hidden');
                    if (videoElem) videoElem.classList.add('hidden');
                }

                analyzeClothWithAI(file);
            } else {
                setupBatchUpload(files);
            }
        });
    }
});