/**
 * Space Invaders Game - Main Game Module
 * 
 * This module implements the core game loop, player entity management,
 * sprite rendering system, and input handling for a Space Invaders game.
 * 
 * Architecture:
 * - Entity-Component pattern for game objects
 * - State management for game phases
 * - Event-driven input system
 * - Canvas-based rendering pipeline
 * 
 * Key Features:
 * - Player ship with movement and shooting
 * - Sprite-based rendering system
 * - Collision detection
 * - Game state management
 * - Performance monitoring
 * 
 * Dependencies: None (uses only browser APIs)
 * 
 * @author Space Invaders Development Team
 * @version 1.0.6
 */

'use strict';

/**
 * Vector2D utility class for position and movement calculations
 */
class Vector2D {
    /**
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    /**
     * Add another vector to this vector
     * @param {Vector2D} other - Vector to add
     * @returns {Vector2D} New vector result
     */
    add(other) {
        return new Vector2D(this.x + other.x, this.y + other.y);
    }

    /**
     * Multiply vector by scalar
     * @param {number} scalar - Multiplication factor
     * @returns {Vector2D} New vector result
     */
    multiply(scalar) {
        return new Vector2D(this.x * scalar, this.y * scalar);
    }

    /**
     * Get distance to another vector
     * @param {Vector2D} other - Target vector
     * @returns {number} Distance
     */
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Clone this vector
     * @returns {Vector2D} New vector copy
     */
    clone() {
        return new Vector2D(this.x, this.y);
    }
}

/**
 * Game constants and configuration
 */
const GAME_CONFIG = {
    CANVAS: {
        WIDTH: 800,
        HEIGHT: 600,
        BACKGROUND_COLOR: '#000011'
    },
    PLAYER: {
        WIDTH: 32,
        HEIGHT: 32,
        SPEED: 300, // pixels per second
        COLOR: '#00FF00',
        START_X: 400,
        START_Y: 550
    },
    PROJECTILE: {
        WIDTH: 4,
        HEIGHT: 12,
        SPEED: 400,
        COLOR: '#FFFF00',
        COOLDOWN: 200 // milliseconds
    },
    ENEMY: {
        WIDTH: 24,
        HEIGHT: 24,
        SPEED: 50,
        COLOR: '#FF0000',
        SPAWN_RATE: 2000 // milliseconds
    },
    PERFORMANCE: {
        TARGET_FPS: 60,
        FRAME_TIME: 1000 / 60
    }
};

/**
 * Input manager for handling keyboard and touch events
 */
class InputManager {
    constructor() {
        this.keys = new Set();
        this.touchActive = false;
        this.touchPosition = new Vector2D();
        this.callbacks = new Map();
        
        this._setupEventListeners();
        this._logInfo('InputManager initialized');
    }

    /**
     * Setup keyboard and touch event listeners
     * @private
     */
    _setupEventListeners() {
        try {
            // Keyboard events
            document.addEventListener('keydown', (e) => this._handleKeyDown(e));
            document.addEventListener('keyup', (e) => this._handleKeyUp(e));
            
            // Touch events for mobile support
            document.addEventListener('touchstart', (e) => this._handleTouchStart(e));
            document.addEventListener('touchmove', (e) => this._handleTouchMove(e));
            document.addEventListener('touchend', (e) => this._handleTouchEnd(e));
            
            // Prevent context menu on right click
            document.addEventListener('contextmenu', (e) => e.preventDefault());
            
        } catch (error) {
            this._logError('Failed to setup event listeners', error);
        }
    }

    /**
     * Handle keydown events
     * @private
     * @param {KeyboardEvent} event - Keyboard event
     */
    _handleKeyDown(event) {
        const key = event.code.toLowerCase();
        this.keys.add(key);
        
        // Trigger callbacks for specific keys
        if (this.callbacks.has(key)) {
            this.callbacks.get(key).forEach(callback => {
                try {
                    callback('down', event);
                } catch (error) {
                    this._logError(`Callback error for key ${key}`, error);
                }
            });
        }
        
        // Prevent default for game keys
        if (['space', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
            event.preventDefault();
        }
    }

    /**
     * Handle keyup events
     * @private
     * @param {KeyboardEvent} event - Keyboard event
     */
    _handleKeyUp(event) {
        const key = event.code.toLowerCase();
        this.keys.delete(key);
        
        if (this.callbacks.has(key)) {
            this.callbacks.get(key).forEach(callback => {
                try {
                    callback('up', event);
                } catch (error) {
                    this._logError(`Callback error for key ${key}`, error);
                }
            });
        }
    }

    /**
     * Handle touch start events
     * @private
     * @param {TouchEvent} event - Touch event
     */
    _handleTouchStart(event) {
        event.preventDefault();
        this.touchActive = true;
        const touch = event.touches[0];
        this.touchPosition.x = touch.clientX;
        this.touchPosition.y = touch.clientY;
    }

    /**
     * Handle touch move events
     * @private
     * @param {TouchEvent} event - Touch event
     */
    _handleTouchMove(event) {
        event.preventDefault();
        if (this.touchActive && event.touches.length > 0) {
            const touch = event.touches[0];
            this.touchPosition.x = touch.clientX;
            this.touchPosition.y = touch.clientY;
        }
    }

    /**
     * Handle touch end events
     * @private
     * @param {TouchEvent} event - Touch event
     */
    _handleTouchEnd(event) {
        event.preventDefault();
        this.touchActive = false;
    }

    /**
     * Check if a key is currently pressed
     * @param {string} key - Key code to check
     * @returns {boolean} True if key is pressed
     */
    isKeyPressed(key) {
        return this.keys.has(key.toLowerCase());
    }

    /**
     * Register callback for key events
     * @param {string} key - Key code
     * @param {Function} callback - Callback function
     */
    onKey(key, callback) {
        const keyLower = key.toLowerCase();
        if (!this.callbacks.has(keyLower)) {
            this.callbacks.set(keyLower, []);
        }
        this.callbacks.get(keyLower).push(callback);
    }

    /**
     * Get movement vector from input
     * @returns {Vector2D} Movement direction
     */
    getMovementVector() {
        const movement = new Vector2D();
        
        if (this.isKeyPressed('arrowleft') || this.isKeyPressed('keya')) {
            movement.x -= 1;
        }
        if (this.isKeyPressed('arrowright') || this.isKeyPressed('keyd')) {
            movement.x += 1;
        }
        if (this.isKeyPressed('arrowup') || this.isKeyPressed('keyw')) {
            movement.y -= 1;
        }
        if (this.isKeyPressed('arrowdown') || this.isKeyPressed('keys')) {
            movement.y += 1;
        }
        
        return movement;
    }

    /**
     * Check if shoot action is triggered
     * @returns {boolean} True if shooting
     */
    isShooting() {
        return this.isKeyPressed('space') || this.touchActive;
    }

    /**
     * Log info message
     * @private
     * @param {string} message - Message to log
     */
    _logInfo(message) {
        console.log(`[InputManager] ${message}`);
    }

    /**
     * Log error message
     * @private
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    _logError(message, error) {
        console.error(`[InputManager] ${message}:`, error);
    }
}

/**
 * Sprite renderer for drawing game entities
 */
class SpriteRenderer {
    /**
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     */
    constructor(context) {
        this.context = context;
        this.sprites = new Map();
        this._logInfo('SpriteRenderer initialized');
    }

    /**
     * Create a simple sprite from shape data
     * @param {string} id - Sprite identifier
     * @param {Object} config - Sprite configuration
     */
    createSprite(id, config) {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = config.width;
            canvas.height = config.height;
            const ctx = canvas.getContext('2d');
            
            // Draw based on sprite type
            switch (config.type) {
                case 'player':
                    this._drawPlayerSprite(ctx, config);
                    break;
                case 'enemy':
                    this._drawEnemySprite(ctx, config);
                    break;
                case 'projectile':
                    this._drawProjectileSprite(ctx, config);
                    break;
                default:
                    this._drawDefaultSprite(ctx, config);
            }
            
            this.sprites.set(id, canvas);
            this._logInfo(`Created sprite: ${id}`);
            
        } catch (error) {
            this._logError(`Failed to create sprite ${id}`, error);
        }
    }

    /**
     * Draw player sprite
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} config - Sprite configuration
     */
    _drawPlayerSprite(ctx, config) {
        const { width, height, color } = config;
        
        // Draw ship body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width * 0.8, height);
        ctx.lineTo(width * 0.2, height);
        ctx.closePath();
        ctx.fill();
        
        // Draw engine glow
        ctx.fillStyle = '#0088FF';
        ctx.fillRect(width * 0.4, height * 0.8, width * 0.2, height * 0.2);
    }

    /**
     * Draw enemy sprite
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} config - Sprite configuration
     */
    _drawEnemySprite(ctx, config) {
        const { width, height, color } = config;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(width / 2, height);
        ctx.lineTo(0, 0);
        ctx.lineTo(width, 0);
        ctx.closePath();
        ctx.fill();
        
        // Add details
        ctx.fillStyle = '#FFAA00';
        ctx.fillRect(width * 0.3, height * 0.3, width * 0.4, height * 0.2);
    }

    /**
     * Draw projectile sprite
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} config - Sprite configuration
     */
    _drawProjectileSprite(ctx, config) {
        const { width, height, color } = config;
        
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
        
        // Add glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.fillRect(0, 0, width, height);
        ctx.shadowBlur = 0;
    }

    /**
     * Draw default sprite
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} config - Sprite configuration
     */
    _drawDefaultSprite(ctx, config) {
        const { width, height, color } = config;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
    }

    /**
     * Render a sprite at given position
     * @param {string} spriteId - Sprite identifier
     * @param {Vector2D} position - Position to render at
     * @param {number} rotation - Rotation angle in radians
     */
    render(spriteId, position, rotation = 0) {
        const sprite = this.sprites.get(spriteId);
        if (!sprite) {
            this._logError(`Sprite not found: ${spriteId}`);
            return;
        }

        try {
            this.context.save();
            
            if (rotation !== 0) {
                this.context.translate(position.x + sprite.width / 2, position.y + sprite.height / 2);
                this.context.rotate(rotation);
                this.context.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
            } else {
                this.context.drawImage(sprite, position.x, position.y);
            }
            
            this.context.restore();
            
        } catch (error) {
            this._logError(`Failed to render sprite ${spriteId}`, error);
        }
    }

    /**
     * Log info message
     * @private
     * @param {string} message - Message to log
     */
    _logInfo(message) {
        console.log(`[SpriteRenderer] ${message}`);
    }

    /**
     * Log error message
     * @private
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    _logError(message, error) {
        console.error(`[SpriteRenderer] ${message}:`, error);
    }
}

/**
 * Player entity class
 */
class Player {
    /**
     * @param {Vector2D} position - Initial position
     */
    constructor(position) {
        this.position = position.clone();
        this.velocity = new Vector2D();
        this.size = new Vector2D(GAME_CONFIG.PLAYER.WIDTH, GAME_CONFIG.PLAYER.HEIGHT);
        this.health = 100;
        this.maxHealth = 100;
        this.lastShotTime = 0;
        this.active = true;
        
        this._logInfo('Player entity created');
    }

    /**
     * Update player state
     * @param {number} deltaTime - Time since last update in seconds
     * @param {InputManager} input - Input manager instance
     */
    update(deltaTime, input) {
        if (!this.active) return;

        try {
            // Get movement input
            const movement = input.getMovementVector();
            
            // Apply movement
            this.velocity = movement.multiply(GAME_CONFIG.PLAYER.SPEED);
            const deltaPosition = this.velocity.multiply(deltaTime);
            this.position = this.position.add(deltaPosition);
            
            // Constrain to screen bounds
            this._constrainToScreen();
            
        } catch (error) {
            this._logError('Failed to update player', error);
        }
    }

    /**
     * Constrain player position to screen boundaries
     * @private
     */
    _constrainToScreen() {
        const margin = 5;
        
        if (this.position.x < margin) {
            this.position.x = margin;
        }
        if (this.position.x > GAME_CONFIG.CANVAS.WIDTH - this.size.x - margin) {
            this.position.x = GAME_CONFIG.CANVAS.WIDTH - this.size.x - margin;
        }
        if (this.position.y < margin) {
            this.position.y = margin;
        }
        if (this.position.y > GAME_CONFIG.CANVAS.HEIGHT - this.size.y - margin) {
            this.position.y = GAME_CONFIG.CANVAS.HEIGHT - this.size.y - margin;
        }
    }

    /**
     * Check if player can shoot
     * @param {number} currentTime - Current timestamp
     * @returns {boolean} True if can shoot
     */
    canShoot(currentTime) {
        return currentTime - this.lastShotTime >= GAME_CONFIG.PROJECTILE.COOLDOWN;
    }

    /**
     * Shoot projectile
     * @param {number} currentTime - Current timestamp
     * @returns {Object|null} Projectile data or null
     */
    shoot(currentTime) {
        if (!this.canShoot(currentTime)) {
            return null;
        }

        this.lastShotTime = currentTime;
        
        return {
            position: new Vector2D(
                this.position.x + this.size.x / 2 - GAME_CONFIG.PROJECTILE.WIDTH / 2,
                this.position.y
            ),
            velocity: new Vector2D(0, -GAME_CONFIG.PROJECTILE.SPEED),
            size: new Vector2D(GAME_CONFIG.PROJECTILE.WIDTH, GAME_CONFIG.PROJECTILE.HEIGHT),
            type: 'player'
        };
    }

    /**
     * Get bounding box for collision detection
     * @returns {Object} Bounding box
     */
    getBounds() {
        return {
            x: this.position.x,
            y: this.position.y,
            width: this.size.x,
            height: this.size.y
        };
    }

    /**
     * Take damage
     * @param {number} amount - Damage amount
     */
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            this.active = false;
            this._logInfo('Player destroyed');
        }
    }

    /**
     * Log info message
     * @private
     * @param {string} message - Message to log
     */
    _logInfo(message) {
        console.log(`[Player] ${message}`);
    }

    /**
     * Log error message
     * @private
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    _logError(message, error) {
        console.error(`[Player] ${message}:`, error);
    }
}

/**
 * Main game class
 */
class Game {
    constructor() {
        this.canvas = null;
        this.context = null;
        this.inputManager = null;
        this.spriteRenderer = null;
        this.player = null;
        this.projectiles = [];
        this.enemies = [];
        
        this.lastTime = 0;
        this.lastEnemySpawn = 0;
        this.gameRunning = false;
        this.score = 0;
        
        this.performanceMetrics = {
            frameCount: 0,
            lastFpsUpdate: 0,
            currentFps: 0
        };
        
        this._logInfo('Game instance created');
    }

    /**
     * Initialize the game
     */
    async init() {
        try {
            await this._setupCanvas();
            this._setupManagers();
            this._createSprites();
            this._initializeEntities();
            this._setupEventListeners();
            
            this._logInfo('Game initialized successfully');
            
        } catch (error) {
            this._logError('Failed to initialize game', error);
            throw error;
        }
    }

    /**
     * Setup canvas and rendering context
     * @private
     */
    async _setupCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            // Create canvas if it doesn't exist
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'gameCanvas';
            this.canvas.width = GAME_CONFIG.CANVAS.WIDTH;
            this.canvas.height = GAME_CONFIG.CANVAS.HEIGHT;
            this.canvas.style.border = '1px solid #333';
            this.canvas.style.display = 'block';
            this.canvas.style.margin = '0 auto';
            document.body.appendChild(this.canvas);
        }

        this.context = this.canvas.getContext('2d');
        if (!this.context) {
            throw new Error('Failed to get 2D rendering context');
        }

        // Set canvas properties
        this.canvas.width = GAME_CONFIG.CANVAS.WIDTH;
        this.canvas.height = GAME_CONFIG.CANVAS.HEIGHT;
        
        this._logInfo('Canvas setup complete');
    }

    /**
     * Setup game managers
     * @private
     */
    _setupManagers() {
        this.inputManager = new InputManager();
        this.spriteRenderer = new SpriteRenderer(this.context);
        
        this._logInfo('Managers initialized');
    }

    /**
     * Create sprite assets
     * @private
     */
    _createSprites() {
        // Player sprite
        this.spriteRenderer.createSprite('player', {
            type: 'player',
            width: GAME_CONFIG.PLAYER.WIDTH,
            height: GAME_CONFIG.PLAYER.HEIGHT,
            color: GAME_CONFIG.PLAYER.COLOR
        });

        // Enemy sprite
        this.spriteRenderer.createSprite('enemy', {
            type: 'enemy',
            width: GAME_CONFIG.ENEMY.WIDTH,
            height: GAME_CONFIG.ENEMY.HEIGHT,
            color: GAME_CONFIG.ENEMY.COLOR
        });

        // Projectile sprite
        this.spriteRenderer.createSprite('projectile', {
            type: 'projectile',
            width: GAME_CONFIG.PROJECTILE.WIDTH,
            height: GAME_CONFIG.PROJECTILE.HEIGHT,
            color: GAME_CONFIG.PROJECTILE.COLOR
        });
        
        this._logInfo('Sprites created');
    }

    /**
     * Initialize game entities
     * @private
     */
    _initializeEntities() {
        const playerStartPos = new Vector2D(
            GAME_CONFIG.PLAYER.START_X - GAME_CONFIG.PLAYER.WIDTH / 2,
            GAME_CONFIG.PLAYER.START_Y
        );
        
        this.player = new Player(playerStartPos);
        this.projectiles = [];
        this.enemies = [];
        
        this._logInfo('Entities initialized');
    }

    /**
     * Setup additional event listeners
     * @private
     */
    _setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => this._handleResize());
        
        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
        
        this._logInfo('Event listeners setup');
    }

    /**
     * Handle window resize
     * @private
     */
    _handleResize() {
        // Could implement responsive canvas sizing here
        this._logInfo('Window resized');
    }

    /**
     * Start the game
     */
    start() {
        if (this.gameRunning) {
            this._logInfo('Game already running');
            return;
        }

        this.gameRunning = true;
        this.lastTime = performance.now();
        this._gameLoop();
        
        this._logInfo('Game started');
    }

    /**
     * Pause the game
     */
    pause() {
        this.gameRunning = false;
        this._logInfo('Game paused');
    }

    /**
     * Resume the game
     */
    resume() {
        if (this.gameRunning) return;
        
        this.gameRunning = true;
        this.lastTime = performance.now();
        this._gameLoop();
        
        this._logInfo('Game resumed');
    }

    /**
     * Main game loop
     * @private
     */
    _gameLoop() {
        if (!this.gameRunning) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        this.lastTime = currentTime;

        try {
            this._update(deltaTime, currentTime);
            this._render();
            this._updatePerformanceMetrics(currentTime);
            
        } catch (error) {
            this._logError('Error in game loop', error);
        }

        requestAnimationFrame(() => this._gameLoop());
    }

    /**
     * Update game state
     * @private
     * @param {number} deltaTime - Time since last update
     * @param {number} currentTime - Current timestamp
     */
    _update(deltaTime, currentTime) {
        // Update player
        if (this.player && this.player.active) {
            this.player.update(deltaTime, this.inputManager);
            
            // Handle shooting
            if (this.inputManager.isShooting()) {
                const projectile = this.player.shoot(currentTime);
                if (projectile) {
                    this.projectiles.push(projectile);
                }
            }
        }

        // Spawn enemies
        if (currentTime - this.lastEnemySpawn >= GAME_CONFIG.ENEMY.SPAWN_RATE) {
            this._spawnEnemy();
            this.lastEnemySpawn = currentTime;
        }

        // Update projectiles
        this._updateProjectiles(deltaTime);
        
        // Update enemies
        this._updateEnemies(deltaTime);
        
        // Check collisions
        this._checkCollisions();
        
        // Clean up inactive entities
        this._cleanupEntities();
    }

    /**
     * Spawn a new enemy
     * @private
     */
    _spawnEnemy() {
        const enemy = {
            position: new Vector2D(
                Math.random() * (GAME_CONFIG.CANVAS.WIDTH - GAME_CONFIG.ENEMY.WIDTH),
                -GAME_CONFIG.ENEMY.HEIGHT
            ),
            velocity: new Vector2D(0, GAME_CONFIG.ENEMY.SPEED),
            size: new Vector2D(GAME_CONFIG.ENEMY.WIDTH, GAME_CONFIG.ENEMY.HEIGHT),
            health: 1,
            active: true
        };
        
        this.enemies.push(enemy);
    }

    /**
     * Update projectiles
     * @private
     * @param {number} deltaTime - Time delta
     */
    _updateProjectiles(deltaTime) {
        for (const projectile of this.projectiles) {
            if (!projectile.active) continue;
            
            const deltaPosition = projectile.velocity.multiply(deltaTime);
            projectile.position = projectile.position.add(deltaPosition);
            
            // Remove projectiles that are off-screen
            if (projectile.position.y < -projectile.size.y || 
                projectile.position.y > GAME_CONFIG.CANVAS.HEIGHT) {
                projectile.active = false;
            }
        }
    }

    /**
     * Update enemies
     * @private
     * @param {number} deltaTime - Time delta
     */
    _updateEnemies(deltaTime) {
        for (const enemy of this.enemies) {
            if (!enemy.active) continue;
            
            const deltaPosition = enemy.velocity.multiply(deltaTime);
            enemy.position = enemy.position.add(deltaPosition);
            
            // Remove enemies that are off-screen
            if (enemy.position.y > GAME_CONFIG.CANVAS.HEIGHT) {
                enemy.active = false;
            }
        }
    }

    /**
     * Check collisions between entities
     * @private
     */
    _checkCollisions() {
        // Check projectile-enemy collisions
        for (const projectile of this.projectiles) {
            if (!projectile.active || projectile.type !== 'player') continue;
            
            for (const enemy of this.enemies) {
                if (!enemy.active) continue;
                
                if (this._checkCollision(projectile, enemy)) {
                    projectile.active = false;
                    enemy.active = false;
                    this.score += 10;
                }
            }
        }

        // Check player-enemy collisions
        if (this.player && this.player.active) {
            for (const enemy of this.enemies) {
                if (!enemy.active) continue;
                
                if (this._checkCollision(this.player, enemy)) {
                    enemy.active = false;
                    this.player.takeDamage(20);
                }
            }
        }
    }

    /**
     * Check collision between two entities
     * @private
     * @param {Object} a - First entity
     * @param {Object} b - Second entity
     * @returns {boolean} True if collision detected
     */
    _checkCollision(a, b) {
        return a.position.x < b.position.x + b.size.x &&
               a.position.x + a.size.x > b.position.x &&
               a.position.y < b.position.y + b.size.y &&
               a.position.y + a.size.y > b.position.y;
    }

    /**
     * Clean up inactive entities
     * @private
     */
    _cleanupEntities() {
        this.projectiles = this.projectiles.filter(p => p.active);
        this.enemies = this.enemies.filter(e => e.active);
    }

    /**
     * Render the game
     * @private
     */
    _render() {
        // Clear canvas
        this.context.fillStyle = GAME_CONFIG.CANVAS.BACKGROUND_COLOR;
        this.context.fillRect(0, 0, GAME_CONFIG.CANVAS.WIDTH, GAME_CONFIG.CANVAS.HEIGHT);

        // Render player
        if (this.player && this.player.active) {
            this.spriteRenderer.render('player', this.player.position);
        }

        // Render projectiles
        for (const projectile of this.projectiles) {
            if (projectile.active) {
                this.spriteRenderer.render('projectile', projectile.position);
            }
        }

        // Render enemies
        for (const enemy of this.enemies) {
            if (enemy.active) {
                this.spriteRenderer.render('enemy', enemy.position);
            }
        }

        // Render UI
        this._renderUI();
    }

    /**
     * Render UI elements
     * @private
     */
    _renderUI() {
        this.context.fillStyle = '#FFFFFF';
        this.context.font = '16px Arial';
        
        // Score
        this.context.fillText(`Score: ${this.score}`, 10, 30);
        
        // Health
        if (this.player) {
            this.context.fillText(`Health: ${this.player.health}`, 10, 50);
        }
        
        // FPS
        this.context.fillText(`FPS: ${this.performanceMetrics.currentFps}`, 10, 70);
        
        // Game over screen
        if (this.player && !this.player.active) {
            this.context.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.context.fillRect(0, 0, GAME_CONFIG.CANVAS.WIDTH, GAME_CONFIG.CANVAS.HEIGHT);
            
            this.context.fillStyle = '#FFFFFF';
            this.context.font = '48px Arial';
            this.context.textAlign = 'center';
            this.context.fillText('GAME OVER', GAME_CONFIG.CANVAS.WIDTH / 2, GAME_CONFIG.CANVAS.HEIGHT / 2);
            this.context.font = '24px Arial';
            this.context.fillText(`Final Score: ${this.score}`, GAME_CONFIG.CANVAS.WIDTH / 2, GAME_CONFIG.CANVAS.HEIGHT / 2 + 50);
            this.context.textAlign = 'left';
        }
    }

    /**
     * Update performance metrics
     * @private
     * @param {number} currentTime - Current timestamp
     */
    _updatePerformanceMetrics(currentTime) {
        this.performanceMetrics.frameCount++;
        
        if (currentTime - this.performanceMetrics.lastFpsUpdate >= 1000) {
            this.performanceMetrics.currentFps = this.performanceMetrics.frameCount;
            this.performanceMetrics.frameCount = 0;
            this.performanceMetrics.lastFpsUpdate = currentTime;
        }
    }

    /**
     * Get current game state
     * @returns {Object} Game state information
     */
    getGameState() {
        return {
            running: this.gameRunning,
            score: this.score,
            playerActive: this.player ? this.player.active : false,
            playerHealth: this.player ? this.player.health : 0,
            enemyCount: this.enemies.filter(e => e.active).length,
            projectileCount: this.projectiles.filter(p => p.active).length,
            fps: this.performanceMetrics.currentFps
        };
    }

    /**
     * Log info message
     * @private
     * @param {string} message - Message to log
     */
    _logInfo(message) {
        console.log(`[Game] ${message}`);
    }

    /**
     * Log error message
     * @private
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    _logError(message, error) {
        console.error(`[Game] ${message}:`, error);
    }
}

/**
 * Initialize and start the game when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const game = new Game();
        await game.init();
        game.start();
        
        // Expose game instance for debugging
        window.game = game;
        
        console.log('[SpaceInvaders] Game loaded successfully');
        console.log('[SpaceInvaders] Controls: Arrow keys or WASD to move, Space to shoot');
        
    } catch (error) {
        console.error('[SpaceInvaders] Failed to start game:', error);
        
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
            <h3>Game Failed to Load</h3>
            <p>Please refresh the page and try again.</p>
            <p><small>Error: ${error.message}</small></p>
        `;
        document.body.appendChild(errorDiv);
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game, Player, InputManager, SpriteRenderer, Vector2D };
}