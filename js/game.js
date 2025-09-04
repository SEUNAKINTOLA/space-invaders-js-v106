/**
 * Space Invaders Game - Main Game Loop Architecture
 * 
 * This module implements the core game loop using requestAnimationFrame with:
 * - Delta time calculations for frame-rate independent movement
 * - Frame rate management and monitoring
 * - Game state management integration
 * - Performance monitoring and optimization
 * - Error handling and graceful degradation
 * 
 * Architecture:
 * - Clean separation between update and render cycles
 * - Event-driven state management
 * - Resource management with cleanup
 * - Configurable performance settings
 * 
 * Dependencies: None (uses only standard browser APIs)
 * Browser Support: Modern browsers with requestAnimationFrame support
 */

/**
 * Game configuration constants
 * @readonly
 * @enum {number}
 */
const GAME_CONFIG = {
    TARGET_FPS: 60,
    MAX_DELTA_TIME: 1000 / 30, // Cap at 30fps minimum
    PERFORMANCE_SAMPLE_SIZE: 60,
    DEBUG_MODE: false,
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600
};

/**
 * Game states enumeration
 * @readonly
 * @enum {string}
 */
const GAME_STATES = {
    LOADING: 'loading',
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    ERROR: 'error'
};

/**
 * Performance metrics tracker
 */
class PerformanceMonitor {
    constructor(sampleSize = GAME_CONFIG.PERFORMANCE_SAMPLE_SIZE) {
        this.sampleSize = sampleSize;
        this.frameTimes = [];
        this.lastFrameTime = 0;
        this.averageFPS = 0;
        this.minFPS = Infinity;
        this.maxFPS = 0;
    }

    /**
     * Record a frame time sample
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    recordFrame(deltaTime) {
        const fps = 1000 / deltaTime;
        
        this.frameTimes.push(fps);
        if (this.frameTimes.length > this.sampleSize) {
            this.frameTimes.shift();
        }

        this.averageFPS = this.frameTimes.reduce((sum, fps) => sum + fps, 0) / this.frameTimes.length;
        this.minFPS = Math.min(this.minFPS, fps);
        this.maxFPS = Math.max(this.maxFPS, fps);
    }

    /**
     * Get current performance metrics
     * @returns {Object} Performance statistics
     */
    getMetrics() {
        return {
            averageFPS: Math.round(this.averageFPS),
            minFPS: Math.round(this.minFPS),
            maxFPS: Math.round(this.maxFPS),
            sampleCount: this.frameTimes.length
        };
    }

    /**
     * Reset performance tracking
     */
    reset() {
        this.frameTimes = [];
        this.averageFPS = 0;
        this.minFPS = Infinity;
        this.maxFPS = 0;
    }
}

/**
 * Game state manager for handling state transitions
 */
class GameStateManager {
    constructor() {
        this.currentState = GAME_STATES.LOADING;
        this.previousState = null;
        this.stateChangeListeners = new Map();
        this.stateData = new Map();
    }

    /**
     * Change to a new game state
     * @param {string} newState - The state to transition to
     * @param {Object} data - Optional data to pass with state change
     */
    changeState(newState, data = null) {
        if (!Object.values(GAME_STATES).includes(newState)) {
            throw new Error(`Invalid game state: ${newState}`);
        }

        const oldState = this.currentState;
        this.previousState = oldState;
        this.currentState = newState;

        if (data) {
            this.stateData.set(newState, data);
        }

        this.notifyStateChange(oldState, newState, data);
    }

    /**
     * Get current game state
     * @returns {string} Current state
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * Get data associated with current state
     * @returns {Object|null} State data
     */
    getStateData() {
        return this.stateData.get(this.currentState) || null;
    }

    /**
     * Add listener for state changes
     * @param {string} state - State to listen for
     * @param {Function} callback - Callback function
     */
    addStateChangeListener(state, callback) {
        if (!this.stateChangeListeners.has(state)) {
            this.stateChangeListeners.set(state, []);
        }
        this.stateChangeListeners.get(state).push(callback);
    }

    /**
     * Notify all listeners of state change
     * @private
     */
    notifyStateChange(oldState, newState, data) {
        const listeners = this.stateChangeListeners.get(newState) || [];
        listeners.forEach(callback => {
            try {
                callback(oldState, newState, data);
            } catch (error) {
                console.error('Error in state change listener:', error);
            }
        });
    }
}

/**
 * Main Game class implementing the core game loop
 */
class Game {
    constructor(canvasId = 'gameCanvas') {
        // Core components
        this.canvas = null;
        this.context = null;
        this.isRunning = false;
        this.isPaused = false;
        
        // Timing
        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedTimeStep = 1000 / GAME_CONFIG.TARGET_FPS;
        
        // Managers
        this.stateManager = new GameStateManager();
        this.performanceMonitor = new PerformanceMonitor();
        
        // Game loop
        this.animationFrameId = null;
        this.gameLoopBound = this.gameLoop.bind(this);
        
        // Error handling
        this.errorHandler = this.handleError.bind(this);
        window.addEventListener('error', this.errorHandler);
        window.addEventListener('unhandledrejection', this.errorHandler);
        
        // Initialize
        this.initializeCanvas(canvasId);
        this.setupEventListeners();
        
        console.log('Game initialized successfully');
    }

    /**
     * Initialize the game canvas
     * @param {string} canvasId - Canvas element ID
     * @private
     */
    initializeCanvas(canvasId) {
        try {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) {
                // Create canvas if it doesn't exist
                this.canvas = document.createElement('canvas');
                this.canvas.id = canvasId;
                this.canvas.width = GAME_CONFIG.CANVAS_WIDTH;
                this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
                document.body.appendChild(this.canvas);
            }

            this.context = this.canvas.getContext('2d');
            if (!this.context) {
                throw new Error('Failed to get 2D rendering context');
            }

            // Set canvas properties
            this.canvas.width = GAME_CONFIG.CANVAS_WIDTH;
            this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
            this.context.imageSmoothingEnabled = false; // Pixel-perfect rendering

        } catch (error) {
            this.handleError(error);
            throw new Error('Failed to initialize canvas: ' + error.message);
        }
    }

    /**
     * Setup event listeners for game control
     * @private
     */
    setupEventListeners() {
        // Visibility API for pause/resume
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else if (this.stateManager.getCurrentState() === GAME_STATES.PAUSED) {
                this.resume();
            }
        });

        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });

        document.addEventListener('keyup', (event) => {
            this.handleKeyUp(event);
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) {
            console.warn('Game is already running');
            return;
        }

        try {
            this.isRunning = true;
            this.isPaused = false;
            this.lastTime = performance.now();
            this.stateManager.changeState(GAME_STATES.PLAYING);
            
            // Start the game loop
            this.animationFrameId = requestAnimationFrame(this.gameLoopBound);
            
            console.log('Game started');
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Stop the game loop
     */
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.stateManager.changeState(GAME_STATES.MENU);
        console.log('Game stopped');
    }

    /**
     * Pause the game
     */
    pause() {
        if (!this.isRunning || this.isPaused) {
            return;
        }
        
        this.isPaused = true;
        this.stateManager.changeState(GAME_STATES.PAUSED);
        console.log('Game paused');
    }

    /**
     * Resume the game
     */
    resume() {
        if (!this.isRunning || !this.isPaused) {
            return;
        }
        
        this.isPaused = false;
        this.lastTime = performance.now(); // Reset timing
        this.stateManager.changeState(GAME_STATES.PLAYING);
        console.log('Game resumed');
    }

    /**
     * Main game loop using requestAnimationFrame
     * @param {number} currentTime - Current timestamp from requestAnimationFrame
     * @private
     */
    gameLoop(currentTime) {
        if (!this.isRunning) {
            return;
        }

        try {
            // Calculate delta time
            const deltaTime = Math.min(currentTime - this.lastTime, GAME_CONFIG.MAX_DELTA_TIME);
            this.lastTime = currentTime;

            // Record performance metrics
            if (deltaTime > 0) {
                this.performanceMonitor.recordFrame(deltaTime);
            }

            // Skip update if paused, but continue rendering
            if (!this.isPaused) {
                // Fixed timestep update with accumulator
                this.accumulator += deltaTime;
                
                while (this.accumulator >= this.fixedTimeStep) {
                    this.update(this.fixedTimeStep);
                    this.accumulator -= this.fixedTimeStep;
                }
            }

            // Always render (for pause screens, etc.)
            this.render(deltaTime);

            // Debug information
            if (GAME_CONFIG.DEBUG_MODE) {
                this.renderDebugInfo();
            }

            // Schedule next frame
            this.animationFrameId = requestAnimationFrame(this.gameLoopBound);

        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Update game logic
     * @param {number} deltaTime - Fixed time step in milliseconds
     * @private
     */
    update(deltaTime) {
        const currentState = this.stateManager.getCurrentState();
        
        switch (currentState) {
            case GAME_STATES.PLAYING:
                this.updateGameplay(deltaTime);
                break;
            case GAME_STATES.MENU:
                this.updateMenu(deltaTime);
                break;
            case GAME_STATES.GAME_OVER:
                this.updateGameOver(deltaTime);
                break;
            default:
                // Handle other states as needed
                break;
        }
    }

    /**
     * Update gameplay logic
     * @param {number} deltaTime - Time step in milliseconds
     * @private
     */
    updateGameplay(deltaTime) {
        // Placeholder for game-specific update logic
        // This would typically update:
        // - Player position and input
        // - Enemy movements and AI
        // - Projectiles and collisions
        // - Game state (score, lives, etc.)
    }

    /**
     * Update menu logic
     * @param {number} deltaTime - Time step in milliseconds
     * @private
     */
    updateMenu(deltaTime) {
        // Placeholder for menu update logic
    }

    /**
     * Update game over screen logic
     * @param {number} deltaTime - Time step in milliseconds
     * @private
     */
    updateGameOver(deltaTime) {
        // Placeholder for game over update logic
    }

    /**
     * Render the game
     * @param {number} deltaTime - Time since last frame in milliseconds
     * @private
     */
    render(deltaTime) {
        // Clear canvas
        this.context.fillStyle = '#000000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const currentState = this.stateManager.getCurrentState();
        
        switch (currentState) {
            case GAME_STATES.LOADING:
                this.renderLoading();
                break;
            case GAME_STATES.MENU:
                this.renderMenu();
                break;
            case GAME_STATES.PLAYING:
                this.renderGameplay();
                break;
            case GAME_STATES.PAUSED:
                this.renderGameplay(); // Render game behind pause overlay
                this.renderPauseOverlay();
                break;
            case GAME_STATES.GAME_OVER:
                this.renderGameOver();
                break;
            case GAME_STATES.ERROR:
                this.renderError();
                break;
            default:
                this.renderError();
                break;
        }
    }

    /**
     * Render loading screen
     * @private
     */
    renderLoading() {
        this.context.fillStyle = '#FFFFFF';
        this.context.font = '24px Arial';
        this.context.textAlign = 'center';
        this.context.fillText('Loading...', this.canvas.width / 2, this.canvas.height / 2);
    }

    /**
     * Render main menu
     * @private
     */
    renderMenu() {
        this.context.fillStyle = '#FFFFFF';
        this.context.font = '32px Arial';
        this.context.textAlign = 'center';
        this.context.fillText('SPACE INVADERS', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        this.context.font = '16px Arial';
        this.context.fillText('Press SPACE to Start', this.canvas.width / 2, this.canvas.height / 2 + 20);
        this.context.fillText('Press P to Pause/Resume', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }

    /**
     * Render gameplay
     * @private
     */
    renderGameplay() {
        // Placeholder for game rendering
        // This would typically render:
        // - Background/stars
        // - Player ship
        // - Enemies
        // - Projectiles
        // - UI elements (score, lives)
        
        this.context.fillStyle = '#00FF00';
        this.context.font = '16px Arial';
        this.context.textAlign = 'left';
        this.context.fillText('Game Running...', 10, 30);
    }

    /**
     * Render pause overlay
     * @private
     */
    renderPauseOverlay() {
        // Semi-transparent overlay
        this.context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.context.fillStyle = '#FFFFFF';
        this.context.font = '32px Arial';
        this.context.textAlign = 'center';
        this.context.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        
        this.context.font = '16px Arial';
        this.context.fillText('Press P to Resume', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }

    /**
     * Render game over screen
     * @private
     */
    renderGameOver() {
        this.context.fillStyle = '#FF0000';
        this.context.font = '32px Arial';
        this.context.textAlign = 'center';
        this.context.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
        
        this.context.fillStyle = '#FFFFFF';
        this.context.font = '16px Arial';
        this.context.fillText('Press R to Restart', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }

    /**
     * Render error screen
     * @private
     */
    renderError() {
        this.context.fillStyle = '#FF0000';
        this.context.font = '24px Arial';
        this.context.textAlign = 'center';
        this.context.fillText('ERROR', this.canvas.width / 2, this.canvas.height / 2);
        
        this.context.fillStyle = '#FFFFFF';
        this.context.font = '14px Arial';
        this.context.fillText('Something went wrong. Check console for details.', this.canvas.width / 2, this.canvas.height / 2 + 30);
    }

    /**
     * Render debug information
     * @private
     */
    renderDebugInfo() {
        const metrics = this.performanceMonitor.getMetrics();
        
        this.context.fillStyle = '#FFFF00';
        this.context.font = '12px monospace';
        this.context.textAlign = 'left';
        
        const debugInfo = [
            `FPS: ${metrics.averageFPS} (${metrics.minFPS}-${metrics.maxFPS})`,
            `State: ${this.stateManager.getCurrentState()}`,
            `Running: ${this.isRunning}`,
            `Paused: ${this.isPaused}`
        ];
        
        debugInfo.forEach((info, index) => {
            this.context.fillText(info, 10, 15 + (index * 15));
        });
    }

    /**
     * Handle keyboard input - key down
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    handleKeyDown(event) {
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                if (this.stateManager.getCurrentState() === GAME_STATES.MENU) {
                    this.start();
                }
                break;
            case 'KeyP':
                event.preventDefault();
                if (this.isPaused) {
                    this.resume();
                } else {
                    this.pause();
                }
                break;
            case 'KeyR':
                event.preventDefault();
                if (this.stateManager.getCurrentState() === GAME_STATES.GAME_OVER) {
                    this.restart();
                }
                break;
            case 'Escape':
                event.preventDefault();
                this.stop();
                break;
        }
    }

    /**
     * Handle keyboard input - key up
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    handleKeyUp(event) {
        // Handle key release events
    }

    /**
     * Handle window resize
     * @private
     */
    handleResize() {
        // Maintain aspect ratio or adjust canvas size as needed
        console.log('Window resized');
    }

    /**
     * Restart the game
     */
    restart() {
        this.stop();
        this.performanceMonitor.reset();
        this.stateManager.changeState(GAME_STATES.MENU);
        console.log('Game restarted');
    }

    /**
     * Handle errors gracefully
     * @param {Error|ErrorEvent} error - Error object or event
     * @private
     */
    handleError(error) {
        console.error('Game error:', error);
        
        // Stop the game loop to prevent cascading errors
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        this.stateManager.changeState(GAME_STATES.ERROR, { error });
        
        // Try to continue rendering error state
        try {
            this.render(0);
        } catch (renderError) {
            console.error('Failed to render error state:', renderError);
        }
    }

    /**
     * Get current performance metrics
     * @returns {Object} Performance statistics
     */
    getPerformanceMetrics() {
        return this.performanceMonitor.getMetrics();
    }

    /**
     * Get current game state
     * @returns {string} Current game state
     */
    getGameState() {
        return this.stateManager.getCurrentState();
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stop();
        
        // Remove event listeners
        window.removeEventListener('error', this.errorHandler);
        window.removeEventListener('unhandledrejection', this.errorHandler);
        
        // Clear canvas
        if (this.context) {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        console.log('Game destroyed');
    }
}

// Export for use in other modules or global scope
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, GameStateManager, PerformanceMonitor, GAME_STATES, GAME_CONFIG };
} else {
    window.Game = Game;
    window.GameStateManager = GameStateManager;
    window.PerformanceMonitor = PerformanceMonitor;
    window.GAME_STATES = GAME_STATES;
    window.GAME_CONFIG = GAME_CONFIG;
}