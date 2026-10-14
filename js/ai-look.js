// js/ai-look.js - จัดการระบบ Gemini AI Stylist + Fashion Look แนะนำชุดประจำวัน
window.currentAiLook = null;

// โหลดลุคแนะนำประจำวันจาก Backend (Gemini AI / Fashion Inspiration)
async function fetchDailyAiLook(forceRandom = false) {
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

    const genderSelect = document.getElementById('user-gender');
    const skintoneSelect = document.getElementById('user-skintone');
    const weatherTemp = document.getElementById('weather-temp-sub') || document.getElementById('weather-temp');

    const gender = genderSelect ? genderSelect.value : (localStorage.getItem('longlook_gender') || 'unisex');
    const skinTone = skintoneSelect ? skintoneSelect.value : (localStorage.getItem('longlook_skintone') || 'warm');
    const temp = weatherTemp ? parseInt(weatherTemp.innerText) || 25 : 25;

    // แสดงสถานะกำลังโหลด
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

        if (!response.ok) throw new Error('Failed to fetch look');

        const data = await response.json();
        const look = data.look;
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
        if (pinLinkElem && look.pinterest_url) {
            pinLinkElem.href = look.pinterest_url;
        }

        // Badge source
        if (badgeElem) {
            if (data.source === 'gemini') {
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

        if (forceRandom && typeof showLongLookToast === 'function') {
            showLongLookToast('✨ สุ่มลุคใหม่ให้เรียบร้อยแล้ว!', 'info');
        }
    } catch (err) {
        console.error('Fetch daily look error:', err);
        if (loadingElem) loadingElem.classList.add('hidden');
        if (imgElem) imgElem.classList.remove('hidden');
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
