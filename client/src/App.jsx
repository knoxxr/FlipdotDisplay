import React, { useState, useEffect, useCallback, useRef } from 'react';
import CanvasDisplay from './components/CanvasDisplay';
import { processImage } from './utils/imageProcessing';
import { processText } from './utils/textProcessing';
import { soundManager } from './utils/SoundManager';
import './App.css';

const API_URL = '/api';

function App() {
  const [settings, setSettings] = useState({
    resolution: { rows: 30, cols: 60 },
    colors: { front: '#000000', back: '#FFFFFF' },
    timing: { flipTime: 50 }
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
      .then(data => {
        // Ensure new structure if old data exists
        if (!data.timing.flipTime) {
          data.timing = { flipTime: 50 };
        }
        setSettings(data);
      });

    fetch(`${API_URL}/content`)
      .then(res => res.json())
      .then(data => setQueue(data));
  }, []);

  const [playbackSettings, setPlaybackSettings] = useState(settings);

  // Helper to update grid based on current item and settings
  const updateGrid = useCallback(async () => {
    if (queue.length === 0) return;

    const item = queue[currentIndex];
    let grid = [];

    // Use current settings. If playing, we might want playbackSettings, 
    // but this function is mainly for the "update" trigger.
    // When playing, the cycle effect handles timing.
    // When stopped (changing resolution), we use 'settings'.
    // Let's use the 'displaySettings' logic implicitly by using 'settings' 
    // because resolution change is only allowed when stopped.

    try {
      if (item.type === 'text') {
        grid = processText(item.content, settings.resolution.rows, settings.resolution.cols);
      } else if (item.type === 'image') {
        const imageUrl = `http://localhost:3001${item.content}`;
        grid = await processImage(imageUrl, settings.resolution.rows, settings.resolution.cols);
      }
      setCurrentGrid(grid);
    } catch (err) {
      console.error("Error processing content", err);
    }
  }, [queue, currentIndex, settings.resolution.rows, settings.resolution.cols]);

  // Effect to update grid when resolution changes (only when stopped)
  useEffect(() => {
    if (!isPlaying) {
      updateGrid();
    }
  }, [settings.resolution.rows, settings.resolution.cols, isPlaying, updateGrid]);

  // Timer refs for pause/resume
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const remainingTimeRef = useRef(0);
  const totalDurationRef = useRef(0);

  // Helper to start/resume the timer
  const startTimer = useCallback((duration) => {
    startTimeRef.current = Date.now();
    totalDurationRef.current = duration;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % queue.length);
      remainingTimeRef.current = 0; // Reset for next
    }, duration);
  }, [queue.length]);

  // Helper to pause the timer
  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, totalDurationRef.current - elapsed);
  }, []);

  // Effect to handle Play/Pause
  useEffect(() => {
    if (isPlaying) {
      // Resume
      if (remainingTimeRef.current > 0) {
        startTimer(remainingTimeRef.current);
      } else {
        // If no remaining time (initial start or fresh), trigger updateGrid which will start timer
        // But wait, updateGrid is called by the queue change effect.
        // If we just toggled isPlaying, queue/index didn't change.
        // So we need to kickstart if we are "stuck"
        if (queue.length > 0) {
          // If we are resuming a fresh start (remaining == 0 but we have content)
          // We might need to recalculate duration if it wasn't set?
          // Actually, if remaining is 0, it means we finished or haven't started.
          // If we haven't started, updateGrid below will handle it?
          // Let's rely on the queue/index effect for new slides, 
          // and this effect ONLY for resuming an interrupted slide.

          // However, if we paused, remainingTimeRef should be > 0.
          // If it is 0, maybe we just loaded?
        }
      }
    } else {
      // Pause
      pauseTimer();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, startTimer, pauseTimer]);

  // Effect to update grid and start timer when content changes
  useEffect(() => {
    if (queue.length === 0) return;

    // If we are paused, just update the grid but don't start timer?
    // Or do we start timer and let the isPlaying effect pause it?
    // Better: Only start timer if playing.

    const setupSlide = async () => {
      const item = queue[currentIndex];
      let grid = [];

      // Lock settings if playing (or just use current)
      if (isPlaying) setPlaybackSettings(settings);

      try {
        if (item.type === 'text') {
          grid = processText(item.content, settings.resolution.rows, settings.resolution.cols);
        } else if (item.type === 'image') {
          const imageUrl = `http://localhost:3001${item.content}`;
          grid = await processImage(imageUrl, settings.resolution.rows, settings.resolution.cols);
        }
        setCurrentGrid(grid);
      } catch (err) {
        console.error("Error processing content", err);
      }

      // Calculate duration
      const rows = settings.resolution.rows;
      const cols = settings.resolution.cols;
      const flipTime = settings.timing.flipTime;
      const flipDuration = 300;
      const maxDelay = ((cols - 1) + (rows - 1) * 2) * flipTime;
      const totalAnimationTime = maxDelay + flipDuration;
      const HOLD_TIME = 2000;

      const fullDuration = totalAnimationTime + HOLD_TIME;

      // Set remaining time to full duration for this new slide
      remainingTimeRef.current = fullDuration;

      if (isPlaying) {
        startTimer(fullDuration);
      }
    };

    setupSlide();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [queue, currentIndex, settings.resolution.rows, settings.resolution.cols, settings.timing.flipTime, isPlaying, startTimer, setPlaybackSettings, settings]); // Removed isPlaying from dependency to avoid reset on toggle

  // ... (handlers)

  // Determine which settings to pass to display
  const displaySettings = isPlaying ? playbackSettings : settings;

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
              onClick={() => {
                soundManager.resume();
                setIsPlaying(!isPlaying);
              }}
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
          <CanvasDisplay
            rows={displaySettings.resolution.rows}
            cols={displaySettings.resolution.cols}
            data={currentGrid}
            colorFront={displaySettings.colors.front}
            colorBack={displaySettings.colors.back}
            columnDelay={displaySettings.timing.flipTime}
            flipDuration={300}
            isPlaying={isPlaying}
          />
          {isFullScreen && (
            <button className="exit-fullscreen-btn" onClick={toggleFullScreen}>
              Exit Full Screen
            </button>
          )}
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
                  disabled={isPlaying}
                />
                <label>Cols</label>
                <input
                  type="number"
                  value={settings.resolution.cols}
                  onChange={(e) => handleSettingsChange('resolution', 'cols', parseInt(e.target.value))}
                  disabled={isPlaying}
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
                <label>Flip Time (ms)</label>
                <input
                  type="number"
                  value={settings.timing.flipTime}
                  onChange={(e) => handleSettingsChange('timing', 'flipTime', parseInt(e.target.value))}
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
                    onKeyDown={(e) => e.key === 'Enter' && handleAddText()}
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
