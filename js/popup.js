function openModal() {

    if (!isLoggedIn) {
        showPopup(
            '🔒 กรุณาเข้าสู่ระบบก่อนเพิ่มเสื้อผ้า',
            () => {
                switchPage('login');
            }
        );
        return;
    }

    document.getElementById('upload-modal')
        .classList.remove('hidden');
}

function closeModal() {
    document.getElementById('upload-modal')
        .classList.add('hidden');
}

function showPopup(msg, cb = null) {

    document.getElementById('popup-message')
        .innerText = msg;

    document.getElementById('custom-popup')
        .classList.remove('hidden');

    popupCallback = cb;
}

function closePopup() {

    document.getElementById('custom-popup')
        .classList.add('hidden');

    if (popupCallback) {
        popupCallback();
        popupCallback = null;
    }
}