* 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

/**
 * Input event types for the observer pattern
 * @readonly
 * @enum {string}
 */
const INPUT_EVENTS = Object.freeze({
  KEY_DOWN: 'keydown',
  KEY_UP: 'keyup',
  KEY_PRESSED: 'keypressed',
  INPUT_BUFFER_FULL: 'inputbufferfull',
  RATE_LIMIT_EXCEEDED: 'ratelimitexceeded'
});

/**
 * Default key mappings for game actions
 * @readonly
 * @type {Object<string, string[]>}
 */
const DEFAULT_KEY_MAPPINGS = Object.freeze({
  MOVE_LEFT: ['ArrowLeft', 'KeyA'],
  MOVE_RIGHT: ['ArrowRight', 'KeyD'],
  SHOOT: ['Space', 'KeyW', 'ArrowUp'],
  PAUSE: ['Escape', 'KeyP'],
  RESTART: ['KeyR'],
  MENU: ['KeyM']
});

/**
 * Configuration constants for input management
 * @readonly
 * @type {Object}
 */
const INPUT_CONFIG = Object.freeze({
  MAX_BUFFER_SIZE: 32,
  BUFFER_CLEANUP_INTERVAL: 100, // ms
  RATE_LIMIT_WINDOW: 1000, // ms
  MAX_INPUTS_PER_WINDOW: 100,
  KEY_REPEAT_DELAY: 16, // ms (60fps)
  DOUBLE_TAP_THRESHOLD: 300 // ms
});

/**
 * Input state enumeration
 * @readonly
 * @enum {string}
 */
const INPUT_STATE = Object.freeze({
  IDLE: 'idle',
  ACTIVE: 'active',
  BUFFERING: 'buffering',
  RATE_LIMITED: 'ratelimited',
  DISABLED: 'disabled'
});

/**
 * Comprehensive keyboard input manager with advanced features
 * 
 * Features:
 * - Real-time key state tracking
 * - Input buffering for frame-perfect timing
 * - Configurable key mappings
 * - Rate limiting for security
 * - Performance monitoring
 * - Event-driven architecture
 */
class InputManager {
  /**
   * Initialize the input manager
   * 
   * @param {Object} options - Configuration options
   * @param {Object<string, string[]>} options.keyMappings - Custom key mappings
   * @param {number} options.bufferSize - Maximum buffer size
   * @param {boolean} options.enableRateLimit - Enable rate limiting
   * @param {HTMLElement} options.targetElement - Target element for events
   */
  constructor(options = {}) {
    // Validate and sanitize options
    this._validateOptions(options);
    
    // Core configuration
    this._keyMappings = { ...DEFAULT_KEY_MAPPINGS, ...options.keyMappings };
    this._bufferSize = Math.min(options.bufferSize || INPUT_CONFIG.MAX_BUFFER_SIZE, 128);
    this._enableRateLimit = options.enableRateLimit !== false;
    this._targetElement = options.targetElement || window;
    
    // State management
    this._currentState = INPUT_STATE.IDLE;
    this._keyStates = new Map();
    this._keyTimestamps = new Map();
    this._inputBuffer = [];
    this._eventListeners = new Map();
    
    // Performance tracking
    this._metrics = {
      totalInputs: 0,
      bufferedInputs: 0,
      rateLimitHits: 0,
      lastCleanup: Date.now()
    };
    
    // Rate limiting
    this._rateLimitWindow = [];
    this._lastInputTime = 0;
    
    // Event handling
    this._boundHandlers = {
      keyDown: this._handleKeyDown.bind(this),
      keyUp: this._handleKeyUp.bind(this),
      blur: this._handleBlur.bind(this),
      focus: this._handleFocus.bind(this)
    };
    
    // Cleanup timer
    this._cleanupTimer = null;
    this._isInitialized = false;
    
    // Observer pattern for events
    this._observers = new Map();
    
    this._logInfo('InputManager initialized', {
      bufferSize: this._bufferSize,
      rateLimit: this._enableRateLimit,
      keyMappings: Object.keys(this._keyMappings).length
    });
  }
  
  /**
   * Initialize the input manager and attach event listeners
   * 
   * @throws {Error} If already initialized or target element is invalid
   */
  initialize() {
    if (this._isInitialized) {
      throw new Error('InputManager already initialized');
    }
    
    if (!this._targetElement || typeof this._targetElement.addEventListener !== 'function') {
      throw new Error('Invalid target element for event listeners');
    }
    
    try {
      // Attach event listeners
      this._targetElement.addEventListener('keydown', this._boundHandlers.keyDown, { passive: false });
      this._targetElement.addEventListener('keyup', this._boundHandlers.keyUp, { passive: false });
      this._targetElement.addEventListener('blur', this._boundHandlers.blur);
      this._targetElement.addEventListener('focus', this._boundHandlers.focus);
      
      // Start cleanup timer
      this._cleanupTimer = setInterval(() => this._performCleanup(), INPUT_CONFIG.BUFFER_CLEANUP_INTERVAL);
      
      this._currentState = INPUT_STATE.ACTIVE;
      this._isInitialized = true;
      
      this._logInfo('InputManager initialized successfully');
      this._notifyObservers('initialized', { timestamp: Date.now() });
      
    } catch (error) {
      this._logError('Failed to initialize InputManager', error);
      throw new Error(`InputManager initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Clean up resources and remove event listeners
   */
  destroy() {
    if (!this._isInitialized) {
      return;
    }
    
    try {
      // Remove event listeners
      this._targetElement.removeEventListener('keydown', this._boundHandlers.keyDown);
      this._targetElement.removeEventListener('keyup', this._boundHandlers.keyUp);
      this._targetElement.removeEventListener('blur', this._boundHandlers.blur);
      this._targetElement.removeEventListener('focus', this._boundHandlers.focus);
      
      // Clear timers
      if (this._cleanupTimer) {
        clearInterval(this._cleanupTimer);
        this._cleanupTimer = null;
      }
      
      // Clear state
      this._keyStates.clear();
      this._keyTimestamps.clear();
      this._inputBuffer.length = 0;
      this._rateLimitWindow.length = 0;
      this._observers.clear();
      
      this._currentState = INPUT_STATE.DISABLED;
      this._isInitialized = false;
      
      this._logInfo('InputManager destroyed successfully');
      
    } catch (error) {
      this._logError('Error during InputManager destruction', error);
    }
  }
  
  /**
   * Check if a specific key is currently pressed
   * 
   * @param {string} key - Key code to check
   * @returns {boolean} True if key is pressed
   */
  isKeyPressed(key) {
    if (!this._isValidKey(key)) {
      return false;
    }
    
    return this._keyStates.get(key) === true;
  }
  
  /**
   * Check if any key mapped to an action is pressed
   * 
   * @param {string} action - Action name from key mappings
   * @returns {boolean} True if any mapped key is pressed
   */
  isActionPressed(action) {
    const keys = this._keyMappings[action];
    if (!Array.isArray(keys)) {
      this._logWarn(`Unknown action: ${action}`);
      return false;
    }
    
    return keys.some(key => this.isKeyPressed(key));
  }
  
  /**
   * Get the timestamp when a key was first pressed
   * 
   * @param {string} key - Key code
   * @returns {number|null} Timestamp or null if not pressed
   */
  getKeyPressTime(key) {
    if (!this._isValidKey(key) || !this.isKeyPressed(key)) {
      return null;
    }
    
    return this._keyTimestamps.get(key) || null;
  }
  
  /**
   * Get buffered input events for frame-perfect timing
   * 
   * @param {boolean} consume - Whether to consume the buffer
   * @returns {Array<Object>} Array of input events
   */
  getBufferedInput(consume = true) {
    const buffer = [...this._inputBuffer];
    
    if (consume) {
      this._inputBuffer.length = 0;
      this._currentState = this._keyStates.size > 0 ? INPUT_STATE.ACTIVE : INPUT_STATE.IDLE;
    }
    
    return buffer;
  }
  
  /**
   * Add a custom key mapping
   * 
   * @param {string} action - Action name
   * @param {string|string[]} keys - Key or array of keys
   */
  addKeyMapping(action, keys) {
    if (typeof action !== 'string' || !action.trim()) {
      throw new Error('Action must be a non-empty string');
    }
    
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const validKeys = keyArray.filter(key => this._isValidKey(key));
    
    if (validKeys.length === 0) {
      throw new Error('No valid keys provided');
    }
    
    this._keyMappings[action.toUpperCase()] = validKeys;
    this._logInfo(`Added key mapping: ${action} -> ${validKeys.join(', ')}`);
  }
  
  /**
   * Remove a key mapping
   * 
   * @param {string} action - Action name to remove
   */
  removeKeyMapping(action) {
    if (typeof action !== 'string') {
      return false;
    }
    
    const removed = delete this._keyMappings[action.toUpperCase()];
    if (removed) {
      this._logInfo(`Removed key mapping: ${action}`);
    }
    
    return removed;
  }
  
  /**
   * Get current input metrics for monitoring
   * 
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this._metrics,
      currentState: this._currentState,
      activeKeys: this._keyStates.size,
      bufferSize: this._inputBuffer.length,
      rateLimitWindowSize: this._rateLimitWindow.length,
      uptime: this._isInitialized ? Date.now() - this._metrics.lastCleanup : 0
    };
  }
  
  /**
   * Subscribe to input events
   * 
   * @param {string} event - Event type
   * @param {Function} callback - Event callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    if (!this._observers.has(event)) {
      this._observers.set(event, new Set());
    }
    
    this._observers.get(event).add(callback);
    
    return () => {
      const observers = this._observers.get(event);
      if (observers) {
        observers.delete(callback);
      }
    };
  }
  
  /**
   * Enable or disable the input manager
   * 
   * @param {boolean} enabled - Whether to enable input
   */
  setEnabled(enabled) {
    if (!this._isInitialized) {
      return;
    }
    
    const newState = enabled ? INPUT_STATE.ACTIVE : INPUT_STATE.DISABLED;
    
    if (newState !== this._currentState) {
      this._currentState = newState;
      
      if (!enabled) {
        // Clear all pressed keys when disabling
        this._keyStates.clear();
        this._keyTimestamps.clear();
        this._inputBuffer.length = 0;
      }
      
      this._logInfo(`InputManager ${enabled ? 'enabled' : 'disabled'}`);
      this._notifyObservers('stateChanged', { state: newState, timestamp: Date.now() });
    }
  }
  
  /**
   * Handle keydown events
   * 
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  _handleKeyDown(event) {
    if (this._currentState === INPUT_STATE.DISABLED) {
      return;
    }
    
    // Rate limiting check
    if (!this._checkRateLimit()) {
      this._logWarn('Rate limit exceeded for input');
      return;
    }
    
    const key = event.code || event.key;
    const timestamp = Date.now();
    
    // Prevent default for game keys
    if (this._isGameKey(key)) {
      event.preventDefault();
    }
    
    // Track key state
    const wasPressed = this._keyStates.get(key);
    this._keyStates.set(key, true);
    
    // Set timestamp for new key presses
    if (!wasPressed) {
      this._keyTimestamps.set(key, timestamp);
      
      // Add to buffer
      this._addToBuffer({
        type: INPUT_EVENTS.KEY_DOWN,
        key,
        timestamp,
        repeat: event.repeat || false
      });
      
      this._notifyObservers(INPUT_EVENTS.KEY_DOWN, { key, timestamp });
    }
    
    this._metrics.totalInputs++;
    this._currentState = INPUT_STATE.ACTIVE;
  }
  
  /**
   * Handle keyup events
   * 
   * @private
   * @param {KeyboardEvent} event - Keyboard event
   */
  _handleKeyUp(event) {
    if (this._currentState === INPUT_STATE.DISABLED) {
      return;
    }
    
    const key = event.code || event.key;
    const timestamp = Date.now();
    
    // Prevent default for game keys
    if (this._isGameKey(key)) {
      event.preventDefault();
    }
    
    // Update key state
    const wasPressed = this._keyStates.get(key);
    this._keyStates.delete(key);
    this._keyTimestamps.delete(key);
    
    if (wasPressed) {
      // Add to buffer
      this._addToBuffer({
        type: INPUT_EVENTS.KEY_UP,
        key,
        timestamp
      });
      
      this._notifyObservers(INPUT_EVENTS.KEY_UP, { key, timestamp });
    }
    
    // Update state based on active keys
    this._currentState = this._keyStates.size > 0 ? INPUT_STATE.ACTIVE : INPUT_STATE.IDLE;
  }
  
  /**
   * Handle window blur events
   * 
   * @private
   */
  _handleBlur() {
    // Clear all key states when window loses focus
    this._keyStates.clear();
    this._keyTimestamps.clear();
    this._currentState = INPUT_STATE.IDLE;
    
    this._logInfo('Input cleared due to window blur');
  }
  
  /**
   * Handle window focus events
   * 
   * @private
   */
  _handleFocus() {
    if (this._currentState === INPUT_STATE.DISABLED) {
      return;
    }
    
    this._currentState = INPUT_STATE.IDLE;
    this._logInfo('Input manager focused');
  }
  
  /**
   * Add event to input buffer
   * 
   * @private
   * @param {Object} inputEvent - Input event to buffer
   */
  _addToBuffer(inputEvent) {
    if (this._inputBuffer.length >= this._bufferSize) {
      // Remove oldest event
      this._inputBuffer.shift();
      this._notifyObservers(INPUT_EVENTS.INPUT_BUFFER_FULL, { 
        bufferSize: this._bufferSize,
        timestamp: Date.now()
      });
    }
    
    this._inputBuffer.push(inputEvent);
    this._metrics.bufferedInputs++;
    
    if (this._inputBuffer.length > 0) {
      this._currentState = INPUT_STATE.BUFFERING;
    }
  }
  
  /**
   * Check rate limiting
   * 
   * @private
   * @returns {boolean} True if within rate limit
   */
  _checkRateLimit() {
    if (!this._enableRateLimit) {
      return true;
    }
    
    const now = Date.now();
    const windowStart = now - INPUT_CONFIG.RATE_LIMIT_WINDOW;
    
    // Clean old entries
    this._rateLimitWindow = this._rateLimitWindow.filter(time => time > windowStart);
    
    if (this._rateLimitWindow.length >= INPUT_CONFIG.MAX_INPUTS_PER_WINDOW) {
      this._metrics.rateLimitHits++;
      this._notifyObservers(INPUT_EVENTS.RATE_LIMIT_EXCEEDED, { 
        limit: INPUT_CONFIG.MAX_INPUTS_PER_WINDOW,
        window: INPUT_CONFIG.RATE_LIMIT_WINDOW,
        timestamp: now
      });
      return false;
    }
    
    this._rateLimitWindow.push(now);
    return true;
  }
  
  /**
   * Perform periodic cleanup
   * 
   * @private
   */
  _performCleanup() {
    const now = Date.now();
    
    // Clean up old timestamps
    for (const [key, timestamp] of this._keyTimestamps.entries()) {
      if (now - timestamp > 60000) { // 1 minute
        this._keyTimestamps.delete(key);
      }
    }
    
    // Clean up rate limit window
    const windowStart = now - INPUT_CONFIG.RATE_LIMIT_WINDOW;
    this._rateLimitWindow = this._rateLimitWindow.filter(time => time > windowStart);
    
    this._metrics.lastCleanup = now;
  }
  
  /**
   * Validate initialization options
   * 
   * @private
   * @param {Object} options - Options to validate
   */
  _validateOptions(options) {
    if (options.bufferSize !== undefined) {
      if (!Number.isInteger(options.bufferSize) || options.bufferSize < 1) {
        throw new Error('Buffer size must be a positive integer');
      }
    }
    
    if (options.keyMappings !== undefined) {
      if (typeof options.keyMappings !== 'object' || options.keyMappings === null) {
        throw new Error('Key mappings must be an object');
      }
    }
    
    if (options.targetElement !== undefined) {
      if (typeof options.targetElement !== 'object' || options.targetElement === null) {
        throw new Error('Target element must be a valid DOM element');
      }
    }
  }
  
  /**
   * Check if a key code is valid
   * 
   * @private
   * @param {string} key - Key code to validate
   * @returns {boolean} True if valid
   */
  _isValidKey(key) {
    return typeof key === 'string' && key.length > 0;
  }
  
  /**
   * Check if a key is a game control key
   * 
   * @private
   * @param {string} key - Key code
   * @returns {boolean} True if it's a game key
   */
  _isGameKey(key) {
    const gameKeys = Object.values(this._keyMappings).flat();
    return gameKeys.includes(key);
  }
  
  /**
   * Notify observers of an event
   * 
   * @private
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  _notifyObservers(event, data) {
    const observers = this._observers.get(event);
    if (observers) {
      observers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this._logError(`Observer error for event ${event}`, error);
        }
      });
    }
  }
  
  /**
   * Log info message
   * 
   * @private
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  _logInfo(message, data = {}) {
    console.log(`[InputManager] ${message}`, data);
  }
  
  /**
   * Log warning message
   * 
   * @private
   * @param {string} message - Warning message
   * @param {Object} data - Additional data
   */
  _logWarn(message, data = {}) {
    console.warn(`[InputManager] ${message}`, data);
  }
  
  /**
   * Log error message
   * 
   * @private
   * @param {string} message - Error message
   * @param {Error} error - Error object
   */
  _logError(message, error) {
    console.error(`[InputManager] ${message}`, error);
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    InputManager,
    INPUT_EVENTS,
    DEFAULT_KEY_MAPPINGS,
    INPUT_CONFIG,
    INPUT_STATE
  };
}

// Global export for browser
if (typeof window !== 'undefined') {
  window.InputManager = InputManager;
  window.INPUT_EVENTS = INPUT_EVENTS;
  window.DEFAULT_KEY_MAPPINGS = DEFAULT_KEY_MAPPINGS;
  window.INPUT_CONFIG = INPUT_CONFIG;
  window.INPUT_STATE = INPUT_STATE;
}