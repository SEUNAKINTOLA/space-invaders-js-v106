/**
 * Space Invaders Game - Core Game Class
 * 
 * This module implements the main game class for a browser-based Space Invaders game.
 * It handles Canvas initialization, responsive design, game loop management, and
 * provides a clean architecture foundation for the game systems.
 * 
 * Key Features:
 * - HTML5 Canvas initialization with responsive design
 * - Game state management with proper lifecycle
 * - Performance monitoring and frame rate control
 * - Error handling and graceful degradation
 * - Event-driven architecture for loose coupling
 * - Mobile-first responsive design
 * 
 * Architecture Decisions:
 * - Uses composition over inheritance for game systems
 * - Implements observer pattern for state changes
 * - Separates concerns between rendering and game logic
 * - Provides dependency injection points for testing
 * 
 * @author Space Invaders Development Team
 * @version 1.0.6
 * @since 2025-01-27
 */

/**
 * Game configuration constants
 * @readonly
 * @enum {number|string}
 */
const GAME_CONFIG = {
    // Canvas settings
    DEFAULT_WIDTH: 800,
    DEFAULT_HEIGHT: 600,
    MIN_WIDTH: 320,
    MIN_HEIGHT: 240,
    ASPECT_RATIO: 4/3,
    
    // Performance settings
    TARGET_FPS: 60,
    MAX_DELTA_TIME: 1000/30, // Cap at 30fps minimum
    PERFORMANCE_SAMPLE_SIZE: 60,
    
    // Game states
    STATES: {
        LOADING: 'loading',
        MENU: 'menu',
        PLAYING: 'playing',
        PAUSED: 'paused',
        GAME_OVER: 'game_over'
    },
    
    // Events
    EVENTS: {
        STATE_CHANGE: 'stateChange',
        RESIZE: 'resize',
        PERFORMANCE_UPDATE: 'performanceUpdate',
        ERROR: 'error'
    }
};

/**
 * Custom error classes for game-specific error handling
 */
class GameError extends Error {
    constructor(message, code = 'GAME_ERROR', context = {}) {
        super(message);
        this.name = 'GameError';
        this.code = code;
        this.context = context;
        this.timestamp = Date.now();
    }
}

class CanvasError extends GameError {
    constructor(message, context = {}) {
        super(message, 'CANVAS_ERROR', context);
        this.name = 'CanvasError';
    }
}

/**
 * Performance monitor for tracking game performance metrics
 */
class PerformanceMonitor {
    constructor(sampleSize = GAME_CONFIG.PERFORMANCE_SAMPLE_SIZE) {
        this.sampleSize = sampleSize;
        this.frameTimes = [];
        this.lastFrameTime = 0;
        this.metrics = {
            fps: 0,
            averageFrameTime: 0,
            minFrameTime: Infinity,
            maxFrameTime: 0
        };
    }

    /**
     * Update performance metrics with current frame time
     * @param {number} currentTime - Current timestamp
     */
    update(currentTime) {
        if (this.lastFrameTime > 0) {
            const frameTime = currentTime - this.lastFrameTime;
            this.frameTimes.push(frameTime);
            
            if (this.frameTimes.length > this.sampleSize) {
                this.frameTimes.shift();
            }
            
            this._calculateMetrics();
        }
        this.lastFrameTime = currentTime;
    }

    /**
     * Calculate performance metrics from frame time samples
     * @private
     */
    _calculateMetrics() {
        if (this.frameTimes.length === 0) return;
        
        const sum = this.frameTimes.reduce((a, b) => a + b, 0);
        this.metrics.averageFrameTime = sum / this.frameTimes.length;
        this.metrics.fps = Math.round(1000 / this.metrics.averageFrameTime);
        this.metrics.minFrameTime = Math.min(...this.frameTimes);
        this.metrics.maxFrameTime = Math.max(...this.frameTimes);
    }

    /**
     * Get current performance metrics
     * @returns {Object} Performance metrics object
     */
    getMetrics() {
        return { ...this.metrics };
    }
}

/**
 * Event emitter for game events
 */
class GameEventEmitter {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback to remove
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to all listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
}

/**
 * Main Game class - Core game engine and canvas management
 * 
 * Responsibilities:
 * - Canvas initialization and responsive handling
 * - Game loop management with frame rate control
 * - State management and transitions
 * - Performance monitoring and optimization
 * - Error handling and recovery
 * - Event coordination between game systems
 */
class Game {
    /**
     * Initialize the game with configuration options
     * @param {Object} options - Game configuration options
     * @param {string} options.canvasId - Canvas element ID
     * @param {number} options.width - Initial canvas width
     * @param {number} options.height - Initial canvas height
     * @param {boolean} options.responsive - Enable responsive design
     * @param {boolean} options.debug - Enable debug mode
     */
    constructor(options = {}) {
        // Validate and set configuration
        this.config = this._validateConfig(options);
        
        // Initialize core systems
        this.eventEmitter = new GameEventEmitter();
        this.performanceMonitor = new PerformanceMonitor();
        
        // Game state
        this.currentState = GAME_CONFIG.STATES.LOADING;
        this.isRunning = false;
        this.isPaused = false;
        
        // Canvas and rendering
        this.canvas = null;
        this.context = null;
        this.devicePixelRatio = window.devicePixelRatio || 1;
        
        // Game loop
        this.lastTime = 0;
        this.accumulator = 0;
        this.animationFrameId = null;
        
        // Responsive design
        this.resizeObserver = null;
        this.orientationChangeHandler = null;
        
        // Error handling
        this.errorCount = 0;
        this.maxErrors = 10;
        
        // Initialize the game
        this._initialize();
    }

    /**
     * Validate and normalize configuration options
     * @param {Object} options - Raw configuration options
     * @returns {Object} Validated configuration
     * @private
     */
    _validateConfig(options) {
        const config = {
            canvasId: options.canvasId || 'gameCanvas',
            width: Math.max(options.width || GAME_CONFIG.DEFAULT_WIDTH, GAME_CONFIG.MIN_WIDTH),
            height: Math.max(options.height || GAME_CONFIG.DEFAULT_HEIGHT, GAME_CONFIG.MIN_HEIGHT),
            responsive: options.responsive !== false,
            debug: Boolean(options.debug),
            targetFPS: options.targetFPS || GAME_CONFIG.TARGET_FPS
        };

        // Ensure aspect ratio is maintained if responsive
        if (config.responsive) {
            const aspectRatio = config.width / config.height;
            if (Math.abs(aspectRatio - GAME_CONFIG.ASPECT_RATIO) > 0.1) {
                config.height = Math.round(config.width / GAME_CONFIG.ASPECT_RATIO);
            }
        }

        return config;
    }

    /**
     * Initialize the game systems
     * @private
     */
    async _initialize() {
        try {
            this._log('Initializing game...', { config: this.config });
            
            await this._initializeCanvas();
            this._setupEventListeners();
            this._setupErrorHandling();
            
            if (this.config.responsive) {
                this._setupResponsiveDesign();
            }
            
            this._setState(GAME_CONFIG.STATES.MENU);
            this._log('Game initialization complete');
            
        } catch (error) {
            this._handleError(error, 'Failed to initialize game');
            throw error;
        }
    }

    /**
     * Initialize HTML5 Canvas with proper configuration
     * @private
     */
    async _initializeCanvas() {
        // Get or create canvas element
        this.canvas = document.getElementById(this.config.canvasId);
        
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = this.config.canvasId;
            document.body.appendChild(this.canvas);
        }

        // Validate canvas support
        if (!this.canvas.getContext) {
            throw new CanvasError('Canvas not supported by browser');
        }

        // Get 2D rendering context
        this.context = this.canvas.getContext('2d');
        if (!this.context) {
            throw new CanvasError('Failed to get 2D rendering context');
        }

        // Configure canvas for high DPI displays
        this._configureHighDPI();
        
        // Set initial size
        this._resizeCanvas(this.config.width, this.config.height);
        
        // Configure rendering context
        this._configureRenderingContext();
        
        this._log('Canvas initialized', {
            width: this.canvas.width,
            height: this.canvas.height,
            devicePixelRatio: this.devicePixelRatio
        });
    }

    /**
     * Configure canvas for high DPI displays
     * @private
     */
    _configureHighDPI() {
        // Get the device pixel ratio, falling back to 1
        this.devicePixelRatio = window.devicePixelRatio || 1;
        
        // Only apply scaling if pixel ratio is greater than 1
        if (this.devicePixelRatio > 1) {
            this._log('Configuring high DPI display', { ratio: this.devicePixelRatio });
        }
    }

    /**
     * Configure rendering context with optimal settings
     * @private
     */
    _configureRenderingContext() {
        // Disable image smoothing for pixel-perfect rendering
        this.context.imageSmoothingEnabled = false;
        
        // Set text rendering properties
        this.context.textAlign = 'left';
        this.context.textBaseline = 'top';
        
        // Set default styles
        this.context.fillStyle = '#000000';
        this.context.strokeStyle = '#ffffff';
        this.context.lineWidth = 1;
    }

    /**
     * Setup responsive design handlers
     * @private
     */
    _setupResponsiveDesign() {
        // Handle window resize
        const resizeHandler = this._debounce(() => {
            this._handleResize();
        }, 250);

        window.addEventListener('resize', resizeHandler);
        
        // Handle orientation change on mobile
        this.orientationChangeHandler = () => {
            // Delay to allow orientation change to complete
            setTimeout(() => this._handleResize(), 100);
        };
        
        window.addEventListener('orientationchange', this.orientationChangeHandler);
        
        // Use ResizeObserver if available for more precise resize detection
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (entry.target === this.canvas.parentElement) {
                        this._handleResize();
                        break;
                    }
                }
            });
            
            if (this.canvas.parentElement) {
                this.resizeObserver.observe(this.canvas.parentElement);
            }
        }
        
        // Initial resize to fit container
        this._handleResize();
    }

    /**
     * Handle window/container resize
     * @private
     */
    _handleResize() {
        try {
            const container = this.canvas.parentElement || document.body;
            const containerRect = container.getBoundingClientRect();
            
            // Calculate optimal size maintaining aspect ratio
            const containerAspect = containerRect.width / containerRect.height;
            const gameAspect = GAME_CONFIG.ASPECT_RATIO;
            
            let newWidth, newHeight;
            
            if (containerAspect > gameAspect) {
                // Container is wider - fit to height
                newHeight = Math.max(containerRect.height * 0.9, GAME_CONFIG.MIN_HEIGHT);
                newWidth = newHeight * gameAspect;
            } else {
                // Container is taller - fit to width
                newWidth = Math.max(containerRect.width * 0.9, GAME_CONFIG.MIN_WIDTH);
                newHeight = newWidth / gameAspect;
            }
            
            // Ensure minimum sizes
            newWidth = Math.max(newWidth, GAME_CONFIG.MIN_WIDTH);
            newHeight = Math.max(newHeight, GAME_CONFIG.MIN_HEIGHT);
            
            this._resizeCanvas(newWidth, newHeight);
            
            this.eventEmitter.emit(GAME_CONFIG.EVENTS.RESIZE, {
                width: newWidth,
                height: newHeight,
                containerWidth: containerRect.width,
                containerHeight: containerRect.height
            });
            
        } catch (error) {
            this._handleError(error, 'Failed to handle resize');
        }
    }

    /**
     * Resize canvas with proper scaling
     * @param {number} width - New width
     * @param {number} height - New height
     * @private
     */
    _resizeCanvas(width, height) {
        // Set display size (CSS pixels)
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        // Set actual size in memory (scaled for high DPI)
        this.canvas.width = width * this.devicePixelRatio;
        this.canvas.height = height * this.devicePixelRatio;
        
        // Scale the drawing context so everything draws at the correct size
        this.context.scale(this.devicePixelRatio, this.devicePixelRatio);
        
        // Reconfigure context after resize
        this._configureRenderingContext();
    }

    /**
     * Setup global event listeners
     * @private
     */
    _setupEventListeners() {
        // Visibility change handling for pause/resume
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRunning) {
                this.pause();
            } else if (!document.hidden && this.isPaused) {
                this.resume();
            }
        });
        
        // Focus/blur handling
        window.addEventListener('blur', () => {
            if (this.isRunning) this.pause();
        });
        
        window.addEventListener('focus', () => {
            if (this.isPaused) this.resume();
        });
    }

    /**
     * Setup global error handling
     * @private
     */
    _setupErrorHandling() {
        window.addEventListener('error', (event) => {
            this._handleError(event.error, 'Uncaught error');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this._handleError(event.reason, 'Unhandled promise rejection');
        });
    }

    /**
     * Start the game
     * @returns {Promise<void>}
     */
    async start() {
        if (this.isRunning) {
            this._log('Game already running');
            return;
        }
        
        try {
            this._log('Starting game...');
            this.isRunning = true;
            this.isPaused = false;
            this._setState(GAME_CONFIG.STATES.PLAYING);
            
            // Start the game loop
            this.lastTime = performance.now();
            this._gameLoop(this.lastTime);
            
            this._log('Game started successfully');
            
        } catch (error) {
            this._handleError(error, 'Failed to start game');
            this.isRunning = false;
            throw error;
        }
    }

    /**
     * Pause the game
     */
    pause() {
        if (!this.isRunning || this.isPaused) return;
        
        this.isPaused = true;
        this._setState(GAME_CONFIG.STATES.PAUSED);
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this._log('Game paused');
    }

    /**
     * Resume the game
     */
    resume() {
        if (!this.isRunning || !this.isPaused) return;
        
        this.isPaused = false;
        this._setState(GAME_CONFIG.STATES.PLAYING);
        
        // Reset timing to prevent large delta
        this.lastTime = performance.now();
        this._gameLoop(this.lastTime);
        
        this._log('Game resumed');
    }

    /**
     * Stop the game
     */
    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this._setState(GAME_CONFIG.STATES.MENU);
        this._log('Game stopped');
    }

    /**
     * Main game loop with fixed timestep
     * @param {number} currentTime - Current timestamp
     * @private
     */
    _gameLoop(currentTime) {
        if (!this.isRunning || this.isPaused) return;
        
        try {
            // Calculate delta time
            const deltaTime = Math.min(currentTime - this.lastTime, GAME_CONFIG.MAX_DELTA_TIME);
            this.lastTime = currentTime;
            
            // Update performance metrics
            this.performanceMonitor.update(currentTime);
            
            // Fixed timestep game loop
            this.accumulator += deltaTime;
            const fixedTimeStep = 1000 / this.config.targetFPS;
            
            // Update game logic with fixed timestep
            while (this.accumulator >= fixedTimeStep) {
                this._update(fixedTimeStep);
                this.accumulator -= fixedTimeStep;
            }
            
            // Render with interpolation
            const interpolation = this.accumulator / fixedTimeStep;
            this._render(interpolation);
            
            // Schedule next frame
            this.animationFrameId = requestAnimationFrame((time) => this._gameLoop(time));
            
        } catch (error) {
            this._handleError(error, 'Error in game loop');
            
            // Try to recover by continuing the loop
            if (this.errorCount < this.maxErrors) {
                this.animationFrameId = requestAnimationFrame((time) => this._gameLoop(time));
            } else {
                this.stop();
                this._setState(GAME_CONFIG.STATES.GAME_OVER);
            }
        }
    }

    /**
     * Update game logic
     * @param {number} deltaTime - Time since last update
     * @private
     */
    _update(deltaTime) {
        // This will be extended by game systems
        // For now, just emit update event for other systems to handle
        this.eventEmitter.emit('update', { deltaTime });
    }

    /**
     * Render game graphics
     * @param {number} interpolation - Interpolation factor for smooth rendering
     * @private
     */
    _render(interpolation) {
        // Clear canvas
        this.context.clearRect(0, 0, this.canvas.width / this.devicePixelRatio, this.canvas.height / this.devicePixelRatio);
        
        // Emit render event for other systems to handle
        this.eventEmitter.emit('render', { 
            context: this.context, 
            interpolation,
            width: this.canvas.width / this.devicePixelRatio,
            height: this.canvas.height / this.devicePixelRatio
        });
        
        // Debug information
        if (this.config.debug) {
            this._renderDebugInfo();
        }
    }

    /**
     * Render debug information
     * @private
     */
    _renderDebugInfo() {
        const metrics = this.performanceMonitor.getMetrics();
        const debugInfo = [
            `FPS: ${metrics.fps}`,
            `Frame Time: ${metrics.averageFrameTime.toFixed(2)}ms`,
            `State: ${this.currentState}`,
            `Canvas: ${Math.round(this.canvas.width / this.devicePixelRatio)}x${Math.round(this.canvas.height / this.devicePixelRatio)}`,
            `DPR: ${this.devicePixelRatio}`
        ];
        
        this.context.save();
        this.context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.context.fillRect(10, 10, 200, debugInfo.length * 20 + 10);
        
        this.context.fillStyle = '#00ff00';
        this.context.font = '12px monospace';
        
        debugInfo.forEach((info, index) => {
            this.context.fillText(info, 15, 25 + index * 20);
        });
        
        this.context.restore();
    }

    /**
     * Set game state with validation and events
     * @param {string} newState - New game state
     * @private
     */
    _setState(newState) {
        if (!Object.values(GAME_CONFIG.STATES).includes(newState)) {
            throw new GameError(`Invalid game state: ${newState}`);
        }
        
        const oldState = this.currentState;
        this.currentState = newState;
        
        this.eventEmitter.emit(GAME_CONFIG.EVENTS.STATE_CHANGE, {
            oldState,
            newState,
            timestamp: Date.now()
        });
        
        this._log('State changed', { from: oldState, to: newState });
    }

    /**
     * Handle errors with logging and recovery
     * @param {Error} error - Error object
     * @param {string} context - Error context
     * @private
     */
    _handleError(error, context = 'Unknown error') {
        this.errorCount++;
        
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: Date.now(),
            gameState: this.currentState,
            errorCount: this.errorCount
        };
        
        console.error(`Game Error [${context}]:`, error);
        this._log('Error occurred', errorInfo, 'error');
        
        this.eventEmitter.emit(GAME_CONFIG.EVENTS.ERROR, errorInfo);
        
        // Stop game if too many errors
        if (this.errorCount >= this.maxErrors) {
            this._log('Maximum error count reached, stopping game', {}, 'error');
            this.stop();
        }
    }

    /**
     * Utility function for debouncing
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     * @private
     */
    _debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Structured logging with context
     * @param {string} message - Log message
     * @param {Object} context - Additional context
     * @param {string} level - Log level
     * @private
     */
    _log(message, context = {}, level = 'info') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context: {
                gameState: this.currentState,
                isRunning: this.isRunning,
                isPaused: this.isPaused,
                ...context
            }
        };
        
        if (level === 'error') {
            console.error(`[Game] ${message}`, logEntry);
        } else if (this.config.debug) {
            console.log(`[Game] ${message}`, logEntry);
        }
    }

    /**
     * Get current game state
     * @returns {string} Current game state
     */
    getState() {
        return this.currentState;
    }

    /**
     * Get canvas dimensions
     * @returns {Object} Canvas dimensions
     */
    getDimensions() {
        return {
            width: this.canvas.width / this.devicePixelRatio,
            height: this.canvas.height / this.devicePixelRatio,
            devicePixelRatio: this.devicePixelRatio
        };
    }

    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        return this.performanceMonitor.getMetrics();
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    on(event, callback) {
        this.eventEmitter.on(event, callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    off(event, callback) {
        this.eventEmitter.off(event, callback);
    }

    /**
     * Cleanup resources and event listeners
     */
    destroy() {
        this.stop();
        
        // Remove event listeners
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        if (this.orientationChangeHandler) {
            window.removeEventListener('orientationchange', this.orientationChangeHandler);
        }
        
        // Clear canvas
        if (this.context) {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        this._log('Game destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, GameError, CanvasError, GAME_CONFIG };
} else if (typeof window !== 'undefined') {
    window.Game = Game;
    window.GameError = GameError;
    window.CanvasError = CanvasError;
    window.GAME_CONFIG = GAME_CONFIG;
}