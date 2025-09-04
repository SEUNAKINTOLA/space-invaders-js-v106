* 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

/**
 * Vector2D utility class for position and velocity calculations
 * Provides essential 2D vector operations for game physics
 */
class Vector2D {
    /**
     * Creates a new Vector2D instance
     * @param {number} x - X component (default: 0)
     * @param {number} y - Y component (default: 0)
     */
    constructor(x = 0, y = 0) {
        this.x = Number(x) || 0;
        this.y = Number(y) || 0;
    }

    /**
     * Sets vector components with validation
     * @param {number} x - New X component
     * @param {number} y - New Y component
     * @returns {Vector2D} This vector for chaining
     */
    set(x, y) {
        this.x = Number(x) || 0;
        this.y = Number(y) || 0;
        return this;
    }

    /**
     * Adds another vector to this vector
     * @param {Vector2D|Object} vector - Vector to add
     * @returns {Vector2D} This vector for chaining
     */
    add(vector) {
        if (!vector || typeof vector !== 'object') {
            console.warn('Vector2D.add: Invalid vector parameter');
            return this;
        }
        this.x += Number(vector.x) || 0;
        this.y += Number(vector.y) || 0;
        return this;
    }

    /**
     * Multiplies vector by a scalar value
     * @param {number} scalar - Multiplication factor
     * @returns {Vector2D} This vector for chaining
     */
    multiply(scalar) {
        const factor = Number(scalar) || 0;
        this.x *= factor;
        this.y *= factor;
        return this;
    }

    /**
     * Calculates the magnitude (length) of the vector
     * @returns {number} Vector magnitude
     */
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Normalizes the vector to unit length
     * @returns {Vector2D} This vector for chaining
     */
    normalize() {
        const mag = this.magnitude();
        if (mag > 0) {
            this.x /= mag;
            this.y /= mag;
        }
        return this;
    }

    /**
     * Creates a copy of this vector
     * @returns {Vector2D} New vector instance
     */
    clone() {
        return new Vector2D(this.x, this.y);
    }
}

/**
 * Rectangle class for collision detection and bounds checking
 * Provides efficient AABB (Axis-Aligned Bounding Box) operations
 */
class Rectangle {
    /**
     * Creates a new Rectangle instance
     * @param {number} x - Left edge position
     * @param {number} y - Top edge position  
     * @param {number} width - Rectangle width
     * @param {number} height - Rectangle height
     */
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = Number(x) || 0;
        this.y = Number(y) || 0;
        this.width = Math.max(0, Number(width) || 0);
        this.height = Math.max(0, Number(height) || 0);
    }

    /**
     * Checks if this rectangle intersects with another
     * @param {Rectangle} other - Rectangle to test against
     * @returns {boolean} True if rectangles intersect
     */
    intersects(other) {
        if (!other || typeof other !== 'object') {
            return false;
        }
        
        return !(this.x + this.width < other.x ||
                other.x + other.width < this.x ||
                this.y + this.height < other.y ||
                other.y + other.height < this.y);
    }

    /**
     * Checks if a point is inside this rectangle
     * @param {number} x - Point X coordinate
     * @param {number} y - Point Y coordinate
     * @returns {boolean} True if point is inside
     */
    contains(x, y) {
        const px = Number(x) || 0;
        const py = Number(y) || 0;
        
        return px >= this.x && px <= this.x + this.width &&
               py >= this.y && py <= this.y + this.height;
    }

    /**
     * Updates rectangle position and size
     * @param {number} x - New X position
     * @param {number} y - New Y position
     * @param {number} width - New width
     * @param {number} height - New height
     */
    update(x, y, width, height) {
        this.x = Number(x) || 0;
        this.y = Number(y) || 0;
        this.width = Math.max(0, Number(width) || 0);
        this.height = Math.max(0, Number(height) || 0);
    }
}

/**
 * Base Entity class for all game objects
 * 
 * Provides core functionality for position management, rendering,
 * collision detection, and component-based extensibility.
 * 
 * Features:
 * - Position and velocity with Vector2D math
 * - Sprite rendering with transformation support
 * - Collision detection with customizable hitboxes
 * - Component system for modular functionality
 * - Event system for state change notifications
 * - Performance monitoring and optimization
 */
class Entity {
    /**
     * Creates a new Entity instance
     * 
     * @param {Object} config - Entity configuration
     * @param {number} [config.x=0] - Initial X position
     * @param {number} [config.y=0] - Initial Y position
     * @param {number} [config.width=32] - Entity width
     * @param {number} [config.height=32] - Entity height
     * @param {string} [config.sprite=null] - Sprite image path
     * @param {number} [config.rotation=0] - Initial rotation in radians
     * @param {number} [config.scale=1] - Sprite scale factor
     * @param {boolean} [config.visible=true] - Visibility state
     * @param {string} [config.type='entity'] - Entity type identifier
     * @param {Object} [config.hitbox=null] - Custom hitbox configuration
     */
    constructor(config = {}) {
        // Validate and sanitize configuration
        this._validateConfig(config);
        
        // Core properties
        this.id = this._generateId();
        this.type = String(config.type || 'entity');
        this.active = true;
        this.visible = Boolean(config.visible !== false);
        
        // Position and movement
        this.position = new Vector2D(config.x, config.y);
        this.velocity = new Vector2D(0, 0);
        this.acceleration = new Vector2D(0, 0);
        
        // Dimensions and rendering
        this.width = Math.max(1, Number(config.width) || 32);
        this.height = Math.max(1, Number(config.height) || 32);
        this.rotation = Number(config.rotation) || 0;
        this.scale = Math.max(0.1, Number(config.scale) || 1);
        
        // Sprite management
        this.sprite = config.sprite || null;
        this.spriteImage = null;
        this.spriteLoaded = false;
        this.spriteError = false;
        
        // Collision detection
        this.bounds = new Rectangle(
            this.position.x,
            this.position.y,
            this.width,
            this.height
        );
        
        // Custom hitbox support
        if (config.hitbox) {
            this.hitbox = new Rectangle(
                config.hitbox.x || 0,
                config.hitbox.y || 0,
                config.hitbox.width || this.width,
                config.hitbox.height || this.height
            );
        } else {
            this.hitbox = null;
        }
        
        // Component system
        this.components = new Map();
        
        // Event system
        this.eventListeners = new Map();
        
        // Performance tracking
        this.lastUpdateTime = 0;
        this.updateCount = 0;
        this.renderCount = 0;
        
        // Load sprite if provided
        if (this.sprite) {
            this._loadSprite();
        }
        
        // Initialize entity
        this._initialize();
        
        console.log(`Entity created: ${this.type} (${this.id}) at (${this.position.x}, ${this.position.y})`);
    }

    /**
     * Validates entity configuration parameters
     * @param {Object} config - Configuration to validate
     * @private
     */
    _validateConfig(config) {
        if (typeof config !== 'object' || config === null) {
            throw new Error('Entity configuration must be an object');
        }
        
        // Validate numeric properties
        const numericProps = ['x', 'y', 'width', 'height', 'rotation', 'scale'];
        numericProps.forEach(prop => {
            if (config[prop] !== undefined && !Number.isFinite(Number(config[prop]))) {
                console.warn(`Entity: Invalid ${prop} value, using default`);
                delete config[prop];
            }
        });
        
        // Validate sprite path
        if (config.sprite && typeof config.sprite !== 'string') {
            console.warn('Entity: Invalid sprite path, must be string');
            delete config.sprite;
        }
    }

    /**
     * Generates a unique identifier for the entity
     * @returns {string} Unique entity ID
     * @private
     */
    _generateId() {
        return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Initializes the entity after construction
     * Override in subclasses for custom initialization
     * @protected
     */
    _initialize() {
        this.emit('initialized', { entity: this });
    }

    /**
     * Loads the sprite image asynchronously
     * @private
     */
    _loadSprite() {
        if (!this.sprite || this.spriteLoaded || this.spriteError) {
            return;
        }
        
        try {
            this.spriteImage = new Image();
            
            this.spriteImage.onload = () => {
                this.spriteLoaded = true;
                this.spriteError = false;
                this.emit('spriteLoaded', { entity: this, sprite: this.sprite });
                console.log(`Sprite loaded for entity ${this.id}: ${this.sprite}`);
            };
            
            this.spriteImage.onerror = (error) => {
                this.spriteError = true;
                this.spriteLoaded = false;
                this.emit('spriteError', { entity: this, sprite: this.sprite, error });
                console.error(`Failed to load sprite for entity ${this.id}: ${this.sprite}`, error);
            };
            
            this.spriteImage.src = this.sprite;
        } catch (error) {
            this.spriteError = true;
            console.error(`Error loading sprite for entity ${this.id}:`, error);
        }
    }

    /**
     * Updates entity state and physics
     * 
     * @param {number} deltaTime - Time elapsed since last update (seconds)
     * @param {Object} [context={}] - Update context with game state
     */
    update(deltaTime) {
        if (!this.active) {
            return;
        }
        
        try {
            const dt = Math.max(0, Math.min(1, Number(deltaTime) || 0));
            this.lastUpdateTime = performance.now();
            this.updateCount++;
            
            // Update physics
            this._updatePhysics(dt);
            
            // Update bounds
            this._updateBounds();
            
            // Update components
            this._updateComponents(dt);
            
            // Custom update logic (override in subclasses)
            this.onUpdate(dt);
            
            this.emit('updated', { entity: this, deltaTime: dt });
            
        } catch (error) {
            console.error(`Error updating entity ${this.id}:`, error);
            this.emit('error', { entity: this, error, context: 'update' });
        }
    }

    /**
     * Updates entity physics (position, velocity, acceleration)
     * @param {number} deltaTime - Time delta in seconds
     * @private
     */
    _updatePhysics(deltaTime) {
        // Apply acceleration to velocity
        this.velocity.add(
            new Vector2D(this.acceleration.x, this.acceleration.y).multiply(deltaTime)
        );
        
        // Apply velocity to position
        this.position.add(
            new Vector2D(this.velocity.x, this.velocity.y).multiply(deltaTime)
        );
    }

    /**
     * Updates collision bounds based on current position
     * @private
     */
    _updateBounds() {
        this.bounds.update(
            this.position.x,
            this.position.y,
            this.width * this.scale,
            this.height * this.scale
        );
        
        // Update custom hitbox if present
        if (this.hitbox) {
            this.hitbox.update(
                this.position.x + (this.hitbox.x || 0),
                this.position.y + (this.hitbox.y || 0),
                this.hitbox.width,
                this.hitbox.height
            );
        }
    }

    /**
     * Updates all attached components
     * @param {number} deltaTime - Time delta in seconds
     * @private
     */
    _updateComponents(deltaTime) {
        for (const [name, component] of this.components) {
            try {
                if (component && typeof component.update === 'function') {
                    component.update(deltaTime, this);
                }
            } catch (error) {
                console.error(`Error updating component ${name} on entity ${this.id}:`, error);
            }
        }
    }

    /**
     * Custom update logic hook for subclasses
     * @param {number} deltaTime - Time delta in seconds
     * @protected
     */
    onUpdate(deltaTime) {
        // Override in subclasses
    }

    /**
     * Renders the entity to the canvas context
     * 
     * @param {CanvasRenderingContext2D} context - Canvas rendering context
     * @param {Object} [options={}] - Rendering options
     * @param {boolean} [options.debug=false] - Show debug information
     * @param {number} [options.alpha=1] - Transparency level
     */
    render(context, options = {}) {
        if (!this.visible || !this.active) {
            return;
        }
        
        try {
            this.renderCount++;
            
            // Validate context
            if (!context || typeof context.save !== 'function') {
                throw new Error('Invalid canvas context provided');
            }
            
            const alpha = Math.max(0, Math.min(1, Number(options.alpha) || 1));
            
            context.save();
            
            // Apply transformations
            this._applyTransforms(context);
            
            // Set alpha
            if (alpha < 1) {
                context.globalAlpha = alpha;
            }
            
            // Render sprite or fallback
            if (this.spriteLoaded && this.spriteImage) {
                this._renderSprite(context);
            } else {
                this._renderFallback(context);
            }
            
            // Render components
            this._renderComponents(context, options);
            
            // Custom render logic
            this.onRender(context, options);
            
            // Debug rendering
            if (options.debug) {
                this._renderDebug(context);
            }
            
            context.restore();
            
            this.emit('rendered', { entity: this, context, options });
            
        } catch (error) {
            console.error(`Error rendering entity ${this.id}:`, error);
            this.emit('error', { entity: this, error, context: 'render' });
        }
    }

    /**
     * Applies transformations (translation, rotation, scale) to context
     * @param {CanvasRenderingContext2D} context - Canvas context
     * @private
     */
    _applyTransforms(context) {
        // Translate to entity position
        context.translate(
            this.position.x + (this.width * this.scale) / 2,
            this.position.y + (this.height * this.scale) / 2
        );
        
        // Apply rotation
        if (this.rotation !== 0) {
            context.rotate(this.rotation);
        }
        
        // Apply scale
        if (this.scale !== 1) {
            context.scale(this.scale, this.scale);
        }
    }

    /**
     * Renders the sprite image
     * @param {CanvasRenderingContext2D} context - Canvas context
     * @private
     */
    _renderSprite(context) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        context.drawImage(
            this.spriteImage,
            -halfWidth,
            -halfHeight,
            this.width,
            this.height
        );
    }

    /**
     * Renders fallback representation when sprite is not available
     * @param {CanvasRenderingContext2D} context - Canvas context
     * @private
     */
    _renderFallback(context) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        // Draw colored rectangle as fallback
        context.fillStyle = this._getFallbackColor();
        context.fillRect(-halfWidth, -halfHeight, this.width, this.height);
        
        // Draw border
        context.strokeStyle = '#ffffff';
        context.lineWidth = 1;
        context.strokeRect(-halfWidth, -halfHeight, this.width, this.height);
    }

    /**
     * Gets fallback color based on entity type
     * @returns {string} CSS color string
     * @private
     */
    _getFallbackColor() {
        const colors = {
            player: '#00ff00',
            enemy: '#ff0000',
            projectile: '#ffff00',
            powerup: '#ff00ff'
        };
        return colors[this.type] || '#888888';
    }

    /**
     * Renders all attached components
     * @param {CanvasRenderingContext2D} context - Canvas context
     * @param {Object} options - Rendering options
     * @private
     */
    _renderComponents(context, options) {
        for (const [name, component] of this.components) {
            try {
                if (component && typeof component.render === 'function') {
                    component.render(context, this, options);
                }
            } catch (error) {
                console.error(`Error rendering component ${name} on entity ${this.id}:`, error);
            }
        }
    }

    /**
     * Custom render logic hook for subclasses
     * @param {CanvasRenderingContext2D} context - Canvas context
     * @param {Object} options - Rendering options
     * @protected
     */
    onRender(context, options) {
        // Override in subclasses
    }

    /**
     * Renders debug information (bounds, hitbox, velocity)
     * @param {CanvasRenderingContext2D} context - Canvas context
     * @private
     */
    _renderDebug(context) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        // Draw bounds
        context.strokeStyle = '#00ff00';
        context.lineWidth = 1;
        context.strokeRect(-halfWidth, -halfHeight, this.width, this.height);
        
        // Draw velocity vector
        if (this.velocity.magnitude() > 0) {
            context.strokeStyle = '#ffff00';
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(this.velocity.x * 10, this.velocity.y * 10);
            context.stroke();
        }
        
        // Draw entity info
        context.fillStyle = '#ffffff';
        context.font = '10px monospace';
        context.textAlign = 'center';
        context.fillText(
            `${this.type} (${this.id.substr(-4)})`,
            0,
            -halfHeight - 5
        );
    }

    /**
     * Sets entity position
     * @param {number} x - New X position
     * @param {number} y - New Y position
     */
    setPosition(x, y) {
        const newX = Number(x) || 0;
        const newY = Number(y) || 0;
        
        if (newX !== this.position.x || newY !== this.position.y) {
            this.position.set(newX, newY);
            this.emit('positionChanged', { 
                entity: this, 
                position: this.position.clone() 
            });
        }
    }

    /**
     * Sets entity velocity
     * @param {number} vx - X velocity component
     * @param {number} vy - Y velocity component
     */
    setVelocity(vx, vy) {
        this.velocity.set(Number(vx) || 0, Number(vy) || 0);
        this.emit('velocityChanged', { 
            entity: this, 
            velocity: this.velocity.clone() 
        });
    }

    /**
     * Sets entity acceleration
     * @param {number} ax - X acceleration component
     * @param {number} ay - Y acceleration component
     */
    setAcceleration(ax, ay) {
        this.acceleration.set(Number(ax) || 0, Number(ay) || 0);
    }

    /**
     * Checks collision with another entity
     * @param {Entity} other - Entity to check collision against
     * @returns {boolean} True if entities are colliding
     */
    collidesWith(other) {
        if (!other || !other.active || !this.active) {
            return false;
        }
        
        try {
            // Use custom hitboxes if available, otherwise use bounds
            const thisBox = this.hitbox || this.bounds;
            const otherBox = other.hitbox || other.bounds;
            
            return thisBox.intersects(otherBox);
        } catch (error) {
            console.error(`Error checking collision between ${this.id} and ${other.id}:`, error);
            return false;
        }
    }

    /**
     * Checks if entity is within specified bounds
     * @param {Rectangle} bounds - Boundary rectangle
     * @returns {boolean} True if entity is within bounds
     */
    isWithinBounds(bounds) {
        if (!bounds) {
            return true;
        }
        
        return bounds.contains(this.position.x, this.position.y) &&
               bounds.contains(this.position.x + this.width, this.position.y + this.height);
    }

    /**
     * Adds a component to the entity
     * @param {string} name - Component name
     * @param {Object} component - Component instance
     */
    addComponent(name, component) {
        if (!name || typeof name !== 'string') {
            throw new Error('Component name must be a non-empty string');
        }
        
        if (!component) {
            throw new Error('Component cannot be null or undefined');
        }
        
        this.components.set(name, component);
        
        // Initialize component if it has an init method
        if (typeof component.init === 'function') {
            try {
                component.init(this);
            } catch (error) {
                console.error(`Error initializing component ${name}:`, error);
            }
        }
        
        this.emit('componentAdded', { entity: this, name, component });
    }

    /**
     * Removes a component from the entity
     * @param {string} name - Component name to remove
     * @returns {boolean} True if component was removed
     */
    removeComponent(name) {
        if (!this.components.has(name)) {
            return false;
        }
        
        const component = this.components.get(name);
        
        // Cleanup component if it has a destroy method
        if (component && typeof component.destroy === 'function') {
            try {
                component.destroy();
            } catch (error) {
                console.error(`Error destroying component ${name}:`, error);
            }
        }
        
        this.components.delete(name);
        this.emit('componentRemoved', { entity: this, name, component });
        
        return true;
    }

    /**
     * Gets a component by name
     * @param {string} name - Component name
     * @returns {Object|null} Component instance or null if not found
     */
    getComponent(name) {
        return this.components.get(name) || null;
    }

    /**
     * Checks if entity has a specific component
     * @param {string} name - Component name
     * @returns {boolean} True if component exists
     */
    hasComponent(name) {
        return this.components.has(name);
    }

    /**
     * Adds an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback function
     */
    on(event, callback) {
        if (typeof event !== 'string' || typeof callback !== 'function') {
            throw new Error('Invalid event listener parameters');
        }
        
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Removes an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback function to remove
     */
    off(event, callback) {
        if (!this.eventListeners.has(event)) {
            return;
        }
        
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        
        if (index !== -1) {
            listeners.splice(index, 1);
        }
        
        if (listeners.length === 0) {
            this.eventListeners.delete(event);
        }
    }

    /**
     * Emits an event to all registered listeners
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emit(event, data = {}) {
        if (!this.eventListeners.has(event)) {
            return;
        }
        
        const listeners = this.eventListeners.get(event);
        
        for (const callback of listeners) {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        }
    }

    /**
     * Destroys the entity and cleans up resources
     */
    destroy() {
        try {
            this.active = false;
            this.visible = false;
            
            // Destroy all components
            for (const [name, component] of this.components) {
                if (component && typeof component.destroy === 'function') {
                    component.destroy();
                }
            }
            this.components.clear();
            
            // Clear event listeners
            this.eventListeners.clear();
            
            // Clear sprite reference
            this.spriteImage = null;
            
            this.emit('destroyed', { entity: this });
            
            console.log(`Entity destroyed: ${this.type} (${this.id})`);
            
        } catch (error) {
            console.error(`Error destroying entity ${this.id}:`, error);
        }
    }

    /**
     * Gets entity performance statistics
     * @returns {Object} Performance metrics
     */
    getPerformanceStats() {
        return {
            id: this.id,
            type: this.type,
            updateCount: this.updateCount,
            renderCount: this.renderCount,
            lastUpdateTime: this.lastUpdateTime,
            componentsCount: this.components.size,
            listenersCount: Array.from(this.eventListeners.values())
                .reduce((sum, listeners) => sum + listeners.length, 0)
        };
    }

    /**
     * Serializes entity state to JSON
     * @returns {Object} Serialized entity data
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            active: this.active,
            visible: this.visible,
            position: { x: this.position.x, y: this.position.y },
            velocity: { x: this.velocity.x, y: this.velocity.y },
            acceleration: { x: this.acceleration.x, y: this.acceleration.y },
            width: this.width,
            height: this.height,
            rotation: this.rotation,
            scale: this.scale,
            sprite: this.sprite,
            spriteLoaded: this.spriteLoaded
        };
    }

    /**
     * Creates entity from serialized data
     * @param {Object} data - Serialized entity data
     * @returns {Entity} New entity instance
     * @static
     */
    static fromJSON(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid entity data for deserialization');
        }
        
        const entity = new Entity({
            x: data.position?.x,
            y: data.position?.y,
            width: data.width,
            height: data.height,
            rotation: data.rotation,
            scale: data.scale,
            sprite: data.sprite,
            visible: data.visible,
            type: data.type
        });
        
        // Restore velocity and acceleration
        if (data.velocity) {
            entity.setVelocity(data.velocity.x, data.velocity.y);
        }
        
        if (data.acceleration) {
            entity.setAcceleration(data.acceleration.x, data.acceleration.y);
        }
        
        entity.active = Boolean(data.active);
        
        return entity;
    }
}

// Export classes for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Entity, Vector2D, Rectangle };
} else if (typeof window !== 'undefined') {
    window.Entity = Entity;
    window.Vector2D = Vector2D;
    window.Rectangle = Rectangle;
}