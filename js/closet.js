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
    renderClosetItems();
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
            <span class="text-[9px] text-[#6B5647] bg-[#EBD9CB] px-2.5 py-0.5 rounded-md mt-1 font-semibold">${formatCategoryBadge(item.category)}</span>
        </div>
    `).join('');
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

// แมตช์ชุดด้วย AI Fashion Stylist (ดึง AI วิเคราะห์ความเข้ากันตามหลักแฟชั่น)
async function triggerAutoMatchAndFitting() {
    const saved = localStorage.getItem('wardrobe_clothes');
    if (saved) closetItems = JSON.parse(saved);

    if (closetItems.length === 0) {
        showLongLookToast('ยังไม่มีรายการเสื้อผ้าในตู้ กรุณาอัปโหลดรูปเสื้อผ้าก่อนเริ่มแมตช์ชุดนะครับ', 'info');
        return;
    }

    // แอนิเมชันลูกเต๋าหมุนที่ปุ่มสุ่ม
    const diceIcon = document.getElementById('matcher-dice-icon');
    if (diceIcon) {
        diceIcon.classList.remove('animate-dice');
        void diceIcon.offsetWidth;
        diceIcon.classList.add('animate-dice');
    }

    const occasionSelect = document.getElementById('match-occasion-select');
    const styleSelect = document.getElementById('match-style-select');
    const occasion = occasionSelect?.value || 'ไปคาเฟ่ / เดินเล่นวันสบายๆ';
    const style = styleSelect?.value || 'CASUAL';
    const gender = localStorage.getItem('longlook_user_gender') || 'unisex';
    const skinTone = localStorage.getItem('longlook_user_skintone') || 'warm';

    showLongLookToast('✨ AI Fashion Stylist กำลังคำนวณและเลือกชุดที่เข้ากันที่สุด...', 'info');

    try {
        const response = await fetch(`${window.LONGLOOK_API}/api/ai/match-outfit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wardrobe: closetItems,
                occasion,
                style,
                gender,
                skinTone
            })
        });

        const data = await response.json();
        if (response.ok && data.match) {
            window.currentMatchedOutfit = data.match;
            renderOutfitLayers();
            showLongLookToast(`✨ AI สไตลิสต์แมตช์ชุดสำเร็จ! (คะแนนความเข้ากัน: ${data.match.matchScore || 95}%)`, 'success');
            return;
        }
    } catch (err) {
        console.warn('AI Stylist Match API error, using smart rule-based fallback:', err);
    }

    // Smart Rule-based Fallback (ถ้าออฟไลน์หรือเซิร์ฟเวอร์ตอบช้า)
    const tops = closetItems.filter(isTopClothing);
    const bottoms = closetItems.filter(isBottomClothing);
    const shoes = closetItems.filter(isShoes);
    const accessories = closetItems.filter(isAccessory);

    const chosenTop = tops.length > 0 ? tops[0] : closetItems[0];
    const chosenBottom = bottoms.length > 0 ? bottoms[0] : (closetItems[1] || closetItems[0]);
    const chosenShoes = shoes.length > 0 ? shoes[0] : {
        name: 'รองเท้าผ้าใบสีขาวคลีน',
        category: 'รองเท้า',
        image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&auto=format&fit=crop'
    };
    const chosenAccessory = accessories.length > 0 ? accessories[0] : {
        name: 'กระเป๋าสะพายข้างแฟชั่น',
        category: 'กระเป๋า',
        image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&auto=format&fit=crop'
    };

    window.currentMatchedOutfit = {
        top: chosenTop,
        bottom: chosenBottom,
        shoes: chosenShoes,
        accessory: chosenAccessory,
        stylistReason: `AI จับคู่ "${chosenTop.name}" เข้ากับ "${chosenBottom.name}" ในสไตล์ ${style} เหมาะกับ ${occasion}`
    };

    renderOutfitLayers();
}

function renderOutfitLayers() {
    const outfit = window.currentMatchedOutfit;
    if (!outfit) return;

    const lookbookView = document.getElementById('fitting-lookbook-view');
    const aiView = document.getElementById('fitting-ai-view');

    if (lookbookView) {
        lookbookView.innerHTML = `
            <div class="w-full space-y-3 z-10 p-2 text-left">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-[#3D2B1F] flex items-center gap-1.5">
                        <i class="fa-solid fa-sparkles text-[#E9B44C]"></i> เซ็ตที่ AI สไตลิสต์คัดสรร
                    </span>
                    <span class="text-[10px] bg-[#3D2B1F] text-[#F5E6DA] px-2.5 py-0.5 rounded-full font-bold">
                        Match Score: ${outfit.matchScore || 96}%
                    </span>
                </div>

                <!-- 4-Piece Fashion Lookbook Grid -->
                <div class="grid grid-cols-2 gap-2.5">
                    <!-- Top -->
                    <div class="bg-white p-2.5 rounded-2xl border border-[#D8C2B0] shadow-xs flex flex-col items-center hover:scale-[1.02] transition">
                        <span class="text-[9px] font-bold text-[#8C6D53] self-start mb-1">👕 ท่อนบน</span>
                        <div class="w-full h-24 flex items-center justify-center overflow-hidden rounded-xl bg-[#FAF1EC]">
                            <img src="${outfit.top?.image || ''}" class="max-h-full max-w-full object-contain">
                        </div>
                        <p class="text-[10px] font-bold text-[#3D2B1F] mt-1.5 truncate w-full text-center">${outfit.top?.name || '-'}</p>
                    </div>

                    <!-- Bottom -->
                    <div class="bg-white p-2.5 rounded-2xl border border-[#D8C2B0] shadow-xs flex flex-col items-center hover:scale-[1.02] transition">
                        <span class="text-[9px] font-bold text-[#8C6D53] self-start mb-1">👖 ท่อนล่าง</span>
                        <div class="w-full h-24 flex items-center justify-center overflow-hidden rounded-xl bg-[#FAF1EC]">
                            <img src="${outfit.bottom?.image || ''}" class="max-h-full max-w-full object-contain">
                        </div>
                        <p class="text-[10px] font-bold text-[#3D2B1F] mt-1.5 truncate w-full text-center">${outfit.bottom?.name || '-'}</p>
                    </div>

                    <!-- Shoes -->
                    <div class="bg-white p-2.5 rounded-2xl border border-[#D8C2B0] shadow-xs flex flex-col items-center hover:scale-[1.02] transition">
                        <span class="text-[9px] font-bold text-[#8C6D53] self-start mb-1">👟 รองเท้า</span>
                        <div class="w-full h-20 flex items-center justify-center overflow-hidden rounded-xl bg-[#FAF1EC]">
                            <img src="${outfit.shoes?.image || ''}" class="max-h-full max-w-full object-contain">
                        </div>
                        <p class="text-[10px] font-bold text-[#3D2B1F] mt-1.5 truncate w-full text-center">${outfit.shoes?.name || '-'}</p>
                    </div>

                    <!-- Accessory -->
                    <div class="bg-white p-2.5 rounded-2xl border border-[#D8C2B0] shadow-xs flex flex-col items-center hover:scale-[1.02] transition">
                        <span class="text-[9px] font-bold text-[#8C6D53] self-start mb-1">💍 พร็อพ / เครื่องประดับ</span>
                        <div class="w-full h-20 flex items-center justify-center overflow-hidden rounded-xl bg-[#FAF1EC]">
                            <img src="${outfit.accessory?.image || ''}" class="max-h-full max-w-full object-contain">
                        </div>
                        <p class="text-[10px] font-bold text-[#3D2B1F] mt-1.5 truncate w-full text-center">${outfit.accessory?.name || '-'}</p>
                    </div>
                </div>

                <!-- Stylist Advice Box -->
                <div class="bg-[#FAF1EC] p-3 rounded-2xl border border-[#D8C2B0] text-xs text-[#523B2B] space-y-1">
                    <div class="font-bold text-[#7A9A8B] flex items-center gap-1.5 text-[11px]">
                        <i class="fa-solid fa-wand-magic-sparkles text-[#E9B44C]"></i> ความเห็นจาก AI Fashion Stylist:
                    </div>
                    <p class="text-xs text-[#6B5647] leading-relaxed">
                        ${outfit.stylistReason || 'ชุดนี้แมตช์คู่สีและสัดส่วนได้อย่างลงตัว เสริมออร่าและความมั่นใจในทุกโอกาส'}
                    </p>
                </div>
            </div>
        `;
        lookbookView.classList.remove('hidden');
        if (aiView) aiView.classList.add('hidden');
    }

    // อัปเดตรายการชิ้นส่วนสรุปใน AI Studio Panel ฝั่งซ้าย
    const summaryBox = document.getElementById('match-pieces-summary');
    if (summaryBox) {
        summaryBox.innerHTML = `
            <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="bg-white/90 p-2.5 rounded-xl border border-[#D8C2B0] flex items-center gap-2">
                    <span class="text-base">👕</span>
                    <div class="truncate">
                        <div class="text-[10px] text-[#8C6D53] font-semibold">ท่อนบน</div>
                        <div class="font-medium truncate text-[#3D2B1F]">${outfit.top?.name || '-'}</div>
                    </div>
                </div>
                <div class="bg-white/90 p-2.5 rounded-xl border border-[#D8C2B0] flex items-center gap-2">
                    <span class="text-base">👖</span>
                    <div class="truncate">
                        <div class="text-[10px] text-[#8C6D53] font-semibold">ท่อนล่าง</div>
                        <div class="font-medium truncate text-[#3D2B1F]">${outfit.bottom?.name || '-'}</div>
                    </div>
                </div>
                <div class="bg-white/90 p-2.5 rounded-xl border border-[#D8C2B0] flex items-center gap-2">
                    <span class="text-base">👟</span>
                    <div class="truncate">
                        <div class="text-[10px] text-[#8C6D53] font-semibold">รองเท้า</div>
                        <div class="font-medium truncate text-[#3D2B1F]">${outfit.shoes?.name || '-'}</div>
                    </div>
                </div>
                <div class="bg-white/90 p-2.5 rounded-xl border border-[#D8C2B0] flex items-center gap-2">
                    <span class="text-base">💍</span>
                    <div class="truncate">
                        <div class="text-[10px] text-[#8C6D53] font-semibold">พร็อพ/เครื่องประดับ</div>
                        <div class="font-medium truncate text-[#3D2B1F]">${outfit.accessory?.name || '-'}</div>
                    </div>
                </div>
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
// AI VIRTUAL TRY-ON & SELFIE LOGIC (ถ่ายรูปตัวเอง + AI เจนรูปใส่ชุดที่แมตช์)
// --------------------------------------------------------------------------
function triggerSelectUserSelfie() {
    const input = document.getElementById('user-selfie-input');
    if (input) input.click();
}

function handleUserSelfieChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const photoData = e.target.result;
        localStorage.setItem('longlook_user_selfie', photoData);
        updateUserSelfiePreview(photoData);
        toggleFittingMode('user');
        showLongLookToast('📸 โหลดรูปภาพของคุณเรียบร้อยแล้ว!', 'success');
    };
    reader.readAsDataURL(file);
}

function updateUserSelfiePreview(photoUrl) {
    const placeholder = document.getElementById('user-selfie-placeholder');
    const imgElem = document.getElementById('user-selfie-img');
    const statusText = document.getElementById('user-selfie-status');
    const bgElem = document.getElementById('avatar-user-bg');

    if (imgElem) {
        imgElem.src = photoUrl;
        imgElem.classList.remove('hidden');
    }
    if (bgElem) {
        bgElem.src = photoUrl;
    }
    if (placeholder) placeholder.classList.add('hidden');
    if (statusText) statusText.innerText = 'รูปของคุณพร้อมลองชุดแล้ว ✨';
}

// สลับโหมดการแสดงผลในห้องลองชุด (สไตล์บอร์ด 4 ชิ้น vs ภาพถ่าย AI เสก)
function toggleFittingMode(mode) {
    const btnLookbook = document.getElementById('btn-view-lookbook');
    const btnAiPortrait = document.getElementById('btn-view-ai-portrait');
    const lookbookView = document.getElementById('fitting-lookbook-view');
    const aiView = document.getElementById('fitting-ai-view');
    const aiEmpty = document.getElementById('fitting-ai-empty');
    const aiDisplay = document.getElementById('fitting-ai-display');
    const aiImg = document.getElementById('fitting-ai-img');
    const aiCaption = document.getElementById('fitting-ai-caption');
    const hint = document.getElementById('fitting-mode-hint');

    if (mode === 'portrait') {
        if (lookbookView) lookbookView.classList.add('hidden');
        if (aiView) aiView.classList.remove('hidden');

        if (btnAiPortrait) {
            btnAiPortrait.className = "px-2.5 py-1 rounded-full font-bold bg-[#3D2B1F] text-white transition shadow-xs cursor-pointer";
        }
        if (btnLookbook) {
            btnLookbook.className = "px-2.5 py-1 rounded-full font-medium text-[#6B5647] hover:text-[#3D2B1F] transition cursor-pointer";
        }

        if (window.latestTryOnResult && window.latestTryOnResult.imageUrl) {
            if (aiEmpty) aiEmpty.classList.add('hidden');
            if (aiDisplay) aiDisplay.classList.remove('hidden');
            if (aiImg) aiImg.src = window.latestTryOnResult.imageUrl;
            if (aiCaption) aiCaption.innerText = window.latestTryOnResult.advice || '';
            if (hint) hint.innerHTML = '✨ <b>ภาพ AI เสก:</b> ภาพถ่ายโมเดลแฟชั่นเสมือนจริงที่ AI ผสานชุดของคุณอย่างแนบเนียน';
        } else {
            if (aiEmpty) aiEmpty.classList.remove('hidden');
            if (aiDisplay) aiDisplay.classList.add('hidden');
            if (hint) hint.innerHTML = '💡 กดปุ่ม <b>"✨ AI เสกรูปฉันใส่ชุดนี้"</b> ด้านขวา เพื่อเจนรูปภาพเสมือนจริง';
        }
    } else {
        if (lookbookView) lookbookView.classList.remove('hidden');
        if (aiView) aiView.classList.add('hidden');

        if (btnLookbook) {
            btnLookbook.className = "px-2.5 py-1 rounded-full font-bold bg-[#3D2B1F] text-white transition shadow-xs cursor-pointer";
        }
        if (btnAiPortrait) {
            btnAiPortrait.className = "px-2.5 py-1 rounded-full font-medium text-[#6B5647] hover:text-[#3D2B1F] transition cursor-pointer";
        }
        if (hint) {
            hint.innerHTML = '💡 เสื้อผ้าจากตู้ถูกวิเคราะห์ด้วย AI ให้แมตช์เข้าชุด 4 ชิ้นอย่างลงตัว';
        }
    }
}

// AI Virtual Try-On: สั่งประมวลผลเจนภาพคนสวมใส่ชุดที่แมตช์ด้วย Pure AI Generation (ไม่มีการตัดแปะ)
async function runAiVirtualTryOn() {
    if (!window.currentMatchedOutfit || !window.currentMatchedOutfit.top) {
        await triggerAutoMatchAndFitting();
    }

    const outfit = window.currentMatchedOutfit;
    if (!outfit || !outfit.top) {
        showLongLookToast('กรุณาเพิ่มเสื้อผ้าในตู้ก่อนลองชุดนะครับ', 'info');
        return;
    }

    const userPhoto = localStorage.getItem('longlook_user_selfie') || '';
    if (!userPhoto) {
        showLongLookToast('📸 กรุณาถ่ายรูปหรืออัปโหลดรูปตัวเองก่อน เพื่อให้ AI นำไปสร้างลุคครับ', 'info');
        triggerSelectUserSelfie();
        return;
    }

    const occasionSelect = document.getElementById('match-occasion-select');
    const styleSelect = document.getElementById('match-style-select');

    const occasion = occasionSelect?.value || 'ไปคาเฟ่ / เดินเล่นวันสบายๆ';
    const style = styleSelect?.value || 'CASUAL';

    const modal = document.getElementById('tryon-result-modal');
    const loadingElem = document.getElementById('tryon-loading');
    const resultContent = document.getElementById('tryon-result-content');
    const resultImg = document.getElementById('tryon-result-img');
    const adviceElem = document.getElementById('tryon-advice-text');

    if (modal) modal.classList.remove('hidden');
    if (loadingElem) loadingElem.classList.remove('hidden');
    if (resultContent) resultContent.classList.add('hidden');

    try {
        const response = await fetch(`${window.LONGLOOK_API}/api/ai/virtual-tryon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userPhoto,
                items: outfit,
                style,
                occasion,
                gender: localStorage.getItem('longlook_user_gender') || 'unisex'
            })
        });

        if (!response.ok) {
            throw new Error('Virtual try-on server failed');
        }

        const data = await response.json();
        const generatedImageUrl = data.imageUrl;
        const adviceText = data.advice || `AI แมตช์ชุด "${outfit.top?.name}" คู่กับ "${outfit.bottom?.name}" ให้คุณได้อย่างลงตัว`;

        window.latestTryOnResult = {
            imageUrl: generatedImageUrl,
            advice: adviceText
        };

        // โหลดรูปภาพ AI ให้พร้อมก่อนแสดงผล
        const imgPreloader = new Image();
        imgPreloader.onload = () => {
            if (resultImg) resultImg.src = generatedImageUrl;
            if (adviceElem) adviceElem.innerText = adviceText;

            // อัปเดตในสไตล์บอร์ดหน้า Matcher ด้วย
            const aiImg = document.getElementById('fitting-ai-img');
            const aiCaption = document.getElementById('fitting-ai-caption');
            const aiEmpty = document.getElementById('fitting-ai-empty');
            const aiDisplay = document.getElementById('fitting-ai-display');
            if (aiImg) aiImg.src = generatedImageUrl;
            if (aiCaption) aiCaption.innerText = adviceText;
            if (aiEmpty) aiEmpty.classList.add('hidden');
            if (aiDisplay) aiDisplay.classList.remove('hidden');

            if (loadingElem) loadingElem.classList.add('hidden');
            if (resultContent) resultContent.classList.remove('hidden');
            showLongLookToast('✨ AI เสกรูปภาพแฟชั่นเสมือนจริงสำเร็จแล้ว!', 'success');
        };
        imgPreloader.onerror = () => {
            if (resultImg) resultImg.src = generatedImageUrl;
            if (adviceElem) adviceElem.innerText = adviceText;
            if (loadingElem) loadingElem.classList.add('hidden');
            if (resultContent) resultContent.classList.remove('hidden');
        };
        imgPreloader.src = generatedImageUrl;

    } catch (err) {
        console.error('Try-on error:', err);
        showLongLookToast('เกิดข้อผิดพลาดในการเจนภาพด้วย AI กรุณาลองใหม่อีกครั้ง', 'error');
        if (modal) modal.classList.add('hidden');
    }
}

function closeTryOnModal() {
    const modal = document.getElementById('tryon-result-modal');
    if (modal) modal.classList.add('hidden');
}


function downloadTryOnImage() {
    if (!window.latestTryOnResult?.imageUrl) return;
    const link = document.createElement('a');
    link.href = window.latestTryOnResult.imageUrl;
    link.target = '_blank';
    link.download = `longlook-tryon-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Event Listener เมื่อเลือกไฟล์รูปภาพ ให้อ่านไฟล์และสแกนด้วย AI อัตโนมัติ
document.addEventListener('DOMContentLoaded', () => {
    renderClosetItems();
    populateSelectOptions();
    loadClothesFromDatabase();
    loadCalendarHistory();

    const savedSelfie = localStorage.getItem('longlook_user_selfie');
    if (savedSelfie) {
        updateUserSelfiePreview(savedSelfie);
    }

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