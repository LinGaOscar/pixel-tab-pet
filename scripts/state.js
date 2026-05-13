const AppState = {
    defaults: {
        pets: [
            { id: Date.now(), type: 'cat1', x: 0.5, y: 0.8 } // x, y as percentages
        ],
        bgTheme: 'default',
        shortcuts: [
            { name: 'Google', url: 'https://www.google.com', icon: 'G' },
            { name: 'YouTube', url: 'https://www.youtube.com', icon: 'Y' },
            { name: 'GitHub', url: 'https://github.com', icon: 'H' }
        ]
    },

    async load() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.local.get(this.defaults, (data) => {
                    resolve(data);
                });
            });
        }
        // Fallback to localStorage
        const data = localStorage.getItem('pixel-pet-settings');
        return data ? JSON.parse(data) : this.defaults;
    },

    async save(settings) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.local.set(settings, () => {
                    resolve();
                });
            });
        }
        localStorage.setItem('pixel-pet-settings', JSON.stringify(settings));
    }
};
