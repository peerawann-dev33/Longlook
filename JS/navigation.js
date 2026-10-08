function switchPage(pageId) {
    const protectedPages = [
        'matcher',
        'closet',
        'calendar',
        'stats',
        'settings',
        'settings-profile'
    ];

    if (protectedPages.includes(pageId) && !isLoggedIn) {
        showPopup(
            '🔒 กรุณาเข้าสู่ระบบก่อนใช้งานฟังก์ชันนี้',
            () => {
                switchPage('login');
            }
        );
        return;
    }

    document.querySelectorAll('.page-content').forEach(el => {
        el.classList.add('hidden');
    });

    document.getElementById('page-' + pageId).classList.remove('hidden');

    document.querySelectorAll('aside nav button').forEach(btn => {
        btn.className =
            'w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-gray-500 hover:bg-gray-50 transition';
    });

    const activeBtn = document.getElementById('nav-' + pageId);

    if (activeBtn) {
        activeBtn.className =
            'w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-medium bg-[#F3ECE4] text-[#8C6D53] transition';
    }

    if (pageId === 'closet' || pageId === 'home') {
        renderCloset();
    }

    if (pageId === 'calendar') {
        renderFullCalendar();
    }

    if (pageId === 'stats') {
        document.getElementById('stat-total').innerText =
            closetItems.length + ' ไอเทมในตู้';
    }

    if (pageId === 'settings-profile') {
        loadProfileDataIntoForm();
    }

    window.scrollTo(0, 0);
}