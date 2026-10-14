function switchPage(pageId) {
    // 1. ซ่อนหน้าทั้งหมดก่อน
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('hidden');
    });

    // 2. แสดงเฉพาะหน้าที่เลือกพร้อมเอฟเฟกต์ Fade-in นุ่มนวล
    const selectedPage = document.getElementById(`page-${pageId}`);
    if (selectedPage) {
        selectedPage.classList.remove('hidden');
        selectedPage.classList.remove('animate-page-enter');
        void selectedPage.offsetWidth; // Force reflow เพื่อให้แอนิเมชันเริ่มใหม่ทุกครั้งที่สลับหน้า
        selectedPage.classList.add('animate-page-enter');
    }

    // 3. รีเซ็ตสไตล์ปุ่มเมนูทั้งหมดให้เป็นสีปกติ
    document.querySelectorAll('nav button').forEach(btn => {
        btn.className = "w-full flex items-center justify-center md:justify-start gap-3 px-3.5 py-2.5 rounded-2xl text-[#EBD9CB] hover:bg-[#523B2B] transition";
    });

    // 4. ใส่สไตล์ไฮไลต์ (Active State) ให้ปุ่มที่กำลังกดเลือก
    const activeNav = document.getElementById(`nav-${pageId}`);
    if (activeNav) {
        activeNav.className = "w-full flex items-center justify-center md:justify-start gap-3 px-3.5 py-2.5 rounded-2xl bg-[#EBD9CB] text-[#3D2B1F] font-bold transition shadow-sm";
    }

    // 5. โหลดข้อมูลอัตโนมัติตามหน้าที่เปิด
    if (pageId === 'calendar') {
        if (typeof renderFullCalendar === 'function') renderFullCalendar();
        if (typeof loadCalendarHistory === 'function') loadCalendarHistory();
    }
    if (pageId === 'closet' && typeof renderClosetItems === 'function') {
        renderClosetItems();
    }
}