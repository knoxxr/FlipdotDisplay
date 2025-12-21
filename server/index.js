const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const store = require('./store');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// API Routes

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

app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const item = store.addToQueue({
        type: 'image',
        content: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        priority: 0,
        addedAt: Date.now()
    });
    res.json(item);
});

app.delete('/api/content/:id', (req, res) => {
    store.removeFromQueue(req.params.id);
    res.json({ success: true });
});

app.delete('/api/content', (req, res) => {
    store.updateQueue([]);
    res.json({ success: true });
});

app.put('/api/content/reorder', (req, res) => {
    const { queue } = req.body;
    if (!Array.isArray(queue)) return res.status(400).json({ error: 'Queue must be an array' });
    store.updateQueue(queue);
    res.json({ success: true });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
