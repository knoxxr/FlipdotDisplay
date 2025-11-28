import React, { useState, useEffect, useCallback } from 'react';
import DisplayGrid from './components/DisplayGrid';
import { processImage } from './utils/imageProcessing';
import { processText } from './utils/textProcessing';
import './App.css';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [settings, setSettings] = useState({
    resolution: { rows: 30, cols: 60 },
    colors: { front: '#000000', back: '#FFFFFF' },
    timing: { flipSpeed: 100, columnDelay: 20, slideDuration: 5000 }
  });

  const [queue, setQueue] = useState([]);
  const [currentGrid, setCurrentGrid] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Admin inputs
  const [textInput, setTextInput] = useState('');
  const [fileInput, setFileInput] = useState(null);

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // Fetch initial data
  useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then(res => res.json())
      .then(data => setSettings(data));

    fetch(`${API_URL}/content`)
      .then(res => res.json())
      .then(data => setQueue(data));
  }, []);

  // Cycle content
  useEffect(() => {
    if (queue.length === 0 || !isPlaying) return;

    const showContent = async () => {
      const item = queue[currentIndex];
      let grid = [];

      try {
        if (item.type === 'text') {
          grid = processText(item.content, settings.resolution.rows, settings.resolution.cols);
        } else if (item.type === 'image') {
          // Construct full URL for image
          const imageUrl = `http://localhost:3001${item.content}`;
          grid = await processImage(imageUrl, settings.resolution.rows, settings.resolution.cols);
        }
        setCurrentGrid(grid);
      } catch (err) {
        console.error("Error processing content", err);
      }

      // Schedule next item
      const timeout = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % queue.length);
      }, settings.timing.slideDuration);

      return () => clearTimeout(timeout);
    };

    showContent();
  }, [queue, currentIndex, settings, isPlaying]);

  // Handlers
  const handleSettingsChange = (section, key, value) => {
    const newSettings = {
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value
      }
    };
    setSettings(newSettings);
    // Debounce save? For now just save on blur or button click usually, but here we update state immediately.
    // Let's add a "Save Settings" button to persist to server.
  };

  const saveSettings = () => {
    fetch(`${API_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
  };

  const handleAddText = () => {
    fetch(`${API_URL}/content/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textInput, priority: 0 })
    })
      .then(res => res.json())
      .then(newItem => {
        setQueue([...queue, newItem]);
        setTextInput('');
      });
  };

  const handleFileUpload = () => {
    if (!fileInput) return;
    const formData = new FormData();
    formData.append('image', fileInput);

    fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(newItem => {
        setQueue([...queue, newItem]);
        setFileInput(null);
        // Reset file input value manually if needed
        document.getElementById('file-upload').value = '';
      });
  };

  const handleDelete = (id) => {
    fetch(`${API_URL}/content/${id}`, { method: 'DELETE' })
      .then(() => {
        setQueue(queue.filter(item => item.id !== id));
      });
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <div className={`app-container ${isFullScreen ? 'full-screen-mode' : ''}`}>
      {!isFullScreen && (
        <header>
          <h1>Flipdot Display Simulator</h1>
          <div className="header-controls">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{ backgroundColor: isPlaying ? '#dc3545' : '#28a745' }}
            >
              {isPlaying ? 'Stop' : 'Start'}
            </button>
            <button onClick={toggleFullScreen}>Full Screen Mode</button>
          </div>
        </header>
      )}

      <main>
        <div className="display-section">
          <DisplayGrid
            rows={settings.resolution.rows}
            cols={settings.resolution.cols}
            data={currentGrid}
            colorFront={settings.colors.front}
            colorBack={settings.colors.back}
            columnDelay={settings.timing.columnDelay}
          />
        </div>

        {!isFullScreen && (
          <div className="admin-panel">
            <div className="panel-section">
              <h2>Settings</h2>
              <div className="control-group">
                <label>Rows</label>
                <input
                  type="number"
                  value={settings.resolution.rows}
                  onChange={(e) => handleSettingsChange('resolution', 'rows', parseInt(e.target.value))}
                />
                <label>Cols</label>
                <input
                  type="number"
                  value={settings.resolution.cols}
                  onChange={(e) => handleSettingsChange('resolution', 'cols', parseInt(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Front Color</label>
                <input
                  type="color"
                  value={settings.colors.front}
                  onChange={(e) => handleSettingsChange('colors', 'front', e.target.value)}
                />
                <label>Back Color</label>
                <input
                  type="color"
                  value={settings.colors.back}
                  onChange={(e) => handleSettingsChange('colors', 'back', e.target.value)}
                />
              </div>
              <div className="control-group">
                <label>Column Delay (ms)</label>
                <input
                  type="number"
                  value={settings.timing.columnDelay}
                  onChange={(e) => handleSettingsChange('timing', 'columnDelay', parseInt(e.target.value))}
                />
                <label>Slide Duration (ms)</label>
                <input
                  type="number"
                  value={settings.timing.slideDuration}
                  onChange={(e) => handleSettingsChange('timing', 'slideDuration', parseInt(e.target.value))}
                />
              </div>
              <button onClick={saveSettings}>Save Settings</button>
            </div>

            <div className="panel-section">
              <h2>Content Manager</h2>
              <div className="add-content">
                <div className="input-row">
                  <input
                    type="text"
                    placeholder="Enter text..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  />
                  <button onClick={handleAddText}>Add Text</button>
                </div>
                <div className="input-row">
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFileInput(e.target.files[0])}
                  />
                  <button onClick={handleFileUpload}>Upload Image</button>
                </div>
              </div>

              <div className="queue-list">
                <h3>Queue</h3>
                <ul>
                  {queue.map((item, index) => (
                    <li key={item.id} className={index === currentIndex ? 'active' : ''}>
                      <span>{item.type === 'text' ? item.content : item.originalName}</span>
                      <button onClick={() => handleDelete(item.id)}>X</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
