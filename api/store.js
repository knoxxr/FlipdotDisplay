// Memory-based store for Vercel serverless functions
// Note: Data will be lost on function cold starts

let settings = {
    resolution: { rows: 25, cols: 80 },
    colors: { front: '#FFFF00', back: '#000000' },
    timing: { flipDuration: 300, columnDelay: 100, flipDurationVariance: 20 },
    animationDirection: 'left-right',
    soundType: 'default'
};

let queue = [];
let services = [];
let idCounter = 1;

function getSettings() {
    return settings;
}

function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    return settings;
}

function getQueue() {
    return queue;
}

function addToQueue(item) {
    const newItem = {
        id: String(idCounter++),
        ...item
    };
    queue.push(newItem);
    return newItem;
}

function removeFromQueue(id) {
    queue = queue.filter(item => item.id !== id);
}

function updateQueue(newQueue) {
    queue = newQueue;
}

module.exports = {
    getSettings,
    updateSettings,
    getQueue,
    addToQueue,
    removeFromQueue,
    updateQueue,
    getServices: () => services,
    addService: (item) => {
        const newItem = { id: String(idCounter++), ...item };
        services.push(newItem);
        return newItem;
    },
    updateService: (id, updates) => {
        const index = services.findIndex(s => s.id === id);
        if (index === -1) return null;
        services[index] = { ...services[index], ...updates };
        return services[index];
    }
};
