// js/user.js - จัดการโปรไฟล์ผู้ใช้
document.addEventListener('DOMContentLoaded', () => {
  const profileBtns = document.querySelectorAll('.user-profile-btn, .user-dropdown, #user-profile-toggle, .user-avatar');
  
  profileBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const newName = prompt('ป้อนชื่อผู้ใช้งานใหม่ของคุณ:', 'ผู้เยี่ยมชม');
      if (newName && newName.trim() !== '') {
        document.querySelectorAll('.user-name, #user-name-display').forEach(el => {
          el.innerText = newName.trim();
        });
        alert(`เปลี่ยนชื่อโปรไฟล์เป็น "${newName.trim()}" เรียบร้อยแล้ว!`);
      }
    });
  });
});