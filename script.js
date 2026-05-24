// video-kamo.js
// Custom video player web component with no header, scrollable mobile settings, and smooth auto-hide controls
// Usage: <video-kamo src="video.mp4" poster="image.jpg" autoplay muted loop></video-kamo>

class VideoKamo extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.videoSrc = '';
    this.posterSrc = '';
    this.videoTitle = '';
    this.autoplay = false;
    this.muted = false;
    this.loop = false;
    this.isSeeking = false;
    this.isLongPressActive = false;
    this.longPressTimer = null;
    this.clickTimer = null;
    this.pendingClick = false;
    this.retryCount = 0;
    this.currentVolume = 1;
    this.controlsHidden = false;
    this.hideControlsTimeout = null;
    this.playbackRates = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    this.aspectModes = [
      { fit: 'contain', name: 'Original' },
      { fit: 'cover', name: 'Fill' },
      { fit: 'fill', name: 'Stretch' }
    ];
    this.currentAspectMode = 0;
    this.isMobile = window.innerWidth <= 650;

    this.initTemplate();
    this.bindEvents();

    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth <= 650;
      this.updateMobileLayout();
    });
  }

  static get observedAttributes() {
    return ['src', 'poster', 'title', 'autoplay', 'muted', 'loop', 'controls', 'width', 'height'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'src' && newValue) {
      this.videoSrc = newValue;
      if (this.videoElement) {
        this.videoElement.src = newValue;
        this.videoElement.load();
      }
    }
    if (name === 'poster' && newValue) {
      this.posterSrc = newValue;
      if (this.videoElement) this.videoElement.poster = newValue;
    }
    if (name === 'autoplay') this.autoplay = newValue !== null;
    if (name === 'muted') this.muted = newValue !== null;
    if (name === 'loop') this.loop = newValue !== null;
  }

  updateMobileLayout() {
    const controlsRight = this.shadowRoot.querySelector('.controls-right');
    const desktopGroups = this.shadowRoot.querySelectorAll('.desktop-only');
    const mobileGroup = this.shadowRoot.querySelector('.mobile-settings-wrapper');

    if (this.isMobile) {
      desktopGroups.forEach(el => el.style.display = 'none');
      if (mobileGroup) mobileGroup.style.display = 'block';
      if (controlsRight) controlsRight.style.gap = '4px';
    } else {
      desktopGroups.forEach(el => el.style.display = 'flex');
      if (mobileGroup) mobileGroup.style.display = 'none';
      if (controlsRight) controlsRight.style.gap = '8px';
    }
  }

  showControls() {
    const controlsSection = this.shadowRoot.querySelector('.controls-section');
    if (controlsSection) {
      controlsSection.style.opacity = '1';
      controlsSection.style.transform = 'translateY(0)';
      this.controlsHidden = false;
    }
    this.resetHideControlsTimeout();
  }

  hideControls() {
    if (!this.videoElement.paused && !this.isSeeking && !document.fullscreenElement) {
      const controlsSection = this.shadowRoot.querySelector('.controls-section');
      if (controlsSection) {
        controlsSection.style.opacity = '0';
        controlsSection.style.transform = 'translateY(100%)';
        this.controlsHidden = true;
      }
    }
  }

  resetHideControlsTimeout() {
    if (this.hideControlsTimeout) clearTimeout(this.hideControlsTimeout);
    this.hideControlsTimeout = setTimeout(() => this.hideControls(), 2000);
  }

  initTemplate() {
    this.shadowRoot.innerHTML = `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
          -webkit-user-select: none;
        }

        :host {
          display: block;
          position: relative;
          width: 100%;
          max-width: ${this.getAttribute('width') || '100%'};
          height: ${this.getAttribute('height') || 'auto'};
          background: #000;
          border-radius: 2px;
          font-family: 'Segoe UI', Roboto, system-ui, -apple-system, 'Helvetica Neue', sans-serif;
          overflow: hidden;
          box-shadow: 0 20px 35px -12px rgba(0, 0, 0, 0.5);
        }

        .player-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          background: #000;
          border-radius: 2px;
          position: relative;
        }

        .video-section {
          height: 100%;
          width: 100%;
          background: #000;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-wrapper {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        #mainVideo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: object-fit 0.2s ease;
        }

        .controls-section {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 56px;
          background: rgba(22, 27, 38, 0.95);
          backdrop-filter: blur(12px);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 20;
          transition: opacity 0.25s ease, transform 0.25s ease;
          transform: translateY(0);
          opacity: 1;
        }

        .controls-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .controls-center {
          flex: 8;
          min-width: 0;
        }

        .controls-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .ctrl-btn {
          background: transparent;
          border: none;
          color: #e0e0e0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          padding: 8px;
          border-radius: 2px;
          transition: all 0.15s ease;
          min-width: 36px;
        }

        .ctrl-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
        }

        #timerLabel {
          font-size: 0.72rem;
          color: #aaa;
          font-family: monospace;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .timeline-container {
          width: 100%;
          cursor: pointer;
          display: flex;
          align-items: center;
          position: relative;
          height: 100%;
        }

        .timeline-track {
          width: 100%;
          height: 5px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          position: relative;
          transition: height 0.1s;
        }

        .timeline-track:hover {
          height: 7px;
        }

        .buffer-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 2px;
          width: 0%;
          pointer-events: none;
        }

        .progress-fill {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: #f03e3e;
          background: linear-gradient(90deg, #f03e3e, #ff6b6b);
          border-radius: 2px;
          width: 0%;
          pointer-events: none;
          box-shadow: 0 0 3px rgba(240, 62, 62, 0.5);
        }

        .dropdown {
          position: relative;
          display: inline-block;
        }

        .dropdown-btn {
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          padding: 6px 12px;
          color: #e0e0e0;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .dropdown-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }

        .dropdown-content {
          position: absolute;
          bottom: 45px;
          right: 0;
          background: #1a1f2e;
          backdrop-filter: blur(10px);
          border-radius: 2px;
          min-width: 120px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          opacity: 0;
          visibility: hidden;
          transition: all 0.15s ease;
          z-index: 50;
          overflow: hidden;
        }

        .dropdown-content.show {
          opacity: 1;
          visibility: visible;
        }

        .dropdown-content button {
          display: block;
          width: 100%;
          padding: 10px 16px;
          background: transparent;
          border: none;
          color: #ddd;
          font-size: 0.75rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.1s;
          white-space: nowrap;
        }

        .dropdown-content button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .dropdown-content button.active {
          color: #f03e3e;
          font-weight: bold;
        }

        .volume-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .volume-percent {
          font-size: 0.65rem;
          color: #aaa;
          min-width: 38px;
          text-align: center;
          font-family: monospace;
        }

        .volume-slider {
          width: 65px;
          height: 4px;
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 2px;
          outline: none;
        }

        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          background: #f03e3e;
          border-radius: 2px;
          cursor: pointer;
        }

        .preview-box {
          position: absolute;
          bottom: 42px;
          left: 50%;
          transform: translateX(-50%);
          background: #0f1219;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
          opacity: 0;
          transition: opacity 0.12s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 130px;
          z-index: 30;
          pointer-events: none;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
        }

        .preview-canvas {
          width: 130px;
          height: 73px;
          background: #000;
          display: block;
        }

        .preview-time {
          font-size: 0.7rem;
          color: #ddd;
          padding: 4px 0;
          background: #121620;
          width: 100%;
          text-align: center;
          font-family: monospace;
        }

        /* Mobile specific styles */
        @media (max-width: 650px) {
          .controls-section {
            padding: 0 8px;
            gap: 6px;
            height: 52px;
          }
          .controls-left {
            gap: 8px;
            flex-shrink: 1;
          }
          .controls-center {
            flex: 12;
          }
          .controls-right {
            gap: 4px;
            flex-shrink: 1;
          }
          .ctrl-btn {
            min-width: 32px;
            padding: 5px;
          }
          #timerLabel {
            font-size: 0.62rem;
          }
          .preview-box {
            width: 90px;
          }
          .preview-canvas {
            width: 90px;
            height: 50px;
          }
          
          .desktop-only {
            display: none !important;
          }
        }

        @media (min-width: 651px) {
          .mobile-settings-wrapper {
            display: none !important;
          }
          .desktop-only {
            display: flex !important;
          }
        }

        /* Mobile Settings Button and Dropdown */
        .mobile-settings-wrapper {
          position: relative;
        }
        
        .mobile-settings-btn {
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          padding: 6px 10px;
          color: #e0e0e0;
          font-size: 0.65rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .mobile-settings-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 100;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s ease;
        }
        
        .mobile-settings-overlay.show {
          opacity: 1;
          visibility: visible;
        }
        
        .mobile-settings-panel {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #1a1f2e;
          backdrop-filter: blur(20px);
          border-radius: 2px 2px 0 0;
          max-height: 70vh;
          overflow-y: auto;
          z-index: 101;
          transform: translateY(100%);
          transition: transform 0.25s ease;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .mobile-settings-panel.show {
          transform: translateY(0);
        }
        
        .mobile-settings-header {
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .mobile-settings-header h3 {
          color: white;
          font-size: 1rem;
          font-weight: 600;
        }
        
        .mobile-settings-close {
          background: transparent;
          border: none;
          color: #aaa;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 4px 8px;
        }
        
        .mobile-setting-item {
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .mobile-setting-label {
          font-size: 0.75rem;
          color: #888;
          margin-bottom: 12px;
          display: block;
          font-weight: 500;
        }
        
        .mobile-setting-options {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        
        .mobile-setting-option {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          padding: 8px 16px;
          border-radius: 2px;
          color: #ddd;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.1s;
        }
        
        .mobile-setting-option.active {
          background: #f03e3e;
          color: white;
        }
        
        .mobile-volume-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .mobile-volume-row input {
          flex: 1;
          height: 4px;
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 2px;
        }
        
        .mobile-volume-row input::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          background: #f03e3e;
          border-radius: 2px;
          cursor: pointer;
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 25;
          pointer-events: none;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255, 255, 255, 0.15);
          border-top: 3px solid #f03e3e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .play-hud {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.9);
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          color: white;
          padding: 12px 24px;
          border-radius: 2px;
          font-size: 1rem;
          font-weight: 600;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s ease;
          z-index: 20;
          white-space: nowrap;
        }

        .toast-message {
          position: absolute;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          color: #f03e3e;
          padding: 6px 14px;
          border-radius: 2px;
          font-size: 0.75rem;
          font-weight: 500;
          z-index: 35;
          opacity: 0;
          transition: opacity 0.1s;
          pointer-events: none;
          white-space: nowrap;
        }

        .seek-toast {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          color: white;
          padding: 8px 16px;
          border-radius: 2px;
          font-size: 0.8rem;
          font-weight: 600;
          z-index: 35;
          opacity: 0;
          transition: opacity 0.1s;
          pointer-events: none;
          white-space: nowrap;
        }

        .current-second {
          font-size: 0.65rem;
          color: #f03e3e;
          background: rgba(0,0,0,0.6);
          padding: 2px 6px;
          border-radius: 2px;
          font-family: monospace;
          position: absolute;
          bottom: 65px;
          right: 12px;
          z-index: 15;
          pointer-events: none;
        }
      </style>

      <div class="player-container">
        <div class="video-section">
          <div class="video-wrapper" id="videoWrapper">
            <video id="mainVideo" preload="auto" playsinline></video>
          </div>
          <div class="play-hud" id="hudOverlay">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
          <div id="loadingOverlay" class="loading-overlay">
            <div class="spinner"></div>
          </div>
          <div id="toastMsg" class="toast-message"></div>
          <div id="seekToast" class="seek-toast"></div>
          <div id="currentSecond" class="current-second">0s</div>
        </div>

        <div class="controls-section" id="controlsPanel">
          <div class="controls-left">
            <button class="ctrl-btn" id="playBtn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </button>
            <div id="timerLabel">0:00:00 / 0:00:00</div>
          </div>

          <div class="controls-center">
            <div class="timeline-container" id="timelineContainer">
              <div class="preview-box" id="previewBox">
                <canvas id="previewCanvas" class="preview-canvas" width="260" height="146"></canvas>
                <div id="previewTime" class="preview-time">0:00:00</div>
              </div>
              <div class="timeline-track">
                <div class="buffer-fill" id="bufferFill"></div>
                <div class="progress-fill" id="progressFillMain"></div>
              </div>
            </div>
          </div>

          <div class="controls-right">
            <div class="dropdown desktop-only">
              <button class="dropdown-btn" id="volumeDropdownBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display: inline; margin-right: 4px;">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
                Vol
              </button>
              <div class="dropdown-content" id="volumeDropdown">
                <div class="volume-container" style="padding: 10px 12px;">
                  <input type="range" id="volumeSlider" min="0" max="1" step="0.02" value="1" style="flex: 1;">
                  <span id="volumePercent" class="volume-percent">100%</span>
                </div>
              </div>
            </div>

            <div class="dropdown desktop-only">
              <button class="dropdown-btn" id="qualityDropdownBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display: inline; margin-right: 4px;">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" fill="none" stroke-width="1.5"/>
                  <line x1="8" y1="4" x2="8" y2="20" stroke="currentColor" stroke-width="1"/>
                </svg>
                Size
              </button>
              <div class="dropdown-content" id="qualityDropdown">
                <button data-aspect="contain">Original</button>
                <button data-aspect="cover">Fill</button>
                <button data-aspect="fill">Stretch</button>
              </div>
            </div>

            <div class="dropdown desktop-only">
              <button class="dropdown-btn" id="speedDropdownBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display: inline; margin-right: 4px;">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" stroke-width="1.5"/>
                  <polyline points="12,6 12,12 16,14" stroke="currentColor" fill="none" stroke-width="1.5"/>
                </svg>
                1.0x
              </button>
              <div class="dropdown-content" id="speedDropdown">
                <button data-speed="0.5">0.5x</button>
                <button data-speed="0.75">0.75x</button>
                <button data-speed="1.0" class="active">1.0x</button>
                <button data-speed="1.25">1.25x</button>
                <button data-speed="1.5">1.5x</button>
                <button data-speed="2.0">2.0x</button>
              </div>
            </div>

            <div class="mobile-settings-wrapper">
              <button class="mobile-settings-btn" id="mobileSettingsBtn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="12" cy="4" r="2" />
                  <circle cx="12" cy="20" r="2" />
                </svg>
                Settings
              </button>
            </div>

            <button class="ctrl-btn" id="fullscreenBtn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M8 3H5C3.89543 3 3 3.89543 3 5V8M21 8V5C21 3.89543 20.1046 3 19 3H16M16 21H19C20.1046 21 21 20.1046 21 19V16M3 16V19C3 20.1046 3.89543 21 5 21H8"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Settings Overlay and Panel -->
      <div class="mobile-settings-overlay" id="mobileSettingsOverlay"></div>
      <div class="mobile-settings-panel" id="mobileSettingsPanel">
        <div class="mobile-settings-header">
          <h3>Settings</h3>
          <button class="mobile-settings-close" id="mobileSettingsClose">✕</button>
        </div>
        <div class="mobile-setting-item">
          <span class="mobile-setting-label">Volume</span>
          <div class="mobile-volume-row">
            <input type="range" id="mobileVolumeSlider" min="0" max="1" step="0.02" value="1">
            <span id="mobileVolumePercent" class="volume-percent">100%</span>
          </div>
        </div>
        <div class="mobile-setting-item">
          <span class="mobile-setting-label">Aspect Ratio</span>
          <div class="mobile-setting-options" id="mobileAspectOptions">
            <button data-aspect="contain" class="mobile-setting-option active">Original</button>
            <button data-aspect="cover" class="mobile-setting-option">Fill</button>
            <button data-aspect="fill" class="mobile-setting-option">Stretch</button>
          </div>
        </div>
        <div class="mobile-setting-item">
          <span class="mobile-setting-label">Playback Speed</span>
          <div class="mobile-setting-options" id="mobileSpeedOptions">
            <button data-speed="0.5" class="mobile-setting-option">0.5x</button>
            <button data-speed="0.75" class="mobile-setting-option">0.75x</button>
            <button data-speed="1.0" class="mobile-setting-option active">1.0x</button>
            <button data-speed="1.25" class="mobile-setting-option">1.25x</button>
            <button data-speed="1.5" class="mobile-setting-option">1.5x</button>
            <button data-speed="2.0" class="mobile-setting-option">2.0x</button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    this.videoElement = this.shadowRoot.getElementById('mainVideo');
    this.videoWrapper = this.shadowRoot.getElementById('videoWrapper');
    this.timelineContainer = this.shadowRoot.getElementById('timelineContainer');
    this.progressFill = this.shadowRoot.getElementById('progressFillMain');
    this.bufferFill = this.shadowRoot.getElementById('bufferFill');
    this.playBtn = this.shadowRoot.getElementById('playBtn');
    this.timerLabel = this.shadowRoot.getElementById('timerLabel');
    this.volumeSlider = this.shadowRoot.getElementById('volumeSlider');
    this.volumePercent = this.shadowRoot.getElementById('volumePercent');
    this.previewCanvas = this.shadowRoot.getElementById('previewCanvas');
    this.previewTimeDiv = this.shadowRoot.getElementById('previewTime');
    this.previewBox = this.shadowRoot.getElementById('previewBox');
    this.hudOverlay = this.shadowRoot.getElementById('hudOverlay');
    this.loadingOverlay = this.shadowRoot.getElementById('loadingOverlay');
    this.toastMsg = this.shadowRoot.getElementById('toastMsg');
    this.seekToast = this.shadowRoot.getElementById('seekToast');
    this.fullscreenBtn = this.shadowRoot.getElementById('fullscreenBtn');
    this.currentSecondEl = this.shadowRoot.getElementById('currentSecond');
    this.controlsSection = this.shadowRoot.querySelector('.controls-section');

    this.mobileVolumeSlider = this.shadowRoot.getElementById('mobileVolumeSlider');
    this.mobileVolumePercent = this.shadowRoot.getElementById('mobileVolumePercent');
    this.mobileSettingsBtn = this.shadowRoot.getElementById('mobileSettingsBtn');
    this.mobileSettingsOverlay = this.shadowRoot.getElementById('mobileSettingsOverlay');
    this.mobileSettingsPanel = this.shadowRoot.getElementById('mobileSettingsPanel');
    this.mobileSettingsClose = this.shadowRoot.getElementById('mobileSettingsClose');

    if (this.videoSrc) this.videoElement.src = this.videoSrc;
    if (this.posterSrc) this.videoElement.poster = this.posterSrc;
    if (this.muted) this.videoElement.muted = true;
    if (this.loop) this.videoElement.loop = true;

    this.setupEventListeners();
    this.updateMobileLayout();
  }

  setupEventListeners() {
    this.videoElement.addEventListener('loadstart', () => this.showLoading(true));
    this.videoElement.addEventListener('canplay', () => this.showLoading(false));
    this.videoElement.addEventListener('canplaythrough', () => this.showLoading(false));
    this.videoElement.addEventListener('playing', () => this.showLoading(false));
    this.videoElement.addEventListener('waiting', () => this.showLoading(true));
    this.videoElement.addEventListener('error', () => this.handleVideoError());
    this.videoElement.addEventListener('timeupdate', () => this.updateTimeDisplay());
    this.videoElement.addEventListener('play', () => this.updatePlayButton(true));
    this.videoElement.addEventListener('pause', () => this.updatePlayButton(false));
    this.videoElement.addEventListener('loadedmetadata', () => this.onMetadataLoaded());

    this.playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlay();
    });

    this.videoWrapper.addEventListener('dblclick', () => this.toggleFullscreen());
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

    this.videoWrapper.addEventListener('click', (e) => this.handleVideoClick(e));

    this.setupTimelineEvents();
    this.setupDropdowns();
    this.setupVolumeControls();
    this.setupSpeedControls();
    this.setupAspectControls();
    this.setupMobileSettings();
    this.setupAutoHideControls();
    this.setupLongPressSpeed();

    this.updateProgressLoop();
  }

  setupMobileSettings() {
    const openSettings = () => {
      if (this.mobileSettingsOverlay && this.mobileSettingsPanel) {
        this.mobileSettingsOverlay.classList.add('show');
        this.mobileSettingsPanel.classList.add('show');
      }
    };

    const closeSettings = () => {
      if (this.mobileSettingsOverlay && this.mobileSettingsPanel) {
        this.mobileSettingsOverlay.classList.remove('show');
        this.mobileSettingsPanel.classList.remove('show');
      }
    };

    if (this.mobileSettingsBtn) {
      this.mobileSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSettings();
      });
    }

    if (this.mobileSettingsClose) {
      this.mobileSettingsClose.addEventListener('click', closeSettings);
    }

    if (this.mobileSettingsOverlay) {
      this.mobileSettingsOverlay.addEventListener('click', closeSettings);
    }

    if (this.mobileVolumeSlider && this.mobileVolumePercent) {
      this.mobileVolumeSlider.addEventListener('input', (e) => {
        this.currentVolume = parseFloat(e.target.value);
        this.videoElement.volume = this.currentVolume;
        this.videoElement.muted = false;
        this.mobileVolumePercent.innerText = `${Math.round(this.currentVolume * 100)}%`;
        if (this.volumeSlider) this.volumeSlider.value = this.currentVolume;
        if (this.volumePercent) this.volumePercent.innerText = `${Math.round(this.currentVolume * 100)}%`;
      });
    }

    const mobileAspectOptions = this.shadowRoot.querySelectorAll('#mobileAspectOptions .mobile-setting-option');
    mobileAspectOptions.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const aspect = btn.getAttribute('data-aspect');
        this.videoElement.style.objectFit = aspect;
        mobileAspectOptions.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    const mobileSpeedOptions = this.shadowRoot.querySelectorAll('#mobileSpeedOptions .mobile-setting-option');
    mobileSpeedOptions.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const speed = parseFloat(btn.getAttribute('data-speed'));
        this.videoElement.playbackRate = speed;
        mobileSpeedOptions.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const speedBtnText = this.shadowRoot.getElementById('speedDropdownBtn');
        if (speedBtnText) {
          speedBtnText.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display: inline; margin-right: 4px;"><circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" stroke-width="1.5"/><polyline points="12,6 12,12 16,14" stroke="currentColor" fill="none" stroke-width="1.5"/></svg>${speed}x`;
        }
        this.toastMsg.innerText = `${speed}x speed`;
        this.toastMsg.style.opacity = '1';
        setTimeout(() => { this.toastMsg.style.opacity = '0'; }, 1000);
      });
    });
  }

  showLoading(show) {
    this.loadingOverlay.style.display = show ? 'flex' : 'none';
  }

  handleVideoError() {
    this.showLoading(false);
    if (this.retryCount < 3) {
      this.retryCount++;
      setTimeout(() => this.videoElement.load(), 1500);
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  updateTimeDisplay() {
    if (!this.isSeeking && this.videoElement.duration) {
      const percent = (this.videoElement.currentTime / this.videoElement.duration) * 100;
      this.progressFill.style.width = `${percent}%`;
      this.timerLabel.innerText = `${this.formatTime(this.videoElement.currentTime)} / ${this.formatTime(this.videoElement.duration)}`;

      const currentSec = Math.floor(this.videoElement.currentTime);
      this.currentSecondEl.innerText = `${currentSec}s`;
    }
  }

  updatePlayButton(isPlaying) {
    const playBtnSvg = this.playBtn.querySelector('svg');
    if (isPlaying) {
      playBtnSvg.innerHTML = '<rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />';
      this.hudOverlay.style.opacity = '0';
      this.resetHideControlsTimeout();
    } else {
      playBtnSvg.innerHTML = '<polygon points="5,3 19,12 5,21" />';
      this.hudOverlay.style.opacity = '0.7';
      setTimeout(() => { if (this.videoElement.paused) this.hudOverlay.style.opacity = '0'; }, 800);
      this.showControls();
    }
  }

  togglePlay() {
    if (this.videoElement.paused) {
      this.videoElement.play().catch(() => { });
    } else {
      this.videoElement.pause();
    }
  }

  onMetadataLoaded() {
    if (this.videoElement.duration) {
      this.timerLabel.innerText = `${this.formatTime(0)} / ${this.formatTime(this.videoElement.duration)}`;
    }
    if (this.autoplay) {
      this.videoElement.play().catch(() => { });
    }
  }

  handleVideoClick(e) {
    if (this.pendingClick) {
      this.pendingClick = false;
      if (this.clickTimer) clearTimeout(this.clickTimer);
      return;
    }

    this.pendingClick = true;
    this.clickTimer = setTimeout(() => {
      const rect = this.videoWrapper.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const isRightSide = clickX > width / 2;

      if (isRightSide) {
        this.seek(10);
      } else {
        this.seek(-10);
      }

      this.pendingClick = false;
      this.clickTimer = null;
    }, 200);
  }

  seek(seconds) {
    if (!this.videoElement.duration) return;
    let newTime = this.videoElement.currentTime + seconds;
    newTime = Math.min(Math.max(0, newTime), this.videoElement.duration);
    this.videoElement.currentTime = newTime;
    const direction = seconds > 0 ? '+' : '-';
    this.seekToast.innerText = `${direction} ${Math.abs(seconds)} sec`;
    this.seekToast.style.opacity = '1';
    setTimeout(() => { this.seekToast.style.opacity = '0'; }, 600);
  }

  toggleFullscreen() {
    const container = this.shadowRoot.querySelector('.player-container').parentElement || this;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen();
    }
  }

  setupTimelineEvents() {
    const getPos = (e) => {
      const rect = this.timelineContainer.getBoundingClientRect();
      let clientX = e.clientX;
      if (e.touches) clientX = e.touches[0].clientX;
      if (!clientX && e.changedTouches) clientX = e.changedTouches[0].clientX;
      let pos = (clientX - rect.left) / rect.width;
      return Math.min(1, Math.max(0, pos));
    };

    this.timelineContainer.addEventListener('mousedown', (e) => {
      if (!this.videoElement.duration) return;
      this.isSeeking = true;
      const pos = getPos(e);
      this.progressFill.style.width = `${pos * 100}%`;
      this.previewTimeDiv.innerText = this.formatTime(pos * this.videoElement.duration);
      e.preventDefault();
      this.showControls();
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isSeeking || !this.videoElement.duration) return;
      const pos = getPos(e);
      this.progressFill.style.width = `${pos * 100}%`;
      this.previewTimeDiv.innerText = this.formatTime(pos * this.videoElement.duration);
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.isSeeking) return;
      const pos = getPos(e);
      this.videoElement.currentTime = pos * this.videoElement.duration;
      this.isSeeking = false;
      this.resetHideControlsTimeout();
    });

    this.timelineContainer.addEventListener('click', (e) => {
      if (!this.videoElement.duration) return;
      const pos = getPos(e);
      this.videoElement.currentTime = pos * this.videoElement.duration;
      this.progressFill.style.width = `${pos * 100}%`;
    });

    this.timelineContainer.addEventListener('mousemove', (e) => {
      const rect = this.timelineContainer.getBoundingClientRect();
      let pos = (e.clientX - rect.left) / rect.width;
      pos = Math.min(1, Math.max(0, pos));
      this.previewTimeDiv.innerText = this.formatTime(pos * this.videoElement.duration);
      const boxWidth = this.previewBox.clientWidth;
      this.previewBox.style.left = `calc(${pos * 100}% - ${boxWidth / 2}px)`;
    });

    this.timelineContainer.addEventListener('mouseenter', () => { this.previewBox.style.opacity = '1'; });
    this.timelineContainer.addEventListener('mouseleave', () => { this.previewBox.style.opacity = '0'; });
  }

  setupDropdowns() {
    const closeAll = () => {
      this.shadowRoot.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
    };

    this.shadowRoot.querySelectorAll('.dropdown-btn').forEach(btn => {
      if (btn.id !== 'mobileSettingsBtn') {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const parent = btn.closest('.dropdown');
          const content = parent.querySelector('.dropdown-content');
          const isOpen = content.classList.contains('show');
          closeAll();
          if (!isOpen) content.classList.add('show');
        });
      }
    });

    document.addEventListener('click', () => closeAll());
  }

  setupVolumeControls() {
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        this.currentVolume = parseFloat(e.target.value);
        this.videoElement.volume = this.currentVolume;
        this.videoElement.muted = false;
        this.volumePercent.innerText = `${Math.round(this.currentVolume * 100)}%`;
        if (this.mobileVolumeSlider) this.mobileVolumeSlider.value = this.currentVolume;
        if (this.mobileVolumePercent) this.mobileVolumePercent.innerText = `${Math.round(this.currentVolume * 100)}%`;
      });
    }
  }

  setupSpeedControls() {
    const speedBtns = this.shadowRoot.querySelectorAll('#speedDropdown button');
    const speedBtnText = this.shadowRoot.getElementById('speedDropdownBtn');
    speedBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const speed = parseFloat(btn.getAttribute('data-speed'));
        this.videoElement.playbackRate = speed;
        speedBtnText.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display: inline; margin-right: 4px;"><circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" stroke-width="1.5"/><polyline points="12,6 12,12 16,14" stroke="currentColor" fill="none" stroke-width="1.5"/></svg>${speed}x`;
        speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.toastMsg.innerText = `${speed}x speed`;
        this.toastMsg.style.opacity = '1';
        setTimeout(() => { this.toastMsg.style.opacity = '0'; }, 1000);
        this.shadowRoot.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
      });
    });
  }

  setupAspectControls() {
    const aspectBtns = this.shadowRoot.querySelectorAll('#qualityDropdown button');
    aspectBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const aspect = btn.getAttribute('data-aspect');
        this.videoElement.style.objectFit = aspect;
        aspectBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.shadowRoot.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
      });
    });
  }

  setupLongPressSpeed() {
    this.videoWrapper.addEventListener('touchstart', (e) => {
      const rect = this.videoWrapper.getBoundingClientRect();
      const touchX = e.touches[0].clientX - rect.left;
      const isRightSide = touchX > rect.width / 2;

      if (isRightSide) {
        this.longPressTimer = setTimeout(() => {
          this.isLongPressActive = true;
          this.videoElement.playbackRate = 2.0;
          this.toastMsg.innerText = '2.0x speed (release to reset)';
          this.toastMsg.style.opacity = '1';
          setTimeout(() => { if (this.toastMsg.style.opacity === '1') this.toastMsg.style.opacity = '0'; }, 1500);
        }, 500);
      }
    });

    this.videoWrapper.addEventListener('touchend', () => {
      clearTimeout(this.longPressTimer);
      if (this.isLongPressActive) {
        this.videoElement.playbackRate = 1.0;
        this.toastMsg.innerText = 'Speed reset to 1.0x';
        this.toastMsg.style.opacity = '1';
        setTimeout(() => { this.toastMsg.style.opacity = '0'; }, 800);
        this.isLongPressActive = false;
      }
    });

    this.videoWrapper.addEventListener('touchmove', () => {
      clearTimeout(this.longPressTimer);
      if (this.isLongPressActive) {
        this.videoElement.playbackRate = 1.0;
        this.isLongPressActive = false;
      }
    });
  }

  setupAutoHideControls() {
    const resetControls = () => {
      this.showControls();
    };

    this.shadowRoot.addEventListener('mousemove', resetControls);
    this.shadowRoot.addEventListener('touchstart', resetControls);
    this.videoWrapper.addEventListener('click', resetControls);
    this.controlsSection.addEventListener('mouseenter', () => {
      if (this.hideControlsTimeout) clearTimeout(this.hideControlsTimeout);
    });
    this.controlsSection.addEventListener('mouseleave', () => {
      if (!this.videoElement.paused && !this.isSeeking) {
        this.resetHideControlsTimeout();
      }
    });

    resetControls();
  }

  updateProgressLoop() {
    const update = () => {
      if (this.videoElement.duration && !this.isSeeking) {
        const percent = (this.videoElement.currentTime / this.videoElement.duration) * 100;
        this.progressFill.style.width = `${percent}%`;
      }
      if (this.videoElement.buffered.length > 0 && this.videoElement.duration) {
        const bufferedEnd = this.videoElement.buffered.end(this.videoElement.buffered.length - 1);
        const bufferPercent = (bufferedEnd / this.videoElement.duration) * 100;
        this.bufferFill.style.width = `${bufferPercent}%`;
      }
      requestAnimationFrame(update);
    };
    update();
  }
}

customElements.define('video-kamo', VideoKamo);
