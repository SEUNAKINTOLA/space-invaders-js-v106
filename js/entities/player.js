/**
 * Player Entity Module
 * 
 * Implements the player ship entity with sprite rendering, position management,
 * and basic movement capabilities within the game world. This module follows
 * clean architecture principles with clear separation of concerns between
 * rendering, physics, and game logic.
 * 
 * Key Features:
 * - Bounded movement within game world
 * - Sprite-based rendering with animation support
 * - Health and damage management
 * - Input-responsive movement system
 * - Performance-optimized update cycles
 * 
 * Architecture Decisions:
 * - Entity-Component pattern for modularity
 * - Event-driven state changes for decoupling
 * - Immutable position updates for predictability
 * - Resource pooling for performance optimization
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

/**
 * Player ship entity class implementing core gameplay mechanics
 * 
 * Manages player ship state, movement, rendering, and interactions within
 * the game world. Provides a clean interface for game systems to interact
 * with the player entity while maintaining internal state consistency.
 * 
 * @class Player
 */
class Player {
    /**
     * Player configuration constants
     * @static
     * @readonly
     */
    static CONFIG = {
        DEFAULT_SPEED: 300,           // pixels per second
        DEFAULT_WIDTH: 48,            // sprite width in pixels
        DEFAULT_HEIGHT: 48,           // sprite height in pixels
        DEFAULT_HEALTH: 100,          // starting health points
        BOUNDS_PADDING: 10,           // padding from screen edges
        ANIMATION_FRAME_DURATION: 100, // milliseconds per frame
        DAMAGE_INVULNERABILITY_TIME: 1000, // milliseconds of invulnerability
        MAX_VELOCITY: 500,            // maximum velocity cap
        FRICTION_COEFFICIENT: 0.85    // movement friction for smooth stops
    };

    /**
     * Player state enumeration
     * @static
     * @readonly
     */
    static STATE = {
        IDLE: 'idle',
        MOVING: 'moving',
        DAMAGED: 'damaged',
        DESTROYED: 'destroyed',
        INVULNERABLE: 'invulnerable'
    };

    /**
     * Movement direction enumeration
     * @static
     * @readonly
     */
    static DIRECTION = {
        LEFT: 'left',
        RIGHT: 'right',
        UP: 'up',
        DOWN: 'down',
        NONE: 'none'
    };

    /**
     * Creates a new Player instance
     * 
     * @param {Object} config - Player configuration object
     * @param {number} [config.x=0] - Initial X position
     * @param {number} [config.y=0] - Initial Y position
     * @param {number} [config.speed] - Movement speed in pixels/second
     * @param {number} [config.width] - Sprite width in pixels
     * @param {number} [config.height] - Sprite height in pixels
     * @param {number} [config.health] - Starting health points
     * @param {HTMLCanvasElement} [config.canvas] - Game canvas for bounds checking
     * @param {string} [config.spriteUrl] - URL to player sprite image
     * @throws {Error} When required parameters are invalid
     */
    constructor(config = {}) {
        try {
            // Validate and set core properties
            this._validateConfig(config);
            this._initializeProperties(config);
            this._initializeState();
            this._initializeSprite(config.spriteUrl);
            this._initializeEventHandlers();
            
            // Log successful initialization
            this._log('info', 'Player entity initialized successfully', {
                position: { x: this.x, y: this.y },
                dimensions: { width: this.width, height: this.height },
                health: this.health
            });
        } catch (error) {
            this._log('error', 'Failed to initialize Player entity', { error: error.message });
            throw new Error(`Player initialization failed: ${error.message}`);
        }
    }

    /**
     * Validates the configuration object
     * @private
     * @param {Object} config - Configuration to validate
     * @throws {Error} When configuration is invalid
     */
    _validateConfig(config) {
        if (config.x !== undefined && (typeof config.x !== 'number' || !isFinite(config.x))) {
            throw new Error('Invalid x position: must be a finite number');
        }
        if (config.y !== undefined && (typeof config.y !== 'number' || !isFinite(config.y))) {
            throw new Error('Invalid y position: must be a finite number');
        }
        if (config.speed !== undefined && (typeof config.speed !== 'number' || config.speed <= 0)) {
            throw new Error('Invalid speed: must be a positive number');
        }
        if (config.health !== undefined && (typeof config.health !== 'number' || config.health <= 0)) {
            throw new Error('Invalid health: must be a positive number');
        }
    }

    /**
     * Initializes core properties from configuration
     * @private
     * @param {Object} config - Configuration object
     */
    _initializeProperties(config) {
        // Position and movement
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = config.speed || Player.CONFIG.DEFAULT_SPEED;
        
        // Dimensions
        this.width = config.width || Player.CONFIG.DEFAULT_WIDTH;
        this.height = config.height || Player.CONFIG.DEFAULT_HEIGHT;
        
        // Game state
        this.health = config.health || Player.CONFIG.DEFAULT_HEALTH;
        this.maxHealth = this.health;
        this.score = 0;
        
        // Canvas bounds
        this.canvas = config.canvas || null;
        this.bounds = this._calculateBounds();
        
        // Performance tracking
        this.lastUpdateTime = 0;
        this.frameCount = 0;
    }

    /**
     * Initializes entity state
     * @private
     */
    _initializeState() {
        this.state = Player.STATE.IDLE;
        this.direction = Player.DIRECTION.NONE;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        this.isDestroyed = false;
        this.isVisible = true;
        
        // Animation state
        this.currentFrame = 0;
        this.animationTimer = 0;
        this.animationFrames = [];
    }

    /**
     * Initializes sprite rendering
     * @private
     * @param {string} [spriteUrl] - URL to sprite image
     */
    _initializeSprite(spriteUrl) {
        this.sprite = null;
        this.spriteLoaded = false;
        this.spriteError = false;
        
        if (spriteUrl) {
            this._loadSprite(spriteUrl);
        }
    }

    /**
     * Initializes event handlers
     * @private
     */
    _initializeEventHandlers() {
        this.eventListeners = new Map();
        this.eventQueue = [];
    }

    /**
     * Loads the player sprite image
     * @private
     * @param {string} spriteUrl - URL to sprite image
     */
    _loadSprite(spriteUrl) {
        try {
            this.sprite = new Image();
            this.sprite.onload = () => {
                this.spriteLoaded = true;
                this.spriteError = false;
                this._log('info', 'Player sprite loaded successfully', { url: spriteUrl });
                this._emitEvent('spriteLoaded', { sprite: this.sprite });
            };
            this.sprite.onerror = (error) => {
                this.spriteError = true;
                this.spriteLoaded = false;
                this._log('error', 'Failed to load player sprite', { url: spriteUrl, error });
                this._emitEvent('spriteError', { error, url: spriteUrl });
            };
            this.sprite.src = spriteUrl;
        } catch (error) {
            this._log('error', 'Error initializing sprite', { error: error.message });
            this.spriteError = true;
        }
    }

    /**
     * Updates the player entity state
     * 
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     * @param {Object} [input] - Input state object
     * @param {boolean} [input.left] - Left movement input
     * @param {boolean} [input.right] - Right movement input
     * @param {boolean} [input.up] - Up movement input
     * @param {boolean} [input.down] - Down movement input
     */
    update(deltaTime, input = {}) {
        try {
            if (this.isDestroyed) return;

            const deltaSeconds = deltaTime / 1000;
            this.lastUpdateTime = performance.now();
            this.frameCount++;

            // Update timers
            this._updateTimers(deltaTime);
            
            // Process input and update movement
            this._processInput(input);
            this._updateMovement(deltaSeconds);
            this._updatePosition(deltaSeconds);
            this._updateAnimation(deltaTime);
            
            // Update state
            this._updateState();
            
            // Process event queue
            this._processEventQueue();
            
        } catch (error) {
            this._log('error', 'Error during player update', { error: error.message });
        }
    }

    /**
     * Updates internal timers
     * @private
     * @param {number} deltaTime - Time elapsed in milliseconds
     */
    _updateTimers(deltaTime) {
        if (this.isInvulnerable && this.invulnerabilityTimer > 0) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
                this.state = Player.STATE.IDLE;
                this._emitEvent('invulnerabilityEnded');
            }
        }
        
        this.animationTimer += deltaTime;
    }

    /**
     * Processes input for movement
     * @private
     * @param {Object} input - Input state object
     */
    _processInput(input) {
        let targetVelocityX = 0;
        let targetVelocityY = 0;
        let newDirection = Player.DIRECTION.NONE;

        // Horizontal movement
        if (input.left && !input.right) {
            targetVelocityX = -this.speed;
            newDirection = Player.DIRECTION.LEFT;
        } else if (input.right && !input.left) {
            targetVelocityX = this.speed;
            newDirection = Player.DIRECTION.RIGHT;
        }

        // Vertical movement
        if (input.up && !input.down) {
            targetVelocityY = -this.speed;
            newDirection = newDirection === Player.DIRECTION.NONE ? Player.DIRECTION.UP : newDirection;
        } else if (input.down && !input.up) {
            targetVelocityY = this.speed;
            newDirection = newDirection === Player.DIRECTION.NONE ? Player.DIRECTION.DOWN : newDirection;
        }

        // Update target velocities
        this.targetVelocityX = targetVelocityX;
        this.targetVelocityY = targetVelocityY;
        
        // Update direction if changed
        if (newDirection !== this.direction) {
            this.direction = newDirection;
            this._emitEvent('directionChanged', { direction: newDirection });
        }
    }

    /**
     * Updates movement physics
     * @private
     * @param {number} deltaSeconds - Time elapsed in seconds
     */
    _updateMovement(deltaSeconds) {
        // Apply friction and acceleration
        const friction = Player.CONFIG.FRICTION_COEFFICIENT;
        
        // Smooth velocity transitions
        this.velocityX = this._lerp(this.velocityX, this.targetVelocityX || 0, 1 - Math.pow(friction, deltaSeconds));
        this.velocityY = this._lerp(this.velocityY, this.targetVelocityY || 0, 1 - Math.pow(friction, deltaSeconds));
        
        // Cap maximum velocity
        const maxVel = Player.CONFIG.MAX_VELOCITY;
        this.velocityX = Math.max(-maxVel, Math.min(maxVel, this.velocityX));
        this.velocityY = Math.max(-maxVel, Math.min(maxVel, this.velocityY));
    }

    /**
     * Updates position with bounds checking
     * @private
     * @param {number} deltaSeconds - Time elapsed in seconds
     */
    _updatePosition(deltaSeconds) {
        const oldX = this.x;
        const oldY = this.y;
        
        // Calculate new position
        let newX = this.x + (this.velocityX * deltaSeconds);
        let newY = this.y + (this.velocityY * deltaSeconds);
        
        // Apply bounds checking
        if (this.bounds) {
            newX = Math.max(this.bounds.left, Math.min(this.bounds.right - this.width, newX));
            newY = Math.max(this.bounds.top, Math.min(this.bounds.bottom - this.height, newY));
            
            // Stop velocity if hitting bounds
            if (newX === this.bounds.left || newX === this.bounds.right - this.width) {
                this.velocityX = 0;
            }
            if (newY === this.bounds.top || newY === this.bounds.bottom - this.height) {
                this.velocityY = 0;
            }
        }
        
        // Update position
        this.x = newX;
        this.y = newY;
        
        // Emit position change event if moved
        if (oldX !== this.x || oldY !== this.y) {
            this._emitEvent('positionChanged', {
                oldPosition: { x: oldX, y: oldY },
                newPosition: { x: this.x, y: this.y }
            });
        }
    }

    /**
     * Updates animation state
     * @private
     * @param {number} deltaTime - Time elapsed in milliseconds
     */
    _updateAnimation(deltaTime) {
        if (this.animationFrames.length > 1) {
            if (this.animationTimer >= Player.CONFIG.ANIMATION_FRAME_DURATION) {
                this.currentFrame = (this.currentFrame + 1) % this.animationFrames.length;
                this.animationTimer = 0;
            }
        }
    }

    /**
     * Updates entity state based on current conditions
     * @private
     */
    _updateState() {
        const wasMoving = this.state === Player.STATE.MOVING;
        const isMoving = Math.abs(this.velocityX) > 1 || Math.abs(this.velocityY) > 1;
        
        if (this.isInvulnerable) {
            this.state = Player.STATE.INVULNERABLE;
        } else if (this.health <= 0) {
            this.state = Player.STATE.DESTROYED;
            this.isDestroyed = true;
        } else if (isMoving) {
            this.state = Player.STATE.MOVING;
        } else {
            this.state = Player.STATE.IDLE;
        }
        
        // Emit state change events
        if (wasMoving !== isMoving) {
            this._emitEvent('movementStateChanged', { isMoving });
        }
    }

    /**
     * Renders the player entity
     * 
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {Object} [options] - Rendering options
     * @param {boolean} [options.debug=false] - Show debug information
     * @param {number} [options.alpha=1] - Rendering opacity
     */
    render(ctx, options = {}) {
        try {
            if (!this.isVisible || this.isDestroyed) return;

            const { debug = false, alpha = 1 } = options;
            
            // Save context state
            ctx.save();
            
            // Apply alpha for invulnerability effect
            if (this.isInvulnerable) {
                const flickerAlpha = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
                ctx.globalAlpha = alpha * flickerAlpha;
            } else {
                ctx.globalAlpha = alpha;
            }
            
            // Render sprite or fallback
            if (this.spriteLoaded && this.sprite) {
                this._renderSprite(ctx);
            } else {
                this._renderFallback(ctx);
            }
            
            // Render debug information
            if (debug) {
                this._renderDebugInfo(ctx);
            }
            
            // Restore context state
            ctx.restore();
            
        } catch (error) {
            this._log('error', 'Error during player rendering', { error: error.message });
            // Render error indicator
            this._renderError(ctx);
        }
    }

    /**
     * Renders the player sprite
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    _renderSprite(ctx) {
        ctx.drawImage(
            this.sprite,
            this.x,
            this.y,
            this.width,
            this.height
        );
    }

    /**
     * Renders fallback representation when sprite is unavailable
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    _renderFallback(ctx) {
        // Draw simple triangle representing player ship
        ctx.fillStyle = this.isInvulnerable ? '#ffff00' : '#00ff00';
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        // Add outline
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    /**
     * Renders debug information
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    _renderDebugInfo(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText(`Pos: (${Math.round(this.x)}, ${Math.round(this.y)})`, this.x, this.y - 20);
        ctx.fillText(`Vel: (${Math.round(this.velocityX)}, ${Math.round(this.velocityY)})`, this.x, this.y - 5);
        ctx.fillText(`Health: ${this.health}/${this.maxHealth}`, this.x, this.y + this.height + 15);
        ctx.fillText(`State: ${this.state}`, this.x, this.y + this.height + 30);
        
        // Draw bounding box
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }

    /**
     * Renders error indicator
     * @private
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    _renderError(ctx) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px monospace';
        ctx.fillText('ERROR', this.x + 5, this.y + this.height / 2);
    }

    /**
     * Applies damage to the player
     * 
     * @param {number} amount - Damage amount
     * @param {Object} [source] - Damage source information
     * @returns {boolean} True if damage was applied, false if prevented
     */
    takeDamage(amount, source = {}) {
        try {
            if (this.isInvulnerable || this.isDestroyed || amount <= 0) {
                return false;
            }

            const oldHealth = this.health;
            this.health = Math.max(0, this.health - amount);
            
            // Apply invulnerability period
            this.isInvulnerable = true;
            this.invulnerabilityTimer = Player.CONFIG.DAMAGE_INVULNERABILITY_TIME;
            this.state = Player.STATE.DAMAGED;
            
            this._log('info', 'Player took damage', {
                amount,
                oldHealth,
                newHealth: this.health,
                source
            });
            
            // Emit damage event
            this._emitEvent('damaged', {
                amount,
                oldHealth,
                newHealth: this.health,
                source
            });
            
            // Check for destruction
            if (this.health <= 0) {
                this._handleDestruction();
            }
            
            return true;
        } catch (error) {
            this._log('error', 'Error applying damage', { error: error.message });
            return false;
        }
    }

    /**
     * Heals the player
     * 
     * @param {number} amount - Healing amount
     * @returns {number} Actual amount healed
     */
    heal(amount) {
        if (this.isDestroyed || amount <= 0) return 0;
        
        const oldHealth = this.health;
        const actualHeal = Math.min(amount, this.maxHealth - this.health);
        this.health += actualHeal;
        
        if (actualHeal > 0) {
            this._emitEvent('healed', {
                amount: actualHeal,
                oldHealth,
                newHealth: this.health
            });
        }
        
        return actualHeal;
    }

    /**
     * Handles player destruction
     * @private
     */
    _handleDestruction() {
        this.isDestroyed = true;
        this.state = Player.STATE.DESTROYED;
        this.velocityX = 0;
        this.velocityY = 0;
        
        this._log('info', 'Player destroyed');
        this._emitEvent('destroyed', {
            finalScore: this.score,
            position: { x: this.x, y: this.y }
        });
    }

    /**
     * Resets the player to initial state
     * 
     * @param {Object} [config] - Reset configuration
     */
    reset(config = {}) {
        try {
            // Reset position
            this.x = config.x || 0;
            this.y = config.y || 0;
            
            // Reset movement
            this.velocityX = 0;
            this.velocityY = 0;
            this.direction = Player.DIRECTION.NONE;
            
            // Reset health
            this.health = config.health || this.maxHealth;
            
            // Reset state
            this.state = Player.STATE.IDLE;
            this.isDestroyed = false;
            this.isInvulnerable = false;
            this.invulnerabilityTimer = 0;
            this.isVisible = true;
            
            // Reset animation
            this.currentFrame = 0;
            this.animationTimer = 0;
            
            // Reset score if specified
            if (config.resetScore) {
                this.score = 0;
            }
            
            this._log('info', 'Player reset successfully', config);
            this._emitEvent('reset', config);
            
        } catch (error) {
            this._log('error', 'Error resetting player', { error: error.message });
        }
    }

    /**
     * Gets the player's collision bounds
     * 
     * @returns {Object} Collision bounds object
     */
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            centerX: this.x + this.width / 2,
            centerY: this.y + this.height / 2,
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }

    /**
     * Checks collision with another entity
     * 
     * @param {Object} other - Other entity with bounds
     * @returns {boolean} True if collision detected
     */
    checkCollision(other) {
        if (!other || this.isDestroyed) return false;
        
        const bounds = this.getBounds();
        const otherBounds = other.getBounds ? other.getBounds() : other;
        
        return !(bounds.right < otherBounds.x ||
                bounds.left > otherBounds.x + otherBounds.width ||
                bounds.bottom < otherBounds.y ||
                bounds.top > otherBounds.y + otherBounds.height);
    }

    /**
     * Adds an event listener
     * 
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Removes an event listener
     * 
     * @param {string} event - Event name
     * @param {Function} callback - Event callback to remove
     */
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emits an event to all listeners
     * @private
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    _emitEvent(event, data = null) {
        this.eventQueue.push({ event, data, timestamp: Date.now() });
    }

    /**
     * Processes the event queue
     * @private
     */
    _processEventQueue() {
        while (this.eventQueue.length > 0) {
            const { event, data } = this.eventQueue.shift();
            
            if (this.eventListeners.has(event)) {
                const listeners = this.eventListeners.get(event);
                listeners.forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        this._log('error', 'Error in event listener', { event, error: error.message });
                    }
                });
            }
        }
    }

    /**
     * Calculates movement bounds based on canvas
     * @private
     * @returns {Object|null} Bounds object or null if no canvas
     */
    _calculateBounds() {
        if (!this.canvas) return null;
        
        const padding = Player.CONFIG.BOUNDS_PADDING;
        return {
            left: padding,
            top: padding,
            right: this.canvas.width - padding,
            bottom: this.canvas.height - padding
        };
    }

    /**
     * Linear interpolation utility
     * @private
     * @param {number} start - Start value
     * @param {number} end - End value
     * @param {number} factor - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    _lerp(start, end, factor) {
        return start + (end - start) * Math.max(0, Math.min(1, factor));
    }

    /**
     * Logging utility with structured format
     * @private
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {Object} [data] - Additional log data
     */
    _log(level, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            component: 'Player',
            message,
            data: {
                ...data,
                playerId: this.id || 'unknown',
                position: { x: this.x, y: this.y },
                state: this.state
            }
        };
        
        console[level](JSON.stringify(logEntry));
    }

    /**
     * Gets current player statistics
     * 
     * @returns {Object} Player statistics object
     */
    getStats() {
        return {
            position: { x: this.x, y: this.y },
            velocity: { x: this.velocityX, y: this.velocityY },
            health: this.health,
            maxHealth: this.maxHealth,
            score: this.score,
            state: this.state,
            direction: this.direction,
            isInvulnerable: this.isInvulnerable,
            isDestroyed: this.isDestroyed,
            frameCount: this.frameCount,
            uptime: this.lastUpdateTime
        };
    }

    /**
     * Serializes player state for saving
     * 
     * @returns {Object} Serializable player state
     */
    serialize() {
        return {
            x: this.x,
            y: this.y,
            health: this.health,
            maxHealth: this.maxHealth,
            score: this.score,
            state: this.state,
            isDestroyed: this.isDestroyed
        };
    }

    /**
     * Deserializes player state from saved data
     * 
     * @param {Object} data - Serialized player data
     */
    deserialize(data) {
        try {
            this.x = data.x || this.x;
            this.y = data.y || this.y;
            this.health = data.health || this.health;
            this.maxHealth = data.maxHealth || this.maxHealth;
            this.score = data.score || this.score;
            this.state = data.state || this.state;
            this.isDestroyed = data.isDestroyed || false;
            
            this._log('info', 'Player state deserialized', data);
        } catch (error) {
            this._log('error', 'Error deserializing player state', { error: error.message });
        }
    }
}

// Export the Player class
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Player;
} else if (typeof window !== 'undefined') {
    window.Player = Player;
}