function randomOutfit() {

    if (closetItems.length === 0) {
        showPopup(
            '❌ ยังไม่มีเสื้อผ้าในตู้ กรุณาเพิ่มเสื้อผ้าก่อนสุ่มลุค'
        );
        return;
    }

    const resultBox =
        document.getElementById('match-result-box');

    const container =
        document.getElementById('outfit-display-container');

    const matchText =
        document.getElementById('match-text');

    resultBox.classList.remove('hidden');

    container.innerHTML = `
        <div class="col-span-full py-8 text-center space-y-2">

            <div class="text-3xl animate-bounce">
                ✨ 🧥 👖 👟 ✨
            </div>

            <p class="text-xs text-[#8C6D53] font-medium animate-pulse">
                กำลังสลับจับคู่ตู้เสื้อผ้าของคุณ...
            </p>

        </div>
    `;

    matchText.innerText = '';

    setTimeout(() => {

        const tops =
            closetItems.filter(
                i =>
                    i.category === 'เสื้อ' ||
                    i.category === 'เดรส'
            );

        const bottoms =
            closetItems.filter(
                i =>
                    i.category === 'กางเกง' ||
                    i.category === 'กระโปรง'
            );

        const shoes =
            closetItems.filter(
                i => i.category === 'รองเท้า'
            );

        const accessories =
            closetItems.filter(
                i =>
                    i.category === 'กระเป๋า' ||
                    i.category === 'เครื่องประดับ'
            );

        let selectedOutfit = [];

        if (tops.length > 0) {
            selectedOutfit.push(
                tops[
                    Math.floor(
                        Math.random() * tops.length
                    )
                ]
            );
        }

        if (bottoms.length > 0) {
            selectedOutfit.push(
                bottoms[
                    Math.floor(
                        Math.random() * bottoms.length
                    )
                ]
            );
        }

        if (shoes.length > 0) {
            selectedOutfit.push(
                shoes[
                    Math.floor(
                        Math.random() * shoes.length
                    )
                ]
            );
        }

        if (accessories.length > 0) {
            selectedOutfit.push(
                accessories[
                    Math.floor(
                        Math.random() * accessories.length
                    )
                ]
            );
        }

        if (selectedOutfit.length === 0) {
            selectedOutfit.push(
                closetItems[
                    Math.floor(
                        Math.random() * closetItems.length
                    )
                ]
            );
        }

        currentRandomOutfitItems =
            selectedOutfit;

        let outfitHtml = '';

        selectedOutfit.forEach(item => {

            outfitHtml += `
                <div class="bg-white p-4 rounded-2xl border border-[#EAE6DF] text-center shadow-sm transition transform hover:scale-105">

                    <div class="h-28 flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden">

                        <img
                            src="${item.image}"
                            class="h-full w-full object-contain"
                        >

                    </div>

                    <h4 class="font-bold text-xs mt-2 text-gray-800 truncate">
                        ${item.name}
                    </h4>

                    <p class="text-[10px] text-gray-400">
                        ${item.category}
                    </p>

                </div>
            `;
        });

        container.innerHTML = outfitHtml;

        matchText.innerText =
            `💡 เซ็ตนี้เหมาะสำหรับลุคประจำวันของคุณ แมตช์จากไอเทม ${selectedOutfit.length} ชิ้นในตู้!`;

    }, 800);
}