/**
 * Space Invaders Game - Main Game Module
 * 
 * This module implements the core game logic with a comprehensive keyboard input system
 * featuring key mapping, input buffering, and responsive controls for player movement
 * and actions. The architecture follows clean separation of concerns with modular
 * components for input handling, game state management, and rendering.
 * 
 * Key Features:
 * - Responsive keyboard input with customizable key mappings
 * - Input buffering for smooth gameplay
 * - Modular game state management
 * - Performance monitoring and error handling
 * - Canvas-based rendering system
 * 
 * Dependencies: None (self-contained implementation)
 * Browser Compatibility: Modern browsers with Canvas API support
 * 
 * @author Space Invaders Development Team
 * @version 1.0.6
 */

'use strict';

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

const GAME_CONFIG = {
    canvas: {
        width: 800,
        height: 600,
        backgroundColor: '#000000'
    },
    player: {
        width: 40,
        height: 30,
        speed: 5,
        color: '#00FF00',
        startX: 380,
        startY: 550
    },
    input: {
        bufferSize: 10,
        keyRepeatDelay: 150,
        keyRepeatRate: 50
    },
    performance: {
        targetFPS: 60,
        maxFrameTime: 16.67 // ~60 FPS
    }
};

const KEY_MAPPINGS = {
    // Movement keys
    MOVE_LEFT: ['ArrowLeft', 'KeyA'],
    MOVE_RIGHT: ['ArrowRight', 'KeyD'],
    MOVE_UP: ['ArrowUp', 'KeyW'],
    MOVE_DOWN: ['ArrowDown', 'KeyS'],
    
    // Action keys
    SHOOT: ['Space', 'Enter'],
    PAUSE: ['KeyP', 'Escape'],
    
    // System keys
    RESTART: ['KeyR'],
    MUTE: ['KeyM']
};

const GAME_STATES = {
    LOADING: 'loading',
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

// ============================================================================
// UTILITY CLASSES
// ============================================================================

/**
 * Vector2D utility class for position and movement calculations
 */
class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(vector) {
        return new Vector2D(this.x + vector.x, this.y + vector.y);
    }

    multiply(scalar) {
        return new Vector2D(this.x * scalar, this.y * scalar);
    }

    normalize() {
        const magnitude = Math.sqrt(this.x * this.x + this.y * this.y);
        if (magnitude === 0) return new Vector2D(0, 0);
        return new Vector2D(this.x / magnitude, this.y / magnitude);
    }

    clone() {
        return new Vector2D(this.x, this.y);
    }
}

/**
 * Performance monitor for tracking game performance metrics
 */
class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.lastTime = 0;
        this.fps = 0;
        this.frameTime = 0;
        this.metrics = {
            averageFPS: 0,
            minFPS: Infinity,
            maxFPS: 0,
            frameTimeHistory: []
        };
    }

    update(currentTime) {
        this.frameCount++;
        this.frameTime = currentTime - this.lastTime;
        
        if (this.frameTime > 0) {
            this.fps = 1000 / this.frameTime;
            this.updateMetrics();
        }
        
        this.lastTime = currentTime;
    }

    updateMetrics() {
        this.metrics.minFPS = Math.min(this.metrics.minFPS, this.fps);
        this.metrics.maxFPS = Math.max(this.metrics.maxFPS, this.fps);
        
        this.metrics.frameTimeHistory.push(this.frameTime);
        if (this.metrics.frameTimeHistory.length > 60) {
            this.metrics.frameTimeHistory.shift();
        }
        
        const avgFrameTime = this.metrics.frameTimeHistory.reduce((a, b) => a + b, 0) / 
                           this.metrics.frameTimeHistory.length;
        this.metrics.averageFPS = 1000 / avgFrameTime;
    }

    getMetrics() {
        return {
            currentFPS: Math.round(this.fps),
            averageFPS: Math.round(this.metrics.averageFPS),
            minFPS: Math.round(this.metrics.minFPS),
            maxFPS: Math.round(this.metrics.maxFPS),
            frameTime: Math.round(this.frameTime * 100) / 100
        };
    }
}

/**
 * Logger utility for structured logging with different levels
 */
class Logger {
    constructor(context = 'Game') {
        this.context = context;
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        };
        this.currentLevel = this.levels.INFO;
    }

    debug(message, data = null) {
        this.log('DEBUG', message, data);
    }

    info(message, data = null) {
        this.log('INFO', message, data);
    }

    warn(message, data = null) {
        this.log('WARN', message, data);
    }

    error(message, error = null) {
        this.log('ERROR', message, error);
    }

    log(level, message, data) {
        if (this.levels[level] < this.currentLevel) return;

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            context: this.context,
            message,
            data
        };

        console.log(`[${timestamp}] ${level} [${this.context}] ${message}`, data || '');
    }
}

// ============================================================================
// INPUT SYSTEM
// ============================================================================

/**
 * Comprehensive keyboard input manager with buffering and key mapping
 */
class InputManager {
    constructor() {
        this.logger = new Logger('InputManager');
        this.keyStates = new Map();
        this.keyBuffer = [];
        this.keyMappings = new Map();
        this.listeners = new Map();
        this.isEnabled = true;
        
        this.initializeKeyMappings();
        this.bindEventListeners();
        
        this.logger.info('InputManager initialized');
    }

    /**
     * Initialize key mappings from configuration
     */
    initializeKeyMappings() {
        for (const [action, keys] of Object.entries(KEY_MAPPINGS)) {
            this.keyMappings.set(action, keys);
        }
    }

    /**
     * Bind keyboard event listeners
     */
    bindEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Prevent default behavior for game keys
        document.addEventListener('keydown', (event) => {
            if (this.isGameKey(event.code)) {
                event.preventDefault();
            }
        });
    }

    /**
     * Handle keydown events
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyDown(event) {
        if (!this.isEnabled) return;

        const keyCode = event.code;
        const currentTime = Date.now();

        // Update key state
        if (!this.keyStates.has(keyCode)) {
            this.keyStates.set(keyCode, {
                pressed: true,
                justPressed: true,
                pressTime: currentTime,
                repeatTime: currentTime + GAME_CONFIG.input.keyRepeatDelay
            });

            // Add to buffer
            this.addToBuffer(keyCode);
            
            // Trigger action listeners
            this.triggerActionListeners(keyCode, 'keydown');
        } else {
            const keyState = this.keyStates.get(keyCode);
            keyState.pressed = true;
            
            // Handle key repeat
            if (currentTime >= keyState.repeatTime) {
                this.addToBuffer(keyCode);
                keyState.repeatTime = currentTime + GAME_CONFIG.input.keyRepeatRate;
                this.triggerActionListeners(keyCode, 'repeat');
            }
        }
    }

    /**
     * Handle keyup events
     * @param {KeyboardEvent} event - The keyboard event
     */
    handleKeyUp(event) {
        if (!this.isEnabled) return;

        const keyCode = event.code;
        
        if (this.keyStates.has(keyCode)) {
            const keyState = this.keyStates.get(keyCode);
            keyState.pressed = false;
            keyState.justPressed = false;
            
            this.triggerActionListeners(keyCode, 'keyup');
        }
    }

    /**
     * Add key to input buffer
     * @param {string} keyCode - The key code to add
     */
    addToBuffer(keyCode) {
        this.keyBuffer.push({
            key: keyCode,
            timestamp: Date.now()
        });

        // Maintain buffer size
        if (this.keyBuffer.length > GAME_CONFIG.input.bufferSize) {
            this.keyBuffer.shift();
        }
    }

    /**
     * Check if a key is currently pressed
     * @param {string} keyCode - The key code to check
     * @returns {boolean} True if key is pressed
     */
    isKeyPressed(keyCode) {
        const keyState = this.keyStates.get(keyCode);
        return keyState ? keyState.pressed : false;
    }

    /**
     * Check if a key was just pressed this frame
     * @param {string} keyCode - The key code to check
     * @returns {boolean} True if key was just pressed
     */
    isKeyJustPressed(keyCode) {
        const keyState = this.keyStates.get(keyCode);
        return keyState ? keyState.justPressed : false;
    }

    /**
     * Check if an action is currently active
     * @param {string} action - The action name
     * @returns {boolean} True if action is active
     */
    isActionPressed(action) {
        const keys = this.keyMappings.get(action);
        if (!keys) return false;

        return keys.some(key => this.isKeyPressed(key));
    }

    /**
     * Check if an action was just triggered
     * @param {string} action - The action name
     * @returns {boolean} True if action was just triggered
     */
    isActionJustPressed(action) {
        const keys = this.keyMappings.get(action);
        if (!keys) return false;

        return keys.some(key => this.isKeyJustPressed(key));
    }

    /**
     * Register a listener for specific actions
     * @param {string} action - The action name
     * @param {Function} callback - The callback function
     */
    addActionListener(action, callback) {
        if (!this.listeners.has(action)) {
            this.listeners.set(action, []);
        }
        this.listeners.get(action).push(callback);
    }

    /**
     * Trigger action listeners
     * @param {string} keyCode - The key code
     * @param {string} eventType - The event type
     */
    triggerActionListeners(keyCode, eventType) {
        for (const [action, keys] of this.keyMappings.entries()) {
            if (keys.includes(keyCode)) {
                const listeners = this.listeners.get(action);
                if (listeners) {
                    listeners.forEach(callback => {
                        try {
                            callback(action, eventType);
                        } catch (error) {
                            this.logger.error(`Error in action listener for ${action}`, error);
                        }
                    });
                }
            }
        }
    }

    /**
     * Check if a key is a game key
     * @param {string} keyCode - The key code
     * @returns {boolean} True if it's a game key
     */
    isGameKey(keyCode) {
        for (const keys of this.keyMappings.values()) {
            if (keys.includes(keyCode)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Clear just pressed states (call once per frame)
     */
    update() {
        for (const keyState of this.keyStates.values()) {
            keyState.justPressed = false;
        }
    }

    /**
     * Get input buffer and clear it
     * @returns {Array} The input buffer
     */
    consumeBuffer() {
        const buffer = [...this.keyBuffer];
        this.keyBuffer.length = 0;
        return buffer;
    }

    /**
     * Enable or disable input processing
     * @param {boolean} enabled - Whether input should be enabled
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (!enabled) {
            this.keyStates.clear();
            this.keyBuffer.length = 0;
        }
    }
}

// ============================================================================
// GAME ENTITIES
// ============================================================================

/**
 * Player entity with movement and rendering
 */
class Player {
    constructor(x, y) {
        this.position = new Vector2D(x, y);
        this.velocity = new Vector2D(0, 0);
        this.width = GAME_CONFIG.player.width;
        this.height = GAME_CONFIG.player.height;
        this.speed = GAME_CONFIG.player.speed;
        this.color = GAME_CONFIG.player.color;
        this.health = 100;
        this.maxHealth = 100;
        this.logger = new Logger('Player');
    }

    /**
     * Update player state based on input
     * @param {InputManager} inputManager - The input manager
     * @param {number} deltaTime - Time since last update
     */
    update(inputManager, deltaTime) {
        this.handleInput(inputManager);
        this.updatePosition(deltaTime);
        this.constrainToCanvas();
    }

    /**
     * Handle input for player movement
     * @param {InputManager} inputManager - The input manager
     */
    handleInput(inputManager) {
        this.velocity.x = 0;
        this.velocity.y = 0;

        if (inputManager.isActionPressed('MOVE_LEFT')) {
            this.velocity.x = -this.speed;
        }
        if (inputManager.isActionPressed('MOVE_RIGHT')) {
            this.velocity.x = this.speed;
        }
        if (inputManager.isActionPressed('MOVE_UP')) {
            this.velocity.y = -this.speed;
        }
        if (inputManager.isActionPressed('MOVE_DOWN')) {
            this.velocity.y = this.speed;
        }

        // Normalize diagonal movement
        if (this.velocity.x !== 0 && this.velocity.y !== 0) {
            const normalized = this.velocity.normalize();
            this.velocity = normalized.multiply(this.speed);
        }

        // Handle shooting
        if (inputManager.isActionJustPressed('SHOOT')) {
            this.shoot();
        }
    }

    /**
     * Update player position
     * @param {number} deltaTime - Time since last update
     */
    updatePosition(deltaTime) {
        this.position = this.position.add(this.velocity.multiply(deltaTime / 16.67));
    }

    /**
     * Constrain player to canvas bounds
     */
    constrainToCanvas() {
        this.position.x = Math.max(0, Math.min(GAME_CONFIG.canvas.width - this.width, this.position.x));
        this.position.y = Math.max(0, Math.min(GAME_CONFIG.canvas.height - this.height, this.position.y));
    }

    /**
     * Handle shooting action
     */
    shoot() {
        this.logger.info('Player shooting');
        // Shooting logic would be implemented here
    }

    /**
     * Render the player
     * @param {CanvasRenderingContext2D} ctx - The rendering context
     */
    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
        
        // Draw health bar
        this.renderHealthBar(ctx);
    }

    /**
     * Render player health bar
     * @param {CanvasRenderingContext2D} ctx - The rendering context
     */
    renderHealthBar(ctx) {
        const barWidth = this.width;
        const barHeight = 4;
        const barY = this.position.y - 8;
        
        // Background
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.position.x, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(this.position.x, barY, barWidth * healthPercent, barHeight);
    }

    /**
     * Get player bounds for collision detection
     * @returns {Object} Bounding box
     */
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.width,
            height: this.height
        };
    }
}

// ============================================================================
// GAME STATE MANAGEMENT
// ============================================================================

/**
 * Game state manager for handling different game states
 */
class GameStateManager {
    constructor() {
        this.currentState = GAME_STATES.LOADING;
        this.previousState = null;
        this.stateData = new Map();
        this.logger = new Logger('GameStateManager');
    }

    /**
     * Change to a new game state
     * @param {string} newState - The new state
     * @param {Object} data - Optional state data
     */
    changeState(newState, data = null) {
        if (!Object.values(GAME_STATES).includes(newState)) {
            this.logger.error(`Invalid game state: ${newState}`);
            return;
        }

        this.previousState = this.currentState;
        this.currentState = newState;
        
        if (data) {
            this.stateData.set(newState, data);
        }

        this.logger.info(`State changed from ${this.previousState} to ${this.currentState}`);
    }

    /**
     * Get current game state
     * @returns {string} Current state
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * Check if in specific state
     * @param {string} state - State to check
     * @returns {boolean} True if in specified state
     */
    isInState(state) {
        return this.currentState === state;
    }

    /**
     * Get state data
     * @param {string} state - State to get data for
     * @returns {Object|null} State data
     */
    getStateData(state) {
        return this.stateData.get(state) || null;
    }
}

// ============================================================================
// RENDERER
// ============================================================================

/**
 * Canvas renderer for game graphics
 */
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.logger = new Logger('Renderer');
        
        this.setupCanvas();
    }

    /**
     * Setup canvas properties
     */
    setupCanvas() {
        this.canvas.width = GAME_CONFIG.canvas.width;
        this.canvas.height = GAME_CONFIG.canvas.height;
        this.canvas.style.border = '1px solid #333';
        this.canvas.style.backgroundColor = GAME_CONFIG.canvas.backgroundColor;
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = GAME_CONFIG.canvas.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render debug information
     * @param {Object} debugInfo - Debug information to display
     */
    renderDebugInfo(debugInfo) {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '12px monospace';
        
        let y = 20;
        for (const [key, value] of Object.entries(debugInfo)) {
            this.ctx.fillText(`${key}: ${value}`, 10, y);
            y += 15;
        }
    }

    /**
     * Render game UI
     * @param {Object} gameData - Game data to display
     */
    renderUI(gameData) {
        // Score
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Score: ${gameData.score || 0}`, 10, 30);
        
        // Lives
        this.ctx.fillText(`Lives: ${gameData.lives || 3}`, 10, 60);
        
        // Level
        this.ctx.fillText(`Level: ${gameData.level || 1}`, 10, 90);
    }

    /**
     * Render pause overlay
     */
    renderPauseOverlay() {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Pause text
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press P to resume', this.canvas.width / 2, this.canvas.height / 2 + 40);
        
        this.ctx.textAlign = 'left';
    }

    /**
     * Render game over screen
     * @param {Object} gameData - Final game data
     */
    renderGameOver(gameData) {
        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Game over text
        this.ctx.fillStyle = '#FF0000';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 40);
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Final Score: ${gameData.score || 0}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press R to restart', this.canvas.width / 2, this.canvas.height / 2 + 60);
        
        this.ctx.textAlign = 'left';
    }
}

// ============================================================================
// MAIN GAME CLASS
// ============================================================================

/**
 * Main game class that orchestrates all game systems
 */
class Game {
    constructor(canvasId) {
        this.logger = new Logger('Game');
        this.canvas = document.getElementById(canvasId);
        
        if (!this.canvas) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }

        // Initialize core systems
        this.renderer = new Renderer(this.canvas);
        this.inputManager = new InputManager();
        this.stateManager = new GameStateManager();
        this.performanceMonitor = new PerformanceMonitor();
        
        // Game entities
        this.player = new Player(
            GAME_CONFIG.player.startX,
            GAME_CONFIG.player.startY
        );
        
        // Game state
        this.gameData = {
            score: 0,
            lives: 3,
            level: 1,
            isPaused: false
        };
        
        // Animation frame tracking
        this.lastFrameTime = 0;
        this.animationId = null;
        this.isRunning = false;
        
        this.initializeGame();
    }

    /**
     * Initialize game systems and event listeners
     */
    initializeGame() {
        this.setupInputListeners();
        this.stateManager.changeState(GAME_STATES.PLAYING);
        this.logger.info('Game initialized successfully');
    }

    /**
     * Setup input event listeners
     */
    setupInputListeners() {
        // Pause/Resume
        this.inputManager.addActionListener('PAUSE', (action, eventType) => {
            if (eventType === 'keydown') {
                this.togglePause();
            }
        });

        // Restart
        this.inputManager.addActionListener('RESTART', (action, eventType) => {
            if (eventType === 'keydown') {
                this.restart();
            }
        });

        // Mute (placeholder)
        this.inputManager.addActionListener('MUTE', (action, eventType) => {
            if (eventType === 'keydown') {
                this.logger.info('Mute toggled');
            }
        });
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) {
            this.logger.warn('Game is already running');
            return;
        }

        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.gameLoop();
        this.logger.info('Game started');
    }

    /**
     * Stop the game loop
     */
    stop() {
        if (!this.isRunning) {
            this.logger.warn('Game is not running');
            return;
        }

        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.logger.info('Game stopped');
    }

    /**
     * Main game loop
     * @param {number} currentTime - Current timestamp
     */
    gameLoop(currentTime = performance.now()) {
        if (!this.isRunning) return;

        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // Update performance metrics
        this.performanceMonitor.update(currentTime);

        // Update game systems
        this.update(deltaTime);
        this.render();

        // Schedule next frame
        this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
    }

    /**
     * Update game state
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        try {
            // Skip updates if paused
            if (this.stateManager.isInState(GAME_STATES.PAUSED)) {
                return;
            }

            // Update input manager
            this.inputManager.update();

            // Update game entities based on current state
            switch (this.stateManager.getCurrentState()) {
                case GAME_STATES.PLAYING:
                    this.updateGameplay(deltaTime);
                    break;
                case GAME_STATES.GAME_OVER:
                    this.updateGameOver(deltaTime);
                    break;
                default:
                    break;
            }

        } catch (error) {
            this.logger.error('Error in game update', error);
        }
    }

    /**
     * Update gameplay state
     * @param {number} deltaTime - Time since last update
     */
    updateGameplay(deltaTime) {
        // Update player
        this.player.update(this.inputManager, deltaTime);

        // Process input buffer for any missed inputs
        const inputBuffer = this.inputManager.consumeBuffer();
        if (inputBuffer.length > 0) {
            this.logger.debug(`Processed ${inputBuffer.length} buffered inputs`);
        }

        // Check for game over conditions
        if (this.gameData.lives <= 0) {
            this.stateManager.changeState(GAME_STATES.GAME_OVER);
        }
    }

    /**
     * Update game over state
     * @param {number} deltaTime - Time since last update
     */
    updateGameOver(deltaTime) {
        // Handle restart input
        if (this.inputManager.isActionJustPressed('RESTART')) {
            this.restart();
        }
    }

    /**
     * Render game graphics
     */
    render() {
        try {
            // Clear canvas
            this.renderer.clear();

            // Render based on current state
            switch (this.stateManager.getCurrentState()) {
                case GAME_STATES.PLAYING:
                    this.renderGameplay();
                    break;
                case GAME_STATES.PAUSED:
                    this.renderGameplay();
                    this.renderer.renderPauseOverlay();
                    break;
                case GAME_STATES.GAME_OVER:
                    this.renderGameplay();
                    this.renderer.renderGameOver(this.gameData);
                    break;
                default:
                    break;
            }

            // Render debug info if needed
            if (this.shouldShowDebugInfo()) {
                this.renderDebugInfo();
            }

        } catch (error) {
            this.logger.error('Error in game render', error);
        }
    }

    /**
     * Render gameplay elements
     */
    renderGameplay() {
        // Render UI
        this.renderer.renderUI(this.gameData);

        // Render player
        this.player.render(this.renderer.ctx);
    }

    /**
     * Render debug information
     */
    renderDebugInfo() {
        const metrics = this.performanceMonitor.getMetrics();
        const debugInfo = {
            FPS: metrics.currentFPS,
            'Avg FPS': metrics.averageFPS,
            'Frame Time': `${metrics.frameTime}ms`,
            State: this.stateManager.getCurrentState(),
            'Player X': Math.round(this.player.position.x),
            'Player Y': Math.round(this.player.position.y)
        };

        this.renderer.renderDebugInfo(debugInfo);
    }

    /**
     * Check if debug info should be shown
     * @returns {boolean} True if debug info should be shown
     */
    shouldShowDebugInfo() {
        // Show debug info in development or when performance is poor
        return window.location.hostname === 'localhost' || 
               this.performanceMonitor.getMetrics().currentFPS < 30;
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        if (this.stateManager.isInState(GAME_STATES.PLAYING)) {
            this.stateManager.changeState(GAME_STATES.PAUSED);
            this.inputManager.setEnabled(false);
            this.logger.info('Game paused');
        } else if (this.stateManager.isInState(GAME_STATES.PAUSED)) {
            this.stateManager.changeState(GAME_STATES.PLAYING);
            this.inputManager.setEnabled(true);
            this.logger.info('Game resumed');
        }
    }

    /**
     * Restart the game
     */
    restart() {
        this.logger.info('Restarting game');
        
        // Reset game data
        this.gameData = {
            score: 0,
            lives: 3,
            level: 1,
            isPaused: false
        };

        // Reset player
        this.player = new Player(
            GAME_CONFIG.player.startX,
            GAME_CONFIG.player.startY
        );

        // Reset state
        this.stateManager.changeState(GAME_STATES.PLAYING);
        this.inputManager.setEnabled(true);
    }

    /**
     * Get current game statistics
     * @returns {Object} Game statistics
     */
    getGameStats() {
        return {
            ...this.gameData,
            performance: this.performanceMonitor.getMetrics(),
            state: this.stateManager.getCurrentState(),
            uptime: performance.now()
        };
    }

    /**
     * Cleanup resources when game is destroyed
     */
    destroy() {
        this.stop();
        this.inputManager.setEnabled(false);
        this.logger.info('Game destroyed');
    }
}

// ============================================================================
// INITIALIZATION AND ERROR HANDLING
// ============================================================================

/**
 * Initialize the game when DOM is ready
 */
function initializeGame() {
    try {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeGame);
            return;
        }

        // Create canvas if it doesn't exist
        let canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'gameCanvas';
            document.body.appendChild(canvas);
        }

        // Initialize and start game
        const game = new Game('gameCanvas');
        game.start();

        // Make game globally accessible for debugging
        window.game = game;

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (game.stateManager.isInState(GAME_STATES.PLAYING)) {
                    game.togglePause();
                }
            }
        });

        console.log('🎮 Space Invaders Game initialized successfully!');
        console.log('🎯 Controls: Arrow keys or WASD to move, Space to shoot, P to pause, R to restart');

    } catch (error) {
        console.error('❌ Failed to initialize game:', error);
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff4444;
            color: white;
            padding: 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            text-align: center;
            z-index: 1000;
        `;
        errorDiv.innerHTML = `
            <h3>Game Initialization Failed</h3>
            <p>${error.message}</p>
            <p>Please refresh the page to try again.</p>
        `;
        document.body.appendChild(errorDiv);
    }
}

// ============================================================================
// GLOBAL ERROR HANDLING
// ============================================================================

// Handle uncaught errors
window.addEventListener('error', (event) => {
    console.error('🚨 Uncaught error:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
});

// ============================================================================
// MODULE EXPORTS AND INITIALIZATION
// ============================================================================

// Export classes for testing or external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Game,
        InputManager,
        Player,
        GameStateManager,
        Renderer,
        PerformanceMonitor,
        Logger,
        Vector2D,
        GAME_CONFIG,
        KEY_MAPPINGS,
        GAME_STATES
    };
} else {
    // Browser environment - initialize game
    initializeGame();
}