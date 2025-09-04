/**
 * Player Entity with Integrated Keyboard Input System
 * 
 * This module implements a comprehensive player entity that handles:
 * - Keyboard input with key mapping and buffering
 * - Smooth movement with velocity-based physics
 * - Action handling (shooting, special abilities)
 * - State management and collision detection
 * - Performance optimization with input debouncing
 * 
 * Architecture:
 * - Event-driven input system with configurable key bindings
 * - Component-based entity design for modularity
 * - Observer pattern for state changes
 * - Strategy pattern for different movement modes
 * 
 * Dependencies: None (self-contained implementation)
 * Browser Compatibility: ES6+ (Chrome 60+, Firefox 55+, Safari 12+)
 */

'use strict';

/**
 * Vector2D utility class for position and velocity calculations
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
     * @returns {Vector2D} New scaled vector
     */
    multiply(scalar) {
        return new Vector2D(this.x * scalar, this.y * scalar);
    }

    /**
     * Get vector magnitude
     * @returns {number} Vector length
     */
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Normalize vector to unit length
     * @returns {Vector2D} Normalized vector
     */
    normalize() {
        const mag = this.magnitude();
        return mag > 0 ? new Vector2D(this.x / mag, this.y / mag) : new Vector2D(0, 0);
    }

    /**
     * Create copy of vector
     * @returns {Vector2D} Cloned vector
     */
    clone() {
        return new Vector2D(this.x, this.y);
    }
}

/**
 * Input buffer for storing and processing input commands
 */
class InputBuffer {
    /**
     * @param {number} maxSize - Maximum buffer size
     * @param {number} timeWindow - Time window for input validity (ms)
     */
    constructor(maxSize = 10, timeWindow = 100) {
        this.buffer = [];
        this.maxSize = maxSize;
        this.timeWindow = timeWindow;
    }

    /**
     * Add input to buffer with timestamp
     * @param {string} action - Action name
     * @param {Object} data - Additional input data
     */
    addInput(action, data = {}) {
        const input = {
            action,
            data,
            timestamp: performance.now()
        };

        this.buffer.push(input);
        
        // Maintain buffer size
        if (this.buffer.length > this.maxSize) {
            this.buffer.shift();
        }

        // Clean old inputs
        this.cleanOldInputs();
    }

    /**
     * Get recent inputs within time window
     * @returns {Array} Recent input commands
     */
    getRecentInputs() {
        this.cleanOldInputs();
        return [...this.buffer];
    }

    /**
     * Check if specific action exists in recent inputs
     * @param {string} action - Action to check
     * @returns {boolean} True if action found
     */
    hasRecentAction(action) {
        return this.getRecentInputs().some(input => input.action === action);
    }

    /**
     * Remove inputs older than time window
     * @private
     */
    cleanOldInputs() {
        const now = performance.now();
        this.buffer = this.buffer.filter(input => 
            now - input.timestamp <= this.timeWindow
        );
    }

    /**
     * Clear all buffered inputs
     */
    clear() {
        this.buffer = [];
    }
}

/**
 * Keyboard input manager with key mapping and event handling
 */
class KeyboardInputManager {
    constructor() {
        this.keyStates = new Map();
        this.keyBindings = new Map();
        this.inputBuffer = new InputBuffer();
        this.listeners = new Map();
        this.isEnabled = true;
        
        // Default key bindings
        this.setupDefaultBindings();
        
        // Bind event handlers
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        
        // Start listening for keyboard events
        this.startListening();
    }

    /**
     * Setup default key bindings for player controls
     * @private
     */
    setupDefaultBindings() {
        const defaultBindings = {
            // Movement
            'ArrowLeft': 'move_left',
            'KeyA': 'move_left',
            'ArrowRight': 'move_right',
            'KeyD': 'move_right',
            'ArrowUp': 'move_up',
            'KeyW': 'move_up',
            'ArrowDown': 'move_down',
            'KeyS': 'move_down',
            
            // Actions
            'Space': 'shoot',
            'KeyX': 'shoot',
            'KeyZ': 'special_ability',
            'ShiftLeft': 'boost',
            'ShiftRight': 'boost',
            
            // Game controls
            'Escape': 'pause',
            'KeyP': 'pause',
            'KeyR': 'restart'
        };

        Object.entries(defaultBindings).forEach(([key, action]) => {
            this.keyBindings.set(key, action);
        });
    }

    /**
     * Start listening for keyboard events
     * @private
     */
    startListening() {
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', this.handleKeyDown, { passive: false });
            window.addEventListener('keyup', this.handleKeyUp, { passive: false });
            
            // Prevent context menu on right-click during gameplay
            window.addEventListener('contextmenu', (e) => {
                if (this.isEnabled) {
                    e.preventDefault();
                }
            });
        }
    }

    /**
     * Stop listening for keyboard events
     */
    stopListening() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('keydown', this.handleKeyDown);
            window.removeEventListener('keyup', this.handleKeyUp);
        }
    }

    /**
     * Handle keydown events
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    handleKeyDown(event) {
        if (!this.isEnabled) return;

        const key = event.code;
        const action = this.keyBindings.get(key);

        if (action) {
            // Prevent default browser behavior for game keys
            event.preventDefault();
            
            // Update key state
            if (!this.keyStates.get(key)) {
                this.keyStates.set(key, true);
                
                // Add to input buffer
                this.inputBuffer.addInput(action, {
                    key,
                    type: 'keydown',
                    timestamp: event.timeStamp
                });

                // Notify listeners
                this.notifyListeners(action, { type: 'start', key, event });
            }
        }
    }

    /**
     * Handle keyup events
     * @param {KeyboardEvent} event - Keyboard event
     * @private
     */
    handleKeyUp(event) {
        if (!this.isEnabled) return;

        const key = event.code;
        const action = this.keyBindings.get(key);

        if (action) {
            event.preventDefault();
            
            // Update key state
            this.keyStates.set(key, false);
            
            // Add to input buffer
            this.inputBuffer.addInput(action + '_end', {
                key,
                type: 'keyup',
                timestamp: event.timeStamp
            });

            // Notify listeners
            this.notifyListeners(action, { type: 'end', key, event });
        }
    }

    /**
     * Check if a key is currently pressed
     * @param {string} key - Key code to check
     * @returns {boolean} True if key is pressed
     */
    isKeyPressed(key) {
        return this.keyStates.get(key) || false;
    }

    /**
     * Check if an action is currently active
     * @param {string} action - Action name to check
     * @returns {boolean} True if action is active
     */
    isActionActive(action) {
        for (const [key, boundAction] of this.keyBindings) {
            if (boundAction === action && this.isKeyPressed(key)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get all currently active actions
     * @returns {Array<string>} List of active actions
     */
    getActiveActions() {
        const activeActions = new Set();
        
        for (const [key, action] of this.keyBindings) {
            if (this.isKeyPressed(key)) {
                activeActions.add(action);
            }
        }
        
        return Array.from(activeActions);
    }

    /**
     * Bind a key to an action
     * @param {string} key - Key code
     * @param {string} action - Action name
     */
    bindKey(key, action) {
        this.keyBindings.set(key, action);
    }

    /**
     * Unbind a key
     * @param {string} key - Key code to unbind
     */
    unbindKey(key) {
        this.keyBindings.delete(key);
    }

    /**
     * Add event listener for specific action
     * @param {string} action - Action name
     * @param {Function} callback - Callback function
     */
    addEventListener(action, callback) {
        if (!this.listeners.has(action)) {
            this.listeners.set(action, []);
        }
        this.listeners.get(action).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} action - Action name
     * @param {Function} callback - Callback function to remove
     */
    removeEventListener(action, callback) {
        const actionListeners = this.listeners.get(action);
        if (actionListeners) {
            const index = actionListeners.indexOf(callback);
            if (index > -1) {
                actionListeners.splice(index, 1);
            }
        }
    }

    /**
     * Notify all listeners for an action
     * @param {string} action - Action name
     * @param {Object} data - Event data
     * @private
     */
    notifyListeners(action, data) {
        const actionListeners = this.listeners.get(action);
        if (actionListeners) {
            actionListeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in input listener for action ${action}:`, error);
                }
            });
        }
    }

    /**
     * Enable/disable input processing
     * @param {boolean} enabled - Whether input should be processed
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (!enabled) {
            this.keyStates.clear();
            this.inputBuffer.clear();
        }
    }

    /**
     * Get input buffer for advanced input processing
     * @returns {InputBuffer} Current input buffer
     */
    getInputBuffer() {
        return this.inputBuffer;
    }

    /**
     * Reset all input states
     */
    reset() {
        this.keyStates.clear();
        this.inputBuffer.clear();
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopListening();
        this.keyStates.clear();
        this.listeners.clear();
        this.inputBuffer.clear();
    }
}

/**
 * Player entity with integrated input handling and game mechanics
 */
class Player {
    /**
     * @param {Object} config - Player configuration
     */
    constructor(config = {}) {
        // Position and movement
        this.position = new Vector2D(config.x || 400, config.y || 550);
        this.velocity = new Vector2D(0, 0);
        this.acceleration = new Vector2D(0, 0);
        
        // Physical properties
        this.width = config.width || 48;
        this.height = config.height || 32;
        this.maxSpeed = config.maxSpeed || 300;
        this.accelerationRate = config.accelerationRate || 1200;
        this.friction = config.friction || 0.85;
        
        // Game mechanics
        this.health = config.health || 100;
        this.maxHealth = config.maxHealth || 100;
        this.energy = config.energy || 100;
        this.maxEnergy = config.maxEnergy || 100;
        this.score = 0;
        this.lives = config.lives || 3;
        
        // Combat properties
        this.fireRate = config.fireRate || 250; // ms between shots
        this.lastShotTime = 0;
        this.damage = config.damage || 25;
        this.canShoot = true;
        
        // State management
        this.isAlive = true;
        this.isInvulnerable = false;
        this.invulnerabilityDuration = 2000; // ms
        this.invulnerabilityStartTime = 0;
        
        // Visual properties
        this.color = config.color || '#00ff00';
        this.trailColor = config.trailColor || '#00aa00';
        this.rotation = 0;
        this.scale = 1;
        
        // Boundaries
        this.bounds = {
            left: 0,
            right: config.canvasWidth || 800,
            top: 0,
            bottom: config.canvasHeight || 600
        };
        
        // Input system
        this.inputManager = new KeyboardInputManager();
        this.setupInputHandlers();
        
        // Event system
        this.eventListeners = new Map();
        
        // Performance tracking
        this.lastUpdateTime = performance.now();
        this.frameCount = 0;
        
        // Initialize systems
        this.initialize();
    }

    /**
     * Initialize player systems
     * @private
     */
    initialize() {
        // Setup input event handlers
        this.setupInputHandlers();
        
        // Initialize visual effects
        this.initializeEffects();
        
        // Log initialization
        this.log('Player initialized', {
            position: this.position,
            health: this.health,
            maxSpeed: this.maxSpeed
        });
    }

    /**
     * Setup input event handlers
     * @private
     */
    setupInputHandlers() {
        // Movement handlers
        this.inputManager.addEventListener('move_left', () => {
            this.acceleration.x = -this.accelerationRate;
        });
        
        this.inputManager.addEventListener('move_right', () => {
            this.acceleration.x = this.accelerationRate;
        });
        
        this.inputManager.addEventListener('move_up', () => {
            this.acceleration.y = -this.accelerationRate;
        });
        
        this.inputManager.addEventListener('move_down', () => {
            this.acceleration.y = this.accelerationRate;
        });
        
        // Action handlers
        this.inputManager.addEventListener('shoot', () => {
            this.shoot();
        });
        
        this.inputManager.addEventListener('special_ability', () => {
            this.useSpecialAbility();
        });
        
        this.inputManager.addEventListener('boost', () => {
            this.activateBoost();
        });
    }

    /**
     * Initialize visual effects
     * @private
     */
    initializeEffects() {
        this.effects = {
            trail: [],
            particles: [],
            maxTrailLength: 10
        };
    }

    /**
     * Update player state
     * @param {number} deltaTime - Time since last update (ms)
     */
    update(deltaTime) {
        if (!this.isAlive) return;

        const dt = deltaTime / 1000; // Convert to seconds
        
        try {
            // Update input processing
            this.processInput(dt);
            
            // Update physics
            this.updatePhysics(dt);
            
            // Update game mechanics
            this.updateGameMechanics(dt);
            
            // Update visual effects
            this.updateEffects(dt);
            
            // Update invulnerability
            this.updateInvulnerability();
            
            // Constrain to bounds
            this.constrainToBounds();
            
            // Update performance metrics
            this.updateMetrics();
            
        } catch (error) {
            this.handleError('Update error', error);
        }
    }

    /**
     * Process input and update acceleration
     * @param {number} deltaTime - Delta time in seconds
     * @private
     */
    processInput(deltaTime) {
        // Reset acceleration
        this.acceleration.x = 0;
        this.acceleration.y = 0;
        
        // Process movement input
        const activeActions = this.inputManager.getActiveActions();
        
        activeActions.forEach(action => {
            switch (action) {
                case 'move_left':
                    this.acceleration.x -= this.accelerationRate;
                    break;
                case 'move_right':
                    this.acceleration.x += this.accelerationRate;
                    break;
                case 'move_up':
                    this.acceleration.y -= this.accelerationRate;
                    break;
                case 'move_down':
                    this.acceleration.y += this.accelerationRate;
                    break;
                case 'shoot':
                    this.shoot();
                    break;
                case 'boost':
                    this.activateBoost();
                    break;
            }
        });
        
        // Normalize diagonal movement
        if (this.acceleration.magnitude() > this.accelerationRate) {
            this.acceleration = this.acceleration.normalize().multiply(this.accelerationRate);
        }
    }

    /**
     * Update physics simulation
     * @param {number} deltaTime - Delta time in seconds
     * @private
     */
    updatePhysics(deltaTime) {
        // Apply acceleration to velocity
        this.velocity = this.velocity.add(this.acceleration.multiply(deltaTime));
        
        // Apply friction when no input
        if (this.acceleration.magnitude() === 0) {
            this.velocity = this.velocity.multiply(Math.pow(this.friction, deltaTime * 60));
        }
        
        // Limit velocity to max speed
        if (this.velocity.magnitude() > this.maxSpeed) {
            this.velocity = this.velocity.normalize().multiply(this.maxSpeed);
        }
        
        // Update position
        this.position = this.position.add(this.velocity.multiply(deltaTime));
        
        // Update rotation based on movement
        if (this.velocity.magnitude() > 10) {
            this.rotation = Math.atan2(this.velocity.y, this.velocity.x) + Math.PI / 2;
        }
    }

    /**
     * Update game mechanics (health, energy, etc.)
     * @param {number} deltaTime - Delta time in seconds
     * @private
     */
    updateGameMechanics(deltaTime) {
        // Regenerate energy
        if (this.energy < this.maxEnergy) {
            this.energy = Math.min(this.maxEnergy, this.energy + 20 * deltaTime);
        }
        
        // Update shooting cooldown
        const now = performance.now();
        this.canShoot = (now - this.lastShotTime) >= this.fireRate;
    }

    /**
     * Update visual effects
     * @param {number} deltaTime - Delta time in seconds
     * @private
     */
    updateEffects(deltaTime) {
        // Update trail
        if (this.velocity.magnitude() > 50) {
            this.effects.trail.push({
                position: this.position.clone(),
                timestamp: performance.now(),
                alpha: 1.0
            });
            
            // Limit trail length
            if (this.effects.trail.length > this.effects.maxTrailLength) {
                this.effects.trail.shift();
            }
        }
        
        // Update trail alpha
        const now = performance.now();
        this.effects.trail = this.effects.trail.filter(point => {
            const age = now - point.timestamp;
            point.alpha = Math.max(0, 1 - age / 500);
            return point.alpha > 0;
        });
    }

    /**
     * Update invulnerability state
     * @private
     */
    updateInvulnerability() {
        if (this.isInvulnerable) {
            const elapsed = performance.now() - this.invulnerabilityStartTime;
            if (elapsed >= this.invulnerabilityDuration) {
                this.isInvulnerable = false;
                this.emit('invulnerability_end');
            }
        }
    }

    /**
     * Constrain player to screen bounds
     * @private
     */
    constrainToBounds() {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        // Horizontal bounds
        if (this.position.x - halfWidth < this.bounds.left) {
            this.position.x = this.bounds.left + halfWidth;
            this.velocity.x = Math.max(0, this.velocity.x);
        } else if (this.position.x + halfWidth > this.bounds.right) {
            this.position.x = this.bounds.right - halfWidth;
            this.velocity.x = Math.min(0, this.velocity.x);
        }
        
        // Vertical bounds
        if (this.position.y - halfHeight < this.bounds.top) {
            this.position.y = this.bounds.top + halfHeight;
            this.velocity.y = Math.max(0, this.velocity.y);
        } else if (this.position.y + halfHeight > this.bounds.bottom) {
            this.position.y = this.bounds.bottom - halfHeight;
            this.velocity.y = Math.min(0, this.velocity.y);
        }
    }

    /**
     * Update performance metrics
     * @private
     */
    updateMetrics() {
        this.frameCount++;
        this.lastUpdateTime = performance.now();
    }

    /**
     * Shoot projectile
     */
    shoot() {
        if (!this.canShoot || !this.isAlive || this.energy < 10) {
            return false;
        }
        
        try {
            // Create projectile data
            const projectileData = {
                position: this.position.clone(),
                velocity: new Vector2D(0, -800), // Shoot upward
                damage: this.damage,
                owner: 'player',
                timestamp: performance.now()
            };
            
            // Consume energy
            this.energy = Math.max(0, this.energy - 10);
            
            // Update shooting state
            this.lastShotTime = performance.now();
            this.canShoot = false;
            
            // Emit shoot event
            this.emit('shoot', projectileData);
            
            this.log('Player shot fired', { energy: this.energy });
            return true;
            
        } catch (error) {
            this.handleError('Shooting error', error);
            return false;
        }
    }

    /**
     * Use special ability
     */
    useSpecialAbility() {
        if (this.energy < 50 || !this.isAlive) {
            return false;
        }
        
        try {
            // Consume energy
            this.energy = Math.max(0, this.energy - 50);
            
            // Activate temporary invulnerability
            this.makeInvulnerable(1000);
            
            // Emit special ability event
            this.emit('special_ability', {
                type: 'shield',
                duration: 1000,
                position: this.position.clone()
            });
            
            this.log('Special ability used', { energy: this.energy });
            return true;
            
        } catch (error) {
            this.handleError('Special ability error', error);
            return false;
        }
    }

    /**
     * Activate speed boost
     */
    activateBoost() {
        if (this.energy < 20 || !this.isAlive) {
            return false;
        }
        
        try {
            // Consume energy
            this.energy = Math.max(0, this.energy - 20);
            
            // Temporarily increase max speed
            const originalMaxSpeed = this.maxSpeed;
            this.maxSpeed *= 1.5;
            
            // Reset after duration
            setTimeout(() => {
                this.maxSpeed = originalMaxSpeed;
            }, 2000);
            
            // Emit boost event
            this.emit('boost', {
                speedMultiplier: 1.5,
                duration: 2000
            });
            
            this.log('Boost activated', { energy: this.energy });
            return true;
            
        } catch (error) {
            this.handleError('Boost error', error);
            return false;
        }
    }

    /**
     * Take damage
     * @param {number} amount - Damage amount
     * @param {Object} source - Damage source info
     */
    takeDamage(amount, source = {}) {
        if (!this.isAlive || this.isInvulnerable) {
            return false;
        }
        
        try {
            // Validate damage amount
            const damage = Math.max(0, Math.floor(amount));
            
            // Apply damage
            this.health = Math.max(0, this.health - damage);
            
            // Make temporarily invulnerable
            this.makeInvulnerable(this.invulnerabilityDuration);
            
            // Check if player died
            if (this.health <= 0) {
                this.die();
            }
            
            // Emit damage event
            this.emit('damage', {
                amount: damage,
                health: this.health,
                source
            });
            
            this.log('Player took damage', {
                damage,
                health: this.health,
                source: source.type || 'unknown'
            });
            
            return true;
            
        } catch (error) {
            this.handleError('Damage error', error);
            return false;
        }
    }

    /**
     * Heal player
     * @param {number} amount - Heal amount
     */
    heal(amount) {
        if (!this.isAlive) return false;
        
        try {
            const healAmount = Math.max(0, Math.floor(amount));
            const oldHealth = this.health;
            
            this.health = Math.min(this.maxHealth, this.health + healAmount);
            
            const actualHeal = this.health - oldHealth;
            
            if (actualHeal > 0) {
                this.emit('heal', {
                    amount: actualHeal,
                    health: this.health
                });
                
                this.log('Player healed', {
                    amount: actualHeal,
                    health: this.health
                });
            }
            
            return actualHeal > 0;
            
        } catch (error) {
            this.handleError('Heal error', error);
            return false;
        }
    }

    /**
     * Make player invulnerable for specified duration
     * @param {number} duration - Invulnerability duration in ms
     */
    makeInvulnerable(duration = 2000) {
        this.isInvulnerable = true;
        this.invulnerabilityStartTime = performance.now();
        this.invulnerabilityDuration = duration;
        
        this.emit('invulnerability_start', { duration });
    }

    /**
     * Handle player death
     * @private
     */
    die() {
        if (!this.isAlive) return;
        
        this.isAlive = false;
        this.lives = Math.max(0, this.lives - 1);
        
        // Stop input processing
        this.inputManager.setEnabled(false);
        
        // Emit death event
        this.emit('death', {
            position: this.position.clone(),
            score: this.score,
            lives: this.lives
        });
        
        this.log('Player died', {
            lives: this.lives,
            score: this.score
        });
    }

    /**
     * Respawn player
     * @param {Object} config - Respawn configuration
     */
    respawn(config = {}) {
        if (this.lives <= 0) {
            this.emit('game_over', { score: this.score });
            return false;
        }
        
        try {
            // Reset state
            this.isAlive = true;
            this.health = this.maxHealth;
            this.energy = this.maxEnergy;
            
            // Reset position
            this.position = new Vector2D(
                config.x || this.bounds.right / 2,
                config.y || this.bounds.bottom - 100
            );
            this.velocity = new Vector2D(0, 0);
            
            // Make invulnerable
            this.makeInvulnerable(3000);
            
            // Re-enable input
            this.inputManager.setEnabled(true);
            
            // Emit respawn event
            this.emit('respawn', {
                position: this.position.clone(),
                health: this.health,
                lives: this.lives
            });
            
            this.log('Player respawned', {
                lives: this.lives,
                position: this.position
            });
            
            return true;
            
        } catch (error) {
            this.handleError('Respawn error', error);
            return false;
        }
    }

    /**
     * Add score points
     * @param {number} points - Points to add
     */
    addScore(points) {
        const scorePoints = Math.max(0, Math.floor(points));
        this.score += scorePoints;
        
        this.emit('score', {
            points: scorePoints,
            totalScore: this.score
        });
        
        this.log('Score added', {
            points: scorePoints,
            total: this.score
        });
    }

    /**
     * Get collision bounds
     * @returns {Object} Collision rectangle
     */
    getBounds() {
        return {
            left: this.position.x - this.width / 2,
            right: this.position.x + this.width / 2,
            top: this.position.y - this.height / 2,
            bottom: this.position.y + this.height / 2,
            centerX: this.position.x,
            centerY: this.position.y,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Check collision with another entity
     * @param {Object} other - Other entity with getBounds method
     * @returns {boolean} True if collision detected
     */
    checkCollision(other) {
        if (!other || !other.getBounds) return false;
        
        const thisBounds = this.getBounds();
        const otherBounds = other.getBounds();
        
        return !(
            thisBounds.right < otherBounds.left ||
            thisBounds.left > otherBounds.right ||
            thisBounds.bottom < otherBounds.top ||
            thisBounds.top > otherBounds.bottom
        );
    }

    /**
     * Render player
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        if (!ctx || !this.isAlive) return;
        
        try {
            ctx.save();
            
            // Render trail
            this.renderTrail(ctx);
            
            // Apply invulnerability flashing
            if (this.isInvulnerable) {
                const flashRate = 100;
                const elapsed = performance.now() - this.invulnerabilityStartTime;
                const alpha = Math.sin(elapsed / flashRate) * 0.5 + 0.5;
                ctx.globalAlpha = alpha;
            }
            
            // Transform to player position and rotation
            ctx.translate(this.position.x, this.position.y);
            ctx.rotate(this.rotation);
            ctx.scale(this.scale, this.scale);
            
            // Render player ship
            this.renderShip(ctx);
            
            // Render effects
            this.renderEffects(ctx);
            
            ctx.restore();
            
            // Render UI elements
            this.renderUI(ctx);
            
        } catch (error) {
            this.handleError('Render error', error);
        }
    }

    /**
     * Render player ship
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @private
     */
    renderShip(ctx) {
        // Simple triangle ship
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();
        
        // Engine glow
        if (this.velocity.magnitude() > 50) {
            ctx.fillStyle = '#ff6600';
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(-this.width / 4, this.height / 2);
            ctx.lineTo(0, this.height / 2 + 10);
            ctx.lineTo(this.width / 4, this.height / 2);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    /**
     * Render trail effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @private
     */
    renderTrail(ctx) {
        if (this.effects.trail.length < 2) return;
        
        ctx.strokeStyle = this.trailColor;
        ctx.lineWidth = 3;
        
        for (let i = 1; i < this.effects.trail.length; i++) {
            const point = this.effects.trail[i];
            const prevPoint = this.effects.trail[i - 1];
            
            ctx.globalAlpha = point.alpha * 0.5;
            ctx.beginPath();
            ctx.moveTo(prevPoint.position.x, prevPoint.position.y);
            ctx.lineTo(point.position.x, point.position.y);
            ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
    }

    /**
     * Render visual effects
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @private
     */
    renderEffects(ctx) {
        // Render boost effect
        if (this.maxSpeed > 300) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2 + 5, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.globalAlpha = 1;
        }
    }

    /**
     * Render UI elements
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @private
     */
    renderUI(ctx) {
        // Health bar
        const barWidth = 100;
        const barHeight = 8;
        const barX = 10;
        const barY = 10;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.3 ? '#00ff00' : '#ff0000';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Energy bar
        const energyY = barY + barHeight + 5;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, energyY, barWidth, barHeight);
        
        // Energy
        const energyPercent = this.energy / this.maxEnergy;
        ctx.fillStyle = '#0088ff';
        ctx.fillRect(barX, energyY, barWidth * energyPercent, barHeight);
        
        // Border
        ctx.strokeRect(barX, energyY, barWidth, barHeight);
        
        // Score
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${this.score}`, barX, energyY + barHeight + 20);
        
        // Lives
        ctx.fillText(`Lives: ${this.lives}`, barX, energyY + barHeight + 40);
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    removeEventListener(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to listeners
     * @param {string} event - Event name
     * @param {Object} data - Event data
     * @private
     */
    emit(event, data = {}) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback({ ...data, target: this, type: event });
                } catch (error) {
                    this.handleError(`Event listener error for ${event}`, error);
                }
            });
        }
    }

    /**
     * Get player state for serialization
     * @returns {Object} Player state
     */
    getState() {
        return {
            position: { x: this.position.x, y: this.position.y },
            velocity: { x: this.velocity.x, y: this.velocity.y },
            health: this.health,
            energy: this.energy,
            score: this.score,
            lives: this.lives,
            isAlive: this.isAlive,
            isInvulnerable: this.isInvulnerable
        };
    }

    /**
     * Set player state from serialized data
     * @param {Object} state - Player state
     */
    setState(state) {
        if (!state) return;
        
        try {
            if (state.position) {
                this.position = new Vector2D(state.position.x, state.position.y);
            }
            if (state.velocity) {
                this.velocity = new Vector2D(state.velocity.x, state.velocity.y);
            }
            if (typeof state.health === 'number') {
                this.health = Math.max(0, Math.min(this.maxHealth, state.health));
            }
            if (typeof state.energy === 'number') {
                this.energy = Math.max(0, Math.min(this.maxEnergy, state.energy));
            }
            if (typeof state.score === 'number') {
                this.score = Math.max(0, state.score);
            }
            if (typeof state.lives === 'number') {
                this.lives = Math.max(0, state.lives);
            }
            if (typeof state.isAlive === 'boolean') {
                this.isAlive = state.isAlive;
            }
            if (typeof state.isInvulnerable === 'boolean') {
                this.isInvulnerable = state.isInvulnerable;
            }
            
            this.log('Player state restored', state);
            
        } catch (error) {
            this.handleError('State restoration error', error);
        }
    }

    /**
     * Log message with context
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     * @private
     */
    log(message, data = {}) {
        if (typeof console !== 'undefined' && console.log) {
            console.log(`[Player] ${message}`, {
                timestamp: new Date().toISOString(),
                frameCount: this.frameCount,
                ...data
            });
        }
    }

    /**
     * Handle errors with logging
     * @param {string} context - Error context
     * @param {Error} error - Error object
     * @private
     */
    handleError(context, error) {
        if (typeof console !== 'undefined' && console.error) {
            console.error(`[Player] ${context}:`, error, {
                timestamp: new Date().toISOString(),
                playerState: this.getState()
            });
        }
        
        // Emit error event
        this.emit('error', {
            context,
            error: error.message,
            stack: error.stack
        });
    }

    /**
     * Get performance metrics
     * @returns {Object} Performance data
     */
    getMetrics() {
        return {
            frameCount: this.frameCount,
            lastUpdateTime: this.lastUpdateTime,
            inputBufferSize: this.inputManager.getInputBuffer().buffer.length,
            trailLength: this.effects.trail.length,
            activeActions: this.inputManager.getActiveActions().length
        };
    }

    /**
     * Reset player to initial state
     */
    reset() {
        // Reset position and movement
        this.position = new Vector2D(400, 550);
        this.velocity = new Vector2D(0, 0);
        this.acceleration = new Vector2D(0, 0);
        
        // Reset game state
        this.health = this.maxHealth;
        this.energy = this.maxEnergy;
        this.score = 0;
        this.lives = 3;
        this.isAlive = true;
        this.isInvulnerable = false;
        
        // Reset input
        this.inputManager.reset();
        this.inputManager.setEnabled(true);
        
        // Reset effects
        this.effects.trail = [];
        this.effects.particles = [];
        
        // Reset metrics
        this.frameCount = 0;
        this.lastUpdateTime = performance.now();
        
        this.log('Player reset to initial state');
    }

    /**
     * Cleanup resources and event listeners
     */
    destroy() {
        try {
            // Cleanup input manager
            if (this.inputManager) {
                this.inputManager.destroy();
            }
            
            // Clear event listeners
            this.eventListeners.clear();
            
            // Clear effects
            this.effects.trail = [];
            this.effects.particles = [];
            
            this.log('Player destroyed');
            
        } catch (error) {
            this.handleError('Destroy error', error);
        }
    }
}

// Export classes for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Player,
        KeyboardInputManager,
        InputBuffer,
        Vector2D
    };
} else if (typeof window !== 'undefined') {
    // Browser environment
    window.Player = Player;
    window.KeyboardInputManager = KeyboardInputManager;
    window.InputBuffer = InputBuffer;
    window.Vector2D = Vector2D;
}