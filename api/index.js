const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const store = require('./store');

const app = express();

app.use(cors());
app.use(express.json());

// Settings
app.get('/api/settings', (req, res) => {
    res.json(store.getSettings());
});

app.post('/api/settings', (req, res) => {
    const updated = store.updateSettings(req.body);
    res.json(updated);
});

// Content
app.get('/api/content', (req, res) => {
    res.json(store.getQueue());
});

app.post('/api/content/text', (req, res) => {
    const { text, priority } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const item = store.addToQueue({
        type: 'text',
        content: text,
        priority: priority || 0,
        addedAt: Date.now()
    });
    res.json(item);
});

app.delete('/api/content/:id', (req, res) => {
    store.removeFromQueue(req.params.id);
    res.json({ success: true });
});

app.put('/api/content/reorder', (req, res) => {
    const { queue } = req.body;
    if (!Array.isArray(queue)) return res.status(400).json({ error: 'Queue must be an array' });
    store.updateQueue(queue);
    res.json({ success: true });
});

module.exports = app;
