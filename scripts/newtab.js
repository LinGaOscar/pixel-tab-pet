document.addEventListener('DOMContentLoaded', async () => {
    const timeEl = document.getElementById('time');
    const dateEl = document.getElementById('date');
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsClose = document.getElementById('settings-close');
    const petStage = document.getElementById('pet-stage');
    const randomSummonBtn = document.getElementById('random-summon-btn');
    const directedSummonBtn = document.getElementById('directed-summon-btn');
    const directedSummonPanel = document.getElementById('directed-summon-panel');
    const petCountEl = document.getElementById('pet-count-number');
    const petListAdmin = document.getElementById('pet-list-admin');
    const bgLayer = document.getElementById('background-layer');
    const houseEl = document.getElementById('pet-house');
    const shortcutListAdmin = document.getElementById('shortcut-list-admin');
    const scAddBtn = document.getElementById('sc-add-btn');
    const scName = document.getElementById('sc-name');
    const scUrl = document.getElementById('sc-url');
    const scIcon = document.getElementById('sc-icon');

    const settings = await AppState.load();
    const petInstances = new Map();

    const PET_NAMES = {
        cat1: '英短貓', cat2: '暹羅貓', cat3: '緬因貓',
        dog1: '柴犬',  dog2: '柯基',   dog3: '黃金獵犬',
        bird1: '老鷹', bird2: '貓頭鷹', bird3: '鸚鵡',
        fish1: '金魚', fish2: '小丑魚', fish3: '鬥魚'
    };
    const PET_TYPES = Object.keys(PET_NAMES);

    // 初始化寵物
    const spawnPet = (petData) => {
        const engine = new PetEngine(petStage, petData);
        petInstances.set(petData.id, engine);
        renderPetAdmin();
        updatePetCount();
    };

    settings.pets.forEach(spawnPet);

    // 召喚按鈕
    const makePetData = (type) => ({
        id: Date.now(), type,
        x: Math.random() * 0.8 + 0.1,
        y: Math.random() * 0.8 + 0.1
    });

    randomSummonBtn.onclick = async () => {
        const newPet = makePetData(randomPetType());
        settings.pets.push(newPet);
        spawnPet(newPet);
        await AppState.save(settings);
    };

    directedSummonBtn.onclick = (e) => {
        e.stopPropagation();
        directedSummonPanel.classList.toggle('hidden');
    };

    directedSummonPanel.querySelectorAll('.pet-option').forEach(btn => {
        btn.onclick = async () => {
            const newPet = makePetData(btn.dataset.type);
            settings.pets.push(newPet);
            spawnPet(newPet);
            directedSummonPanel.classList.add('hidden');
            await AppState.save(settings);
        };
    });

    document.addEventListener('click', () => directedSummonPanel.classList.add('hidden'));

    // 寵物管理介面
    function renderPetAdmin() {
        petListAdmin.innerHTML = '';
        settings.pets.forEach((pet, index) => {
            const item = document.createElement('div');
            item.className = 'pet-admin-item';
            item.innerHTML = `
                <span>${PET_NAMES[pet.type] || pet.type} #${index + 1}</span>
                <button class="delete-pet" data-id="${pet.id}">撤回</button>
            `;
            item.querySelector('.delete-pet').onclick = async () => {
                const id = pet.id;
                settings.pets = settings.pets.filter(p => p.id !== id);
                petInstances.get(id).destroy();
                petInstances.delete(id);
                renderPetAdmin();
                updatePetCount();
                await AppState.save(settings);
            };
            petListAdmin.appendChild(item);
        });
    }

    function updatePetCount() {
        petCountEl.textContent = settings.pets.length;
    }

    // 隨機選出尚未出現的品種；全滿時全域隨機
    function randomPetType() {
        const used = new Set(settings.pets.map(p => p.type));
        const available = PET_TYPES.filter(t => !used.has(t));
        const pool = available.length > 0 ? available : PET_TYPES;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    // 寵物小屋：拖曳放入即撤回
    petStage.addEventListener('pet-drop', async (e) => {
        const { id, clientX, clientY } = e.detail;
        const rect = houseEl.getBoundingClientRect();
        const inHouse = clientX >= rect.left && clientX <= rect.right &&
                        clientY >= rect.top  && clientY <= rect.bottom;
        if (!inHouse) return;
        settings.pets = settings.pets.filter(p => p.id !== id);
        petInstances.get(id).destroy();
        petInstances.delete(id);
        renderPetAdmin();
        updatePetCount();
        await AppState.save(settings);
    });

    // 拖曳中偵測游標是否懸停在小屋上，給予視覺回饋
    document.addEventListener('pointermove', (e) => {
        const anyDragging = [...petInstances.values()].some(p => p.dragging);
        if (!anyDragging) { houseEl.classList.remove('drag-over'); return; }
        const rect = houseEl.getBoundingClientRect();
        const over = e.clientX >= rect.left && e.clientX <= rect.right &&
                     e.clientY >= rect.top  && e.clientY <= rect.bottom;
        houseEl.classList.toggle('drag-over', over);
    });

    // 快捷入口
    function renderShortcuts() {
        const container = document.getElementById('shortcuts');
        container.innerHTML = '';
        settings.shortcuts.forEach(s => {
            const a = document.createElement('a');
            a.href = s.url;
            a.className = 'shortcut-item';
            a.innerHTML = `<span class="shortcut-icon">${s.icon}</span><span class="shortcut-name">${s.name}</span>`;
            container.appendChild(a);
        });
    }

    function renderShortcutAdmin() {
        shortcutListAdmin.innerHTML = '';
        settings.shortcuts.forEach((sc, index) => {
            const item = document.createElement('div');
            item.className = 'pet-admin-item';
            item.innerHTML = `<span>${sc.icon} ${sc.name}</span><button class="delete-pet">移除</button>`;
            item.querySelector('button').onclick = async () => {
                settings.shortcuts.splice(index, 1);
                renderShortcuts();
                renderShortcutAdmin();
                await AppState.save(settings);
            };
            shortcutListAdmin.appendChild(item);
        });
    }

    scAddBtn.onclick = async () => {
        const name = scName.value.trim();
        let url = scUrl.value.trim();
        const icon = scIcon.value.trim() || name[0]?.toUpperCase() || '?';
        if (!name || !url) return;
        if (!/^https?:\/\//.test(url)) url = 'https://' + url;
        settings.shortcuts.push({ name, url, icon });
        renderShortcuts();
        renderShortcutAdmin();
        scName.value = scUrl.value = scIcon.value = '';
        await AppState.save(settings);
    };

    renderShortcuts();
    renderShortcutAdmin();

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
        // 63% = air/ground border, 67% = ground/water border（對應 groundLine = h*0.65）
        const themes = {
            'cozy-room': `linear-gradient(to bottom,
                #2E1760 0%, #C5395B 30%, #E87830 55%, #F4C842 63%,
                #C89610 63%, #A06B08 66%,
                #3DADA8 67%, #1A5E7A 84%, #0A2535 100%)`,
            'pixel-forest': `linear-gradient(to bottom,
                #0B1A33 0%, #142D55 25%, #1F5738 50%, #3A8050 63%,
                #5C3D1A 63%, #3A1F0A 66%,
                #1B4030 67%, #0D2318 84%, #060F0A 100%)`,
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
