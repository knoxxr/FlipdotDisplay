import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import CanvasDisplay from './components/CanvasDisplay';
import { processImage } from './utils/imageProcessing';
import { processText } from './utils/textProcessing';
import { soundManager } from './utils/SoundManager';
import './App.css';

const API_URL = '/api';

function App() {
  const [settings, setSettings] = useState({
    resolution: { rows: 25, cols: 80 },
    colors: { front: '#FFFF00', back: '#000000' },
    timing: { flipDuration: 300, columnDelay: 100, flipDurationVariance: 20 },
    animationDirection: 'left-right',
    soundType: 'default',
    dotShape: 'circle' // 'circle' or 'square'
  });

  const [queue, setQueue] = useState([]);
  const [currentGrid, setCurrentGrid] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Admin inputs
  const [textInput, setTextInput] = useState('');
  const [fileInput, setFileInput] = useState(null);

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPinchHint, setShowPinchHint] = useState(false);

  // Pinch zoom state management
  const touchStateRef = useRef({
    initialDistance: 0,
    currentDistance: 0,
    isPinching: false,
    startTime: 0
  });

  // Calculate distance between two touch points
  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch start for pinch detection
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      touchStateRef.current = {
        initialDistance: distance,
        currentDistance: distance,
        isPinching: true,
        startTime: Date.now()
      };
    }
  }, []);

  // Handle touch move for pinch detection
  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && touchStateRef.current.isPinching) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      touchStateRef.current.currentDistance = distance;

      // Prevent default zoom behavior
      e.preventDefault();
    }
  }, []);

  // Handle touch end for pinch gesture completion
  const handleTouchEnd = useCallback((e) => {
    if (touchStateRef.current.isPinching && e.touches.length < 2) {
      const { initialDistance, currentDistance, startTime } = touchStateRef.current;
      const distanceChange = currentDistance - initialDistance;
      const duration = Date.now() - startTime;

      // Threshold: at least 50px change and gesture completed within 1 second
      const DISTANCE_THRESHOLD = 50;
      const TIME_THRESHOLD = 1000;

      if (Math.abs(distanceChange) > DISTANCE_THRESHOLD && duration < TIME_THRESHOLD) {
        if (distanceChange > 0) {
          // Pinch out (zoom in) - enter fullscreen
          if (!isFullScreen) {
            setIsFullScreen(true);
            setShowPinchHint(true);
            setTimeout(() => setShowPinchHint(false), 3000);
          }
        } else {
          // Pinch in (zoom out) - exit fullscreen
          if (isFullScreen) {
            setIsFullScreen(false);
            setShowPinchHint(true);
            setTimeout(() => setShowPinchHint(false), 3000);
          }
        }
      }

      // Reset touch state
      touchStateRef.current = {
        initialDistance: 0,
        currentDistance: 0,
        isPinching: false,
        startTime: 0
      };
    }
  }, [isFullScreen]);

  // Add touch event listeners
  useEffect(() => {
    const displaySection = document.querySelector('.display-section');
    if (displaySection) {
      displaySection.addEventListener('touchstart', handleTouchStart, { passive: false });
      displaySection.addEventListener('touchmove', handleTouchMove, { passive: false });
      displaySection.addEventListener('touchend', handleTouchEnd, { passive: false });

      return () => {
        displaySection.removeEventListener('touchstart', handleTouchStart);
        displaySection.removeEventListener('touchmove', handleTouchMove);
        displaySection.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Fetch initial data
  useEffect(() => {
    fetch(`${API_URL}/settings`)
      .then(res => res.json())
      .then(data => {
        // Ensure new structure if old data exists
        if (!data.timing || !data.timing.columnDelay || data.timing.flipDurationVariance === undefined) {
          data.timing = {
            flipDuration: data.timing?.flipDuration || 300,
            columnDelay: data.timing?.columnDelay || 100,
            flipDurationVariance: data.timing?.flipDurationVariance !== undefined ? data.timing.flipDurationVariance : 20
          };
        }
        // Init dotShape if missing
        if (!data.dotShape) {
          data.dotShape = 'circle';
        }
        setSettings(data);
      });

    fetch(`${API_URL}/content`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setQueue(data);
        } else {
          // If empty, add sample text
          setQueue([
            { id: 'sample-1', type: 'text', content: 'Hello' },
            { id: 'sample-2', type: 'text', content: 'This is' },
            { id: 'sample-3', type: 'text', content: 'Flip Dot Banner' }
          ]);
        }
        // Auto-start playback
        setIsPlaying(true);
      });
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
        // Use the content URL directly (it's already a full URL from Blob Storage or server)
        grid = await processImage(item.content, settings.resolution.rows, settings.resolution.cols);
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
          // Use the content URL directly (it's already a full URL from Blob Storage or server)
          grid = await processImage(item.content, settings.resolution.rows, settings.resolution.cols);
        }
        setCurrentGrid(grid);
      } catch (err) {
        console.error("Error processing content", err);
      }

      // Calculate duration
      const rows = settings.resolution.rows;
      const cols = settings.resolution.cols;
      const columnDelay = settings.timing.columnDelay || 100;
      const flipDuration = settings.timing.flipDuration || 300;
      const maxDelay = ((cols - 1) + (rows - 1) * 2) * columnDelay;
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
  }, [queue, currentIndex, settings.resolution.rows, settings.resolution.cols, settings.timing.columnDelay, settings.timing.flipDuration, isPlaying, startTimer, setPlaybackSettings, settings]);

  const displaySettings = settings;

  // Handlers
  const handleSettingsChange = (section, key, value) => {
    let newSettings;
    if (section === 'root') {
      newSettings = {
        ...settings,
        [key]: value
      };
    } else {
      newSettings = {
        ...settings,
        [section]: {
          ...settings[section],
          [key]: value
        }
      };
    }
    setSettings(newSettings);

    // Auto-save settings to server
    fetch(`${API_URL}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings)
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

  const handleDeleteAll = () => {
    if (window.confirm('Are you sure you want to delete all contents?')) {
      fetch(`${API_URL}/content`, { method: 'DELETE' })
        .then(() => {
          setQueue([]);
          // Also reset the grid if stopped
          if (!isPlaying) {
            setCurrentGrid([]);
          }
        });
    }
  };

  const handleReorder = (result) => {
    if (!result.destination) return;

    const items = Array.from(queue);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setQueue(items);

    // Save to server
    fetch(`${API_URL}/content/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queue: items })
    });
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Handle ESC key to exit full screen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  return (
    <div className={`app-container ${isFullScreen ? 'full-screen-mode' : ''}`}>
      {!isFullScreen && (
        <header>
          <button
            className="back-btn"
            onClick={() => window.location.href = '/'}
            title="Return to Portal"
          >
            ← Back to Kimserv
          </button>
          <h1>Flipdot Display Banner</h1>
          <div className="header-controls">
            <button
              onClick={() => {
                soundManager.resume();
                if (isPlaying) {
                  // Stopping - reset grid to blank
                  setCurrentGrid([]);
                }
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
            columnDelay={displaySettings.timing.columnDelay || 100}
            flipDuration={displaySettings.timing.flipDuration || 300}
            flipDurationVariance={displaySettings.timing.flipDurationVariance !== undefined ? displaySettings.timing.flipDurationVariance : 20}
            isPlaying={isPlaying}
            animationDirection={displaySettings.animationDirection || 'left-right'}
            soundType={displaySettings.soundType || 'default'}
            dotShape={displaySettings.dotShape || 'circle'}
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
                  disabled={isPlaying}
                />
                <label>Back Color</label>
                <input
                  type="color"
                  value={settings.colors.back}
                  onChange={(e) => handleSettingsChange('colors', 'back', e.target.value)}
                  disabled={isPlaying}
                />
              </div>
              <div className="control-group">
                <label>Flip Duration (ms)</label>
                <input
                  type="number"
                  value={settings.timing.flipDuration}
                  onChange={(e) => handleSettingsChange('timing', 'flipDuration', parseInt(e.target.value))}
                  disabled={isPlaying}
                />
              </div>
              <div className="control-group">
                <label>Column Delay (ms)</label>
                <input
                  type="number"
                  value={settings.timing.columnDelay}
                  onChange={(e) => handleSettingsChange('timing', 'columnDelay', parseInt(e.target.value))}
                  disabled={isPlaying}
                />
              </div>
              <div className="control-group">
                <label>Duration Variance ({settings.timing.flipDurationVariance}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.timing.flipDurationVariance}
                  onChange={(e) => handleSettingsChange('timing', 'flipDurationVariance', parseInt(e.target.value))}
                  disabled={isPlaying}
                />
              </div>
              <div className="control-group">
                <label>Animation Direction</label>
                <select
                  value={settings.animationDirection}
                  onChange={(e) => handleSettingsChange('root', 'animationDirection', e.target.value)}
                  disabled={isPlaying}
                >
                  <option value="left-right">Left → Right</option>
                  <option value="right-left">Right → Left</option>
                  <option value="top-bottom">Top → Bottom</option>
                  <option value="bottom-top">Bottom → Top</option>
                </select>
              </div>
              <div className="control-group">
                <label>Dot Shape</label>
                <select
                  value={settings.dotShape || 'circle'}
                  onChange={(e) => handleSettingsChange('root', 'dotShape', e.target.value)}
                  disabled={isPlaying}
                >
                  <option value="circle">Circle (Realistic)</option>
                  <option value="square">Square (Classic)</option>
                </select>
              </div>
              <div className="control-group">
                <label>Sound Type</label>
                <select
                  value={settings.soundType}
                  onChange={(e) => handleSettingsChange('root', 'soundType', e.target.value)}
                  disabled={isPlaying}
                >
                  <option value="default">Default (High)</option>
                  <option value="deep">Deep (Bass)</option>
                  <option value="metallic">Metallic</option>
                  <option value="soft">Soft (Muted)</option>
                  <option value="sharp">Sharp (Crisp)</option>
                </select>
              </div>
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
                    onKeyDown={(e) => e.key === 'Enter' && !isPlaying && handleAddText()}
                    disabled={isPlaying}
                  />
                  <button onClick={handleAddText} disabled={isPlaying}>Add Text</button>
                </div>
                <div className="input-row">
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFileInput(e.target.files[0])}
                    disabled={isPlaying}
                  />
                  <button onClick={handleFileUpload} disabled={isPlaying}>Upload Image</button>
                </div>
              </div>

              <div className="queue-list">
                <div className="queue-header">
                  <h3>Queue</h3>
                  <button onClick={handleDeleteAll} disabled={isPlaying} className="delete-all-btn">Delete All Contents</button>
                </div>
                <DragDropContext onDragEnd={handleReorder}>
                  <Droppable droppableId="queue" isDropDisabled={isPlaying}>
                    {(provided, snapshot) => (
                      <ul
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={snapshot.isDraggingOver ? 'dragging-over' : ''}
                      >
                        {queue.map((item, index) => (
                          <Draggable
                            key={item.id}
                            draggableId={item.id}
                            index={index}
                            isDragDisabled={isPlaying}
                          >
                            {(provided, snapshot) => (
                              <li
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`${index === currentIndex ? 'active' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
                              >
                                <span
                                  {...provided.dragHandleProps}
                                  className="drag-handle"
                                  title={isPlaying ? 'Stop playback to reorder' : 'Drag to reorder'}
                                >
                                  ⋮⋮
                                </span>
                                <span className="queue-item-content">{item.type === 'text' ? item.content : item.originalName}</span>
                                <button onClick={() => handleDelete(item.id)} disabled={isPlaying}>X</button>
                              </li>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </ul>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Pinch zoom hint overlay */}
      {showPinchHint && (
        <div className="pinch-hint">
          {isFullScreen ? 'Pinch to zoom out to exit fullscreen' : 'Pinch to zoom in to enter fullscreen'}
        </div>
      )}
    </div>
  );
}

export default App;
