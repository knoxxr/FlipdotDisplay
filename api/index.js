const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { put } = require('@vercel/blob');
const store = require('./store');

const app = express();
const router = express.Router();

app.use(cors());
app.use(express.json());

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Settings
router.get('/settings', (req, res) => {
    res.json(store.getSettings());
});

router.post('/settings', (req, res) => {
    const updated = store.updateSettings(req.body);
    res.json(updated);
});

// Content
router.get('/content', (req, res) => {
    res.json(store.getQueue());
});

router.post('/content/text', (req, res) => {
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

// Image upload endpoint
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Upload to Vercel Blob Storage
        const blob = await put(req.file.originalname, req.file.buffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        // Add to queue
        const item = store.addToQueue({
            type: 'image',
            content: blob.url,
            originalName: req.file.originalname,
            priority: 0,
            addedAt: Date.now()
        });

        res.json(item);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed', details: error.message });
    }
});

router.delete('/content/:id', (req, res) => {
    store.removeFromQueue(req.params.id);
    res.json({ success: true });
});

router.put('/content/reorder', (req, res) => {
    const { queue } = req.body;
    if (!Array.isArray(queue)) return res.status(400).json({ error: 'Queue must be an array' });
    store.updateQueue(queue);
    res.json({ success: true });
});

// Mount router at both /api and / to handle Vercel routing quirks
// If Vercel strips /api, the request matches /
// If Vercel keeps /api, the request matches /api
app.use('/api', router);
app.use('/', router);

// Start server if run directly (local development)
if (require.main === module) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
