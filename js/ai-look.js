// js/ai-look.js - จัดการระบบ Gemini AI Stylist + Fashion Look แนะนำชุดประจำวัน
window.currentAiLook = null;

// คลังลุคแฟชั่นสไตล์ Pinterest ในตัว (Client-side Fallback สำหรับกรณีเปิดบน Vercel หรือเซิร์ฟเวอร์ออฟไลน์)
const CLIENT_LOOK_CATALOG = [
    // Female
    {
        gender: 'female',
        skinTone: 'warm',
        title: 'เอิร์ธโทนคาเฟ่ชิลล์ (Warm Casual)',
        style: 'Casual',
        color_tone: 'ครีม, เบจ, คาราเมล',
        reason: 'โทนสีเบจและเอิร์ธโทนช่วยขับผิว Warm Tone ให้ดูสดใส อบอุ่น แมตช์ง่าย เหมาะกับคาเฟ่หรือเดินเล่นวันสบายๆ',
        pieces: {
            top: 'เสื้อเชิ้ตแขนสั้นผ้าลินินสีครีม',
            bottom: 'กางเกงขายาวทรงกระบอกสีน้ำตาลอ่อน',
            shoes: 'รองเท้าผ้าใบสีขาวมินิมอล',
            accessory: 'กระเป๋าผ้าแคนวาส + สร้อยสีทองเส้นเล็ก'
        },
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop',
        pinterest_query: 'korean casual outfit warm tone women'
    },
    {
        gender: 'female',
        skinTone: 'cool',
        title: 'มินิมอลพาสเทลสายเกา (Cool Minimal)',
        style: 'Korean Minimal',
        color_tone: 'ฟ้าพาสเทล, เทาอ่อน, ขาว',
        reason: 'โทนสีฟ้าพาสเทลและสีขาวช่วยขับผิว Cool Tone ให้ดูผ่องใส ออร่าละมุนตา และดูสะอาดสะอ้าน',
        pieces: {
            top: 'เสื้อคาร์ดิแกนไหมพรมบางสีฟ้าพาสเทล',
            bottom: 'กระโปรงพลีทหรือกางเกงสีขาวงาช้าง',
            shoes: 'รองเท้าแมรี่เจนหรือสนีกเกอร์ขาว',
            accessory: 'กระเป๋าสะพายไหล่สีเงินเมทัลลิก'
        },
        image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop',
        pinterest_query: 'korean pastel outfit cool tone women'
    },
    {
        gender: 'female',
        skinTone: 'neutral',
        title: 'ซิตี้เกิร์ลสตรีทชิค (City Streetwear)',
        style: 'Streetwear',
        color_tone: 'ดำ, ยีนส์เข้ม, ขาว',
        reason: 'ผิว Neutral Tone แมตช์คู่สีตัดกันสไตล์ Black & Denim ได้สวยคม เสริมลุคมั่นใจ กระฉับกระเฉง',
        pieces: {
            top: 'เสื้อครอปสีดำเรียบเท่',
            bottom: 'กางเกงคาร์โก้ยีนส์เอวสูง',
            shoes: 'รองเท้าผ้าใบ Chunky Sneakers',
            accessory: 'หมวกแก๊ปสีดำ + กระเป๋า Crossbody'
        },
        image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&auto=format&fit=crop',
        pinterest_query: 'streetwear outfit aesthetic women'
    },
    // Male
    {
        gender: 'male',
        skinTone: 'warm',
        title: 'เจแปนนีสเอิร์ธโทน (Warm Casual Boy)',
        style: 'Japanese Casual',
        color_tone: 'โอลีฟ, กากี, เบจ',
        reason: 'เฉดสีเขียวโอลีฟและกากีช่วยขับออร่าผิว Warm Tone ให้ดูสุขุม เท่ สบายตาแบบมินิมอลญี่ปุ่น',
        pieces: {
            top: 'เสื้อเชิ้ตโอเวอร์ไซส์สีเขียวโอลีฟสวมทับเสื้อยืดขาว',
            bottom: 'กางเกงชิโน่ขากระบอกสีเบจ',
            shoes: 'รองเท้าผ้าใบผ้าแคนวาส',
            accessory: 'หมวกบักเก็ตผ้าคอตตอน + นาฬิกาสายหนัง'
        },
        image: 'https://images.unsplash.com/photo-1516826957135-700dedea698c?w=600&auto=format&fit=crop',
        pinterest_query: 'japanese casual style warm tone men'
    },
    {
        gender: 'male',
        skinTone: 'cool',
        title: 'สมาร์ทมินิมอลโมเดิร์น (Cool Smart Casual)',
        style: 'Smart Casual',
        color_tone: 'สีกรมท่า, ขาว, เทา',
        reason: 'โทนสี Navy Blue และสีเทา ช่วยขับผิว Cool Tone ให้ดูคมชัด บุคลิกดีและดูโปร่งสบาย',
        pieces: {
            top: 'เสื้อโปโลไหมพรมสีกรมท่า',
            bottom: 'กางเกงสแล็คสีเทาควันบุหรี่',
            shoes: 'รองเท้าโลฟเฟอร์หนังกลับหรือสนีกเกอร์คลีนๆ',
            accessory: 'นาฬิกาข้อมือสายสแตนเลสสีเงิน'
        },
        image: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=600&auto=format&fit=crop',
        pinterest_query: 'mens smart casual cool tone outfit'
    },
    {
        gender: 'male',
        skinTone: 'neutral',
        title: 'สตรีทบอยยีนส์คลาสสิก (Urban Street)',
        style: 'Streetwear',
        color_tone: 'ยีนส์ฟอก, ขาว, ดำ',
        reason: 'โทนยีนส์คลาสสิกและเสื้อยืดขาวเข้าได้กับทุกสีผิว ดูเท่ คล่องตัว เหมาะกับทุกกิจกรรมประจำวัน',
        pieces: {
            top: 'เสื้อยืดโอเวอร์ไซส์สีขาวพิมพ์ลายมินิมอล',
            bottom: 'กางเกงยีนส์ขากระบอกตรงสีมิดไนท์บลู',
            shoes: 'รองเท้าผ้าใบ Retro Sneakers',
            accessory: 'กระเป๋าสะพายข้าง Messenger Bag'
        },
        image: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&auto=format&fit=crop',
        pinterest_query: 'mens street fashion denim outfit'
    },
    // Unisex
    {
        gender: 'unisex',
        skinTone: 'warm',
        title: 'โคซี่เอิร์ธโทนยูนิเซ็กส์ (Warm Earthy Look)',
        style: 'Casual',
        color_tone: 'น้ำตาลมอคค่า, ครีม, เขียวเสจ',
        reason: 'โทนสีอุ่นธรรมชาติช่วยเสริมลุคให้ดูเป็นกันเอง อบอุ่น และใส่สบายเข้ากับทุกเพศ',
        pieces: {
            top: 'เสื้อเชิ้ตแขนยาวสีครีมปลดกระดุม',
            bottom: 'กางเกงผ้าลินินสีเขียวเสจหรือน้ำตาลอ่อน',
            shoes: 'รองเท้าผ้าใบสีขาวคลีน',
            accessory: 'กระเป๋า Tote Bag ผ้าแคนวาส'
        },
        image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop',
        pinterest_query: 'unisex earth tone fashion outfit'
    },
    {
        gender: 'unisex',
        skinTone: 'cool',
        title: 'เดนิมมินิมอล (Cool Casual Unisex)',
        style: 'Minimal',
        color_tone: 'ฟ้าเดนิม, ขาว, เทาอ่อน',
        reason: 'โทนสีเย็นและผ้ายีนส์ช่วยขับผิว Cool Tone ให้ดูสดใส ไม่หมอง เข้ากับวันสบายๆ',
        pieces: {
            top: 'เสื้อยืดแขนสั้นสีเทาอ่อน',
            bottom: 'กางเกงยีนส์ฟอกสีฟ้าอ่อนขากระบอก',
            shoes: 'รองเท้าสนีกเกอร์สีขาวล้วน',
            accessory: 'หมวกเบสบอลสีขาวงาช้าง'
        },
        image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop',
        pinterest_query: 'unisex denim minimal outfit'
    },
    {
        gender: 'unisex',
        skinTone: 'neutral',
        title: 'วินเทจ 90s คลาสสิก (Vintage Casual)',
        style: 'Vintage',
        color_tone: 'กรมท่า, ส้มอิฐ, น้ำตาล',
        reason: 'คู่สีวินเทจ 90s แมตช์ง่าย ได้ฟีลเรโทรและเอกลักษณ์เฉพาะตัว เหมาะกับสภาพอากาศทุกวัน',
        pieces: {
            top: 'เสื้อโปโลโอเวอร์ไซส์สีกรมท่าตัดปกสีขาว',
            bottom: 'กางเกงคาร์โก้หรือยีนส์ทรงหลวม',
            shoes: 'รองเท้าผ้าใบวินเทจทรงคลาสสิก',
            accessory: 'แว่นตากันแดดกรอบเรโทร'
        },
        image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&auto=format&fit=crop',
        pinterest_query: '90s vintage outfit aesthetic unisex'
    }
];

function applyLookToUI(look, source = 'curated') {
    const loadingElem = document.getElementById('home-outfit-loading');
    const imgElem = document.getElementById('home-outfit-img');
    const titleElem = document.getElementById('home-outfit-title');
    const styleElem = document.getElementById('home-outfit-style');
    const colorElem = document.getElementById('home-outfit-color');
    const reasonElem = document.getElementById('home-outfit-reason');
    const pinLinkElem = document.getElementById('home-outfit-pinterest-link');
    const badgeElem = document.getElementById('ai-stylist-badge');

    const topElem = document.getElementById('piece-top');
    const bottomElem = document.getElementById('piece-bottom');
    const shoesElem = document.getElementById('piece-shoes');
    const accElem = document.getElementById('piece-acc');

    window.currentAiLook = look;

    // อัปเดตข้อมูล UI
    if (titleElem) titleElem.innerText = look.title || 'ลุคแนะนำประจำวัน';
    if (styleElem) styleElem.innerText = look.style || 'Casual';
    if (colorElem) colorElem.innerText = look.color_tone ? `โทน ${look.color_tone}` : 'โทนธรรมชาติ';
    if (reasonElem) reasonElem.innerText = look.reason || 'แมตช์เข้ากับสภาพอากาศและโทนสีผิวของคุณ';

    // Pieces
    if (look.pieces) {
        if (topElem) topElem.innerText = look.pieces.top || 'เสื้อตัวโปรด';
        if (bottomElem) bottomElem.innerText = look.pieces.bottom || 'กางเกง/กระโปรง';
        if (shoesElem) shoesElem.innerText = look.pieces.shoes || 'สนีกเกอร์คู่เก่ง';
        if (accElem) accElem.innerText = look.pieces.accessory || 'เครื่องประดับ/กระเป๋า';
    }

    // Pinterest Link
    const pinterestQuery = look.pinterest_query || `${look.title} outfit aesthetic`;
    const pinUrl = look.pinterest_url || `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(pinterestQuery)}`;
    if (pinLinkElem) {
        pinLinkElem.href = pinUrl;
    }

    // Badge source
    if (badgeElem) {
        if (source === 'gemini') {
            badgeElem.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles mr-1"></i>Gemini AI Stylist`;
        } else {
            badgeElem.innerHTML = `<i class="fa-brands fa-pinterest mr-1"></i>Pinterest Inspiration`;
        }
    }

    // รูปภาพชุด
    if (imgElem && look.image) {
        imgElem.onload = () => {
            if (loadingElem) loadingElem.classList.add('hidden');
            imgElem.classList.remove('hidden');
        };
        imgElem.onerror = () => {
            if (loadingElem) loadingElem.classList.add('hidden');
            imgElem.classList.remove('hidden');
        };
        imgElem.src = look.image;
    } else {
        if (loadingElem) loadingElem.classList.add('hidden');
    }
}

// สุ่มเลือกจากแคตตาล็อกในเครื่อง (ทำงานทันทีแม้ไม่มีเซิร์ฟเวอร์ Backend)
function getFallbackClientLook(gender, skinTone) {
    let pool = CLIENT_LOOK_CATALOG.filter(item => item.gender === gender && item.skinTone === skinTone);
    if (pool.length === 0) {
        pool = CLIENT_LOOK_CATALOG.filter(item => item.gender === gender);
    }
    if (pool.length === 0) {
        pool = CLIENT_LOOK_CATALOG.filter(item => item.gender === 'unisex');
    }
    if (pool.length === 0) pool = CLIENT_LOOK_CATALOG;
    return { ...pool[Math.floor(Math.random() * pool.length)] };
}

// โหลดลุคแนะนำประจำวัน
async function fetchDailyAiLook(forceRandom = false) {
    const loadingElem = document.getElementById('home-outfit-loading');
    const imgElem = document.getElementById('home-outfit-img');

    const genderSelect = document.getElementById('user-gender');
    const skintoneSelect = document.getElementById('user-skintone');
    const weatherTemp = document.getElementById('weather-temp-sub') || document.getElementById('weather-temp');

    const gender = genderSelect ? genderSelect.value : (localStorage.getItem('longlook_gender') || 'unisex');
    const skinTone = skintoneSelect ? skintoneSelect.value : (localStorage.getItem('longlook_skintone') || 'warm');
    const temp = weatherTemp ? parseInt(weatherTemp.innerText) || 25 : 25;

    if (loadingElem) loadingElem.classList.remove('hidden');
    if (imgElem) imgElem.classList.add('hidden');

    try {
        const response = await fetch(`${window.LONGLOOK_API}/api/ai/recommend-look`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gender,
                skinTone,
                style: 'Casual / Trendy',
                temp,
                condition: 'แจ่มใส'
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        applyLookToUI(data.look, data.source);

        if (forceRandom && typeof showLongLookToast === 'function') {
            showLongLookToast('✨ สุ่มลุคใหม่ให้เรียบร้อยแล้ว!', 'info');
        }
    } catch (err) {
        console.warn('Backend API unavailable, using client-side Pinterest catalog:', err.message);
        // Fallback อัตโนมัติ: ดึงจากคลังรูปแฟชั่น Pinterest ทันที ไม่พังแน่นอน
        const fallbackLook = getFallbackClientLook(gender, skinTone);
        applyLookToUI(fallbackLook, 'curated');

        if (forceRandom && typeof showLongLookToast === 'function') {
            showLongLookToast('✨ สุ่มลุคใหม่ให้เรียบร้อยแล้ว!', 'info');
        }
    }
}

// บันทึกโทนสีผิวและเพศลงฐานข้อมูล
async function saveUserProfileToDatabase() {
    const genderSelect = document.getElementById('user-gender');
    const skintoneSelect = document.getElementById('user-skintone');
    const gender = genderSelect ? genderSelect.value : 'unisex';
    const skinTone = skintoneSelect ? skintoneSelect.value : 'warm';

    localStorage.setItem('longlook_gender', gender);
    localStorage.setItem('longlook_skintone', skinTone);

    const token = localStorage.getItem('longlook_token');
    if (token) {
        try {
            const res = await fetch(`${window.LONGLOOK_API}/api/user/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ gender, skinTone })
            });
            const data = await res.json();
            if (res.ok) {
                if (typeof showLongLookToast === 'function') {
                    showLongLookToast('✨ บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว!', 'success');
                }
            } else {
                alert(data.message || 'บันทึกไม่สำเร็จ');
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        if (typeof showLongLookToast === 'function') {
            showLongLookToast('💾 บันทึกข้อมูลในเครื่องแล้ว (ล็อกอินเพื่อซิงค์ข้อมูล)', 'info');
        }
    }

    // ปรับลุค AI ให้เข้ากับเพศและสีผิวที่เพิ่งบันทึกทันที
    fetchDailyAiLook(false);
}

// โหลดค่าเพศและโทนสีผิวเดิมที่ผู้ใช้เคยเลือกไว้
function initUserProfileInputs() {
    const savedGender = localStorage.getItem('longlook_gender');
    const savedSkintone = localStorage.getItem('longlook_skintone');

    const genderSelect = document.getElementById('user-gender');
    const skintoneSelect = document.getElementById('user-skintone');

    if (genderSelect && savedGender) genderSelect.value = savedGender;
    if (skintoneSelect && savedSkintone) skintoneSelect.value = savedSkintone;

    if (genderSelect) {
        genderSelect.addEventListener('change', () => {
            localStorage.setItem('longlook_gender', genderSelect.value);
            fetchDailyAiLook(false);
        });
    }

    if (skintoneSelect) {
        skintoneSelect.addEventListener('change', () => {
            localStorage.setItem('longlook_skintone', skintoneSelect.value);
            fetchDailyAiLook(false);
        });
    }
}

// เริ่มต้นทำงานเมื่อโหลดหน้าเว็บเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    initUserProfileInputs();
    fetchDailyAiLook(false);
});
// ... โค้ดเดิมใน js/ai-look.js ...

// ==========================================
// ✨ ฟังก์ชันแนะนำชุดตามสถานการณ์ + เสื้อผ้าในตู้จริง
// ==========================================
async function fetchAiLookWithContext() {
    // 1. ดึงค่าสถานการณ์/สถานที่ ที่ผู้ใช้พิมพ์หรือเลือก
    const eventInput = document.getElementById('user-event-prompt'); // ช่องพิมพ์ เช่น "ไปเรียนวิชาการ"
    const eventContext = eventInput && eventInput.value.trim() !== '' ? eventInput.value : 'ไปเที่ยววันสบายๆ';

    // 2. ดึงรายการเสื้อผ้าจริงในตู้เสื้อผ้าของผู้ใช้
    const myCloset = JSON.parse(localStorage.getItem('longlook_closet') || '[]');

    // 3. ดึงเพศ สีผิว อุณหภูมิ
    const gender = localStorage.getItem('longlook_gender') || 'unisex';
    const skinTone = localStorage.getItem('longlook_skintone') || 'warm';
    const weatherTemp = document.getElementById('weather-temp');
    const temp = weatherTemp ? parseInt(weatherTemp.innerText) || 25 : 25;

    try {
        const response = await fetch(`${window.LONGLOOK_API}/api/ai/recommend-look`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gender,
                skinTone,
                temp,
                eventContext, // ส่งสถานการณ์/สถานที่ไปให้ AI
                closetItems: myCloset // ส่งเสื้อผ้าในตู้จริงไปให้ AI แมตช์
            })
        });

        const data = await response.json();
        applyLookToUI(data.look, data.source);
    } catch (err) {
        console.warn('API Error, using fallback');
    }
}

// ==========================================
// ✨ ฟังก์ชันจำลองภาพลองชุด Virtual Try-On
// ==========================================
async function generateVirtualTryOn() {
    if (!window.currentAiLook) {
        alert('กรุณากดให้ AI แมตช์ชุดก่อนนะคะ');
        return;
    }

    const container = document.getElementById('tryon-result-container');
    const loading = document.getElementById('tryon-loading');
    const resultImg = document.getElementById('tryon-result-img');

    if (container) container.classList.remove('hidden');
    if (loading) loading.classList.remove('hidden');
    if (resultImg) resultImg.classList.add('hidden');

    // ดึงข้อมูลรูปโปรไฟล์ผู้ใช้ และรูปชุด
    const userAvatar = localStorage.getItem('longlook_user_avatar') || '';
    const currentLook = window.currentAiLook;

    try {
        const response = await fetch(`${window.LONGLOOK_API}/api/ai/virtual-tryon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userAvatar,
                look: currentLook
            })
        });

        const data = await response.json();

        if (response.ok && data.imageUrl) {
            resultImg.src = data.imageUrl;
            resultImg.classList.remove('hidden');
            if (loading) loading.classList.add('hidden');
            if (typeof showLongLookToast === 'function') {
                showLongLookToast('✨ จำลองภาพลองชุดเรียบร้อยแล้ว!', 'success');
            }
        } else {
            throw new Error(data.message || 'ไม่สามารถสร้างภาพได้');
        }
    } catch (err) {
        console.warn('Try-On API unavailable, showing look preview:', err.message);
        if (loading) loading.classList.add('hidden');
        
        // กรณี Backend ยังไม่ตอบรับ ให้ดึงภาพชุดตัวอย่างมาแสดงผลลองชุดแทน
        if (resultImg && currentLook.image) {
            resultImg.src = currentLook.image;
            resultImg.classList.remove('hidden');
        }
        
        if (typeof showLongLookToast === 'function') {
            showLongLookToast('✨ แสดงภาพจำลองการแต่งตัวเรียบร้อยแล้ว', 'info');
        }
    }
}