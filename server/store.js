const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

const defaultSettings = {
    resolution: { rows: 25, cols: 80 },
    colors: { front: '#FFFF00', back: '#000000' },
    timing: { flipDuration: 300, columnDelay: 100, flipDurationVariance: 20 },
    animationDirection: 'left-right',
    soundType: 'default'
};

let data = {
    settings: { ...defaultSettings },
    contentQueue: [],
    services: []
};

// Load data from file if exists
if (fs.existsSync(DATA_FILE)) {
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const loaded = JSON.parse(raw);
        data.settings = { ...defaultSettings, ...loaded.settings };
        data.contentQueue = loaded.contentQueue || [];
    } catch (e) {
        console.error("Failed to load data file", e);
    }
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Failed to save data file", e);
    }
}

module.exports = {
    getSettings: () => data.settings,
    updateSettings: (newSettings) => {
        data.settings = { ...data.settings, ...newSettings };
        saveData();
        return data.settings;
    },
    getQueue: () => data.contentQueue,
    addToQueue: (item) => {
        const newItem = { id: Date.now().toString(), ...item };
        data.contentQueue.push(newItem);
        saveData();
        return newItem;
    },
    removeFromQueue: (id) => {
        data.contentQueue = data.contentQueue.filter(item => item.id !== id);
        saveData();
    },
    updateQueue: (newQueue) => {
        data.contentQueue = newQueue;
        saveData();
    },
    // Services methods
    getServices: () => data.services || [],
    addService: (serviceData) => {
        const newService = { ...serviceData, id: Date.now().toString(), createdAt: Date.now() };
        if (!data.services) data.services = [];
        data.services.push(newService);
        saveData();
        return newService;
    },
    updateService: (id, updates) => {
        if (!data.services) data.services = [];
        const index = data.services.findIndex(s => s.id === id);
        if (index === -1) return null;

        data.services[index] = { ...data.services[index], ...updates };
        saveData();
        return data.services[index];
    }
};
