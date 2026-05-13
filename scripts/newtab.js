document.addEventListener('DOMContentLoaded', async () => {
    const timeEl = document.getElementById('time');
    const dateEl = document.getElementById('date');
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsClose = document.getElementById('settings-close');
    const petStage = document.getElementById('pet-stage');
    const addPetBtn = document.getElementById('add-pet-btn');
    const petListAdmin = document.getElementById('pet-list-admin');
    const bgLayer = document.getElementById('background-layer');

    const settings = await AppState.load();
    const petInstances = new Map();

    // 初始化寵物
    const spawnPet = (petData) => {
        const engine = new PetEngine(petStage, petData);
        petInstances.set(petData.id, engine);
        renderPetAdmin();
    };

    settings.pets.forEach(spawnPet);

    // 召喚按鈕
    addPetBtn.onclick = async () => {
        const newPet = {
            id: Date.now(),
            type: 'cat1',
            x: Math.random() * 0.8 + 0.1,
            y: Math.random() * 0.8 + 0.1
        };
        settings.pets.push(newPet);
        spawnPet(newPet);
        await AppState.save(settings);
    };

    // 寵物管理介面
    function renderPetAdmin() {
        petListAdmin.innerHTML = '';
        settings.pets.forEach((pet, index) => {
            const item = document.createElement('div');
            item.className = 'pet-admin-item';
            item.innerHTML = `
                <span>${pet.type} #${index + 1}</span>
                <button class="delete-pet" data-id="${pet.id}">撤回</button>
            `;
            item.querySelector('.delete-pet').onclick = async () => {
                const id = pet.id;
                settings.pets = settings.pets.filter(p => p.id !== id);
                petInstances.get(id).destroy();
                petInstances.delete(id);
                renderPetAdmin();
                await AppState.save(settings);
            };
            petListAdmin.appendChild(item);
        });
    }

    // 更新時鐘
    const updateClock = () => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeEl.textContent = `${hours}:${minutes}`;
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        dateEl.textContent = now.toLocaleDateString('zh-TW', options);
    };
    updateClock();
    setInterval(updateClock, 1000);

    // 背景切換
    document.querySelectorAll('.bg-option').forEach(btn => {
        btn.onclick = async () => {
            document.querySelectorAll('.bg-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const bg = btn.dataset.bg;
            settings.bgTheme = bg;
            updateBackground(bg);
            await AppState.save(settings);
        };
    });

    const updateBackground = (theme) => {
        const themes = {
            'cozy-room': 'radial-gradient(circle at center, #475569 0%, #1e293b 100%)',
            'pixel-forest': 'radial-gradient(circle at center, #064e3b 0%, #022c22 100%)',
            'default': 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)'
        };
        bgLayer.style.background = themes[theme] || themes['default'];
        const activeBtn = document.querySelector(`.bg-option[data-bg="${theme}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    };
    updateBackground(settings.bgTheme);

    // 設定面板開關
    settingsToggle.onclick = () => settingsPanel.classList.remove('hidden');
    settingsClose.onclick = () => settingsPanel.classList.add('hidden');
});
