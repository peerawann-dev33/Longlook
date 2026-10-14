let isLoggedIn = false;
let popupCallback = null;
let selectedDateKey = null;
let currentRandomOutfitItems = [];

let calendarOutfits =
    JSON.parse(localStorage.getItem('wardrobe_calendar')) || {};

let closetItems =
    JSON.parse(localStorage.getItem('wardrobe_items')) || [
        {
            id: 1,
            name: 'เสื้อเชิ้ตสีขาว',
            category: 'เสื้อ',
            image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300'
        },
        {
            id: 2,
            name: 'กางเกงยีนส์ขายาว',
            category: 'กางเกง',
            image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300'
        }
    ];

window.addEventListener('DOMContentLoaded', () => {
    checkActiveSession();
    initRealCalendar();
    fetchRealWeather();
    renderCloset();
    initUserDropdownState();

    window.addEventListener('click', (e) => {
        const container = document.getElementById('user-profile-container');
        const menu = document.getElementById('user-dropdown-menu');

        if (
            container &&
            menu &&
            !container.contains(e.target) &&
            !menu.contains(e.target)
        ) {
            menu.classList.add('hidden');
        }
    });
});