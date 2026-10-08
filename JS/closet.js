function addNewItem() {

    const name =
        document.getElementById('item-name')
            .value.trim();

    const category =
        document.getElementById('item-category')
            .value;

    const fileInput =
        document.getElementById('item-image-file');

    if (!name) {
        alert('กรุณากรอกชื่อไอเทม');
        return;
    }

    if (fileInput.files && fileInput.files[0]) {

        const reader = new FileReader();

        reader.onload = function(e) {

            const imageBase64 =
                e.target.result;

            saveItemToCloset(
                name,
                category,
                imageBase64
            );
        };

        reader.readAsDataURL(fileInput.files[0]);

    } else {

        const defaultImage =
            'https://images.unsplash.com/photo-1589465257551-f4639982fbc4?w=300';

        saveItemToCloset(
            name,
            category,
            defaultImage
        );
    }
}

function saveItemToCloset(name, category, image) {

    closetItems.push({
        id: Date.now(),
        name: name,
        category: category,
        image: image
    });

    localStorage.setItem(
        'wardrobe_items',
        JSON.stringify(closetItems)
    );

    closeModal();

    document.getElementById('item-name').value = '';

    document.getElementById('item-image-file').value = '';

    renderCloset();

    showPopup('🎉 เพิ่มเสื้อผ้าสำเร็จ!');
}

function deleteItem(id) {

    closetItems =
        closetItems.filter(item => item.id !== id);

    localStorage.setItem(
        'wardrobe_items',
        JSON.stringify(closetItems)
    );

    renderCloset();

    showPopup('🗑️ ลบไอเทมออกจากตู้แล้ว');
}

function renderCloset() {

    const fullGrid =
        document.getElementById('full-closet-grid');

    const homePreview =
        document.getElementById('home-closet-preview');

    let htmlContent = '';

    if (closetItems.length === 0) {

        htmlContent = `
            <p class="text-xs text-gray-400 col-span-full text-center py-6">
                ยังไม่มีเสื้อผ้าในตู้ กดเพิ่มเสื้อผ้ากันเลย!
            </p>
        `;

    } else {

        closetItems.forEach(item => {

            htmlContent += `
                <div class="bg-white p-4 rounded-2xl border border-[#EAE6DF] text-center relative group">

                    <button
                        onclick="deleteItem(${item.id})"
                        class="absolute top-2 right-2 bg-red-100 hover:bg-red-200 text-red-500 w-7 h-7 rounded-full text-xs flex items-center justify-center transition"
                        title="ลบไอเทมนี้"
                    >
                        ✕
                    </button>

                    <div class="h-36 flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden">

                        <img
                            src="${item.image}"
                            class="h-full w-full object-contain"
                        >

                    </div>

                    <h4 class="font-bold text-sm mt-2 text-gray-800">
                        ${item.name}
                    </h4>

                    <p class="text-xs text-gray-400">
                        ${item.category}
                    </p>

                </div>
            `;
        });
    }

    if (fullGrid) {
        fullGrid.innerHTML = htmlContent;
    }

    if (homePreview) {
        homePreview.innerHTML = htmlContent;
    }
}