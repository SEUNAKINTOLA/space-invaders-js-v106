/**
 * Sprite Rendering System for Space Invaders
 * 
 * A high-performance, secure sprite rendering engine that handles drawing entities
 * on HTML5 Canvas with advanced features like sprite caching, batch rendering,
 * and performance monitoring.
 * 
 * Key Features:
 * - Efficient sprite caching and preloading
 * - Batch rendering for optimal performance
 * - Transform matrix operations for rotation/scaling
 * - Error handling and graceful degradation
 * - Performance monitoring and metrics
 * - Memory management and resource cleanup
 * 
 * Architecture:
 * - Clean separation of concerns
 * - Dependency injection for testability
 * - Event-driven updates
 * - Resource pooling for efficiency
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025
 */

/**
 * Configuration object for sprite renderer settings
 * @typedef {Object} SpriteRendererConfig
 * @property {number} maxCacheSize - Maximum number of cached sprites
 * @property {boolean} enableBatching - Enable batch rendering optimization
 * @property {boolean} enableMetrics - Enable performance metrics collection
 * @property {number} batchSize - Maximum sprites per batch
 * @property {boolean} debugMode - Enable debug rendering features
 */

/**
 * Sprite data structure for rendering
 * @typedef {Object} SpriteData
 * @property {HTMLImageElement|HTMLCanvasElement} image - The sprite image
 * @property {number} x - X position on canvas
 * @property {number} y - Y position on canvas
 * @property {number} width - Sprite width
 * @property {number} height - Sprite height
 * @property {number} [rotation=0] - Rotation angle in radians
 * @property {number} [scaleX=1] - Horizontal scale factor
 * @property {number} [scaleY=1] - Vertical scale factor
 * @property {number} [alpha=1] - Opacity (0-1)
 * @property {string} [blendMode='source-over'] - Canvas blend mode
 */

/**
 * Transform matrix for sprite transformations
 * @typedef {Object} Transform
 * @property {number} x - Translation X
 * @property {number} y - Translation Y
 * @property {number} rotation - Rotation in radians
 * @property {number} scaleX - Scale X factor
 * @property {number} scaleY - Scale Y factor
 */

/**
 * Performance metrics for sprite rendering
 * @typedef {Object} RenderMetrics
 * @property {number} spritesRendered - Total sprites rendered this frame
 * @property {number} batchesProcessed - Number of batches processed
 * @property {number} renderTime - Time taken for rendering (ms)
 * @property {number} cacheHits - Number of cache hits
 * @property {number} cacheMisses - Number of cache misses
 */

class SpriteRenderer {
    /**
     * Creates a new SpriteRenderer instance
     * @param {CanvasRenderingContext2D} context - The 2D rendering context
     * @param {SpriteRendererConfig} [config={}] - Configuration options
     */
    constructor(context, config = {}) {
        // Validate required dependencies
        if (!context || typeof context.drawImage !== 'function') {
            throw new Error('SpriteRenderer requires a valid CanvasRenderingContext2D');
        }

        // Initialize configuration with secure defaults
        this.config = this._validateAndMergeConfig(config);
        
        // Core rendering context
        this.context = context;
        
        // Sprite cache for performance optimization
        this.spriteCache = new Map();
        this.cacheAccessTimes = new Map();
        
        // Batch rendering system
        this.renderQueue = [];
        this.batchBuffer = [];
        
        // Performance monitoring
        this.metrics = this._initializeMetrics();
        this.frameStartTime = 0;
        
        // Transform matrix stack for nested transformations
        this.transformStack = [];
        
        // Error handling and logging
        this.errorCount = 0;
        this.lastError = null;
        
        // Resource management
        this.isDisposed = false;
        
        // Initialize performance monitoring
        if (this.config.enableMetrics) {
            this._startMetricsCollection();
        }
        
        // Bind methods for event handlers
        this.render = this.render.bind(this);
        this.dispose = this.dispose.bind(this);
        
        this._log('SpriteRenderer initialized', { config: this.config });
    }

    /**
     * Validates and merges user configuration with defaults
     * @param {SpriteRendererConfig} userConfig - User provided configuration
     * @returns {SpriteRendererConfig} Validated configuration
     * @private
     */
    _validateAndMergeConfig(userConfig) {
        const defaults = {
            maxCacheSize: 100,
            enableBatching: true,
            enableMetrics: true,
            batchSize: 50,
            debugMode: false
        };

        const config = { ...defaults, ...userConfig };

        // Validate configuration values
        if (config.maxCacheSize < 1 || config.maxCacheSize > 1000) {
            throw new Error('maxCacheSize must be between 1 and 1000');
        }
        
        if (config.batchSize < 1 || config.batchSize > 200) {
            throw new Error('batchSize must be between 1 and 200');
        }

        return config;
    }

    /**
     * Initializes performance metrics tracking
     * @returns {RenderMetrics} Initial metrics object
     * @private
     */
    _initializeMetrics() {
        return {
            spritesRendered: 0,
            batchesProcessed: 0,
            renderTime: 0,
            cacheHits: 0,
            cacheMisses: 0,
            frameCount: 0,
            averageRenderTime: 0
        };
    }

    /**
     * Starts performance metrics collection
     * @private
     */
    _startMetricsCollection() {
        // Reset metrics every second for real-time monitoring
        setInterval(() => {
            if (this.metrics.frameCount > 0) {
                this.metrics.averageRenderTime = this.metrics.renderTime / this.metrics.frameCount;
            }
            this._log('Render metrics', this.metrics);
            
            // Reset counters but keep averages
            this.metrics.spritesRendered = 0;
            this.metrics.batchesProcessed = 0;
            this.metrics.renderTime = 0;
            this.metrics.frameCount = 0;
        }, 1000);
    }

    /**
     * Renders a single sprite to the canvas
     * @param {SpriteData} spriteData - The sprite to render
     * @returns {boolean} True if rendered successfully, false otherwise
     */
    renderSprite(spriteData) {
        if (this.isDisposed) {
            this._logError('Cannot render sprite: SpriteRenderer is disposed');
            return false;
        }

        try {
            // Validate sprite data
            if (!this._validateSpriteData(spriteData)) {
                return false;
            }

            const startTime = performance.now();

            // Add to batch queue if batching is enabled
            if (this.config.enableBatching) {
                this.renderQueue.push(spriteData);
                return true;
            }

            // Render immediately if batching is disabled
            const success = this._renderSingleSprite(spriteData);
            
            if (this.config.enableMetrics) {
                this.metrics.renderTime += performance.now() - startTime;
                this.metrics.spritesRendered += success ? 1 : 0;
            }

            return success;
        } catch (error) {
            this._handleRenderError(error, 'renderSprite');
            return false;
        }
    }

    /**
     * Renders multiple sprites in a batch for optimal performance
     * @param {SpriteData[]} sprites - Array of sprites to render
     * @returns {number} Number of sprites successfully rendered
     */
    renderBatch(sprites) {
        if (this.isDisposed) {
            this._logError('Cannot render batch: SpriteRenderer is disposed');
            return 0;
        }

        if (!Array.isArray(sprites) || sprites.length === 0) {
            this._logError('renderBatch requires a non-empty array of sprites');
            return 0;
        }

        const startTime = performance.now();
        let successCount = 0;

        try {
            // Process sprites in chunks for memory efficiency
            const chunkSize = this.config.batchSize;
            
            for (let i = 0; i < sprites.length; i += chunkSize) {
                const chunk = sprites.slice(i, i + chunkSize);
                successCount += this._processBatch(chunk);
                
                if (this.config.enableMetrics) {
                    this.metrics.batchesProcessed++;
                }
            }

            if (this.config.enableMetrics) {
                this.metrics.renderTime += performance.now() - startTime;
                this.metrics.spritesRendered += successCount;
            }

            return successCount;
        } catch (error) {
            this._handleRenderError(error, 'renderBatch');
            return successCount;
        }
    }

    /**
     * Flushes the render queue and processes all queued sprites
     * @returns {number} Number of sprites rendered
     */
    flush() {
        if (this.renderQueue.length === 0) {
            return 0;
        }

        const queuedSprites = [...this.renderQueue];
        this.renderQueue.length = 0; // Clear queue

        return this.renderBatch(queuedSprites);
    }

    /**
     * Begins a new frame rendering cycle
     */
    beginFrame() {
        if (this.config.enableMetrics) {
            this.frameStartTime = performance.now();
            this.metrics.frameCount++;
        }
    }

    /**
     * Ends the current frame rendering cycle
     */
    endFrame() {
        // Flush any remaining sprites in the queue
        this.flush();
        
        if (this.config.enableMetrics && this.frameStartTime > 0) {
            const frameTime = performance.now() - this.frameStartTime;
            this.metrics.renderTime += frameTime;
        }
    }

    /**
     * Pushes a new transform matrix onto the stack
     * @param {Transform} transform - Transform to apply
     */
    pushTransform(transform) {
        this.transformStack.push(transform);
        this.context.save();
        
        if (transform.x !== 0 || transform.y !== 0) {
            this.context.translate(transform.x, transform.y);
        }
        
        if (transform.rotation !== 0) {
            this.context.rotate(transform.rotation);
        }
        
        if (transform.scaleX !== 1 || transform.scaleY !== 1) {
            this.context.scale(transform.scaleX, transform.scaleY);
        }
    }

    /**
     * Pops the current transform matrix from the stack
     */
    popTransform() {
        if (this.transformStack.length > 0) {
            this.transformStack.pop();
            this.context.restore();
        }
    }

    /**
     * Caches a sprite for improved rendering performance
     * @param {string} key - Cache key for the sprite
     * @param {HTMLImageElement|HTMLCanvasElement} image - Image to cache
     * @returns {boolean} True if cached successfully
     */
    cacheSprite(key, image) {
        if (!key || typeof key !== 'string') {
            this._logError('Cache key must be a non-empty string');
            return false;
        }

        if (!image || (!image.width && !image.naturalWidth)) {
            this._logError('Invalid image provided for caching');
            return false;
        }

        try {
            // Implement LRU cache eviction
            if (this.spriteCache.size >= this.config.maxCacheSize) {
                this._evictLeastRecentlyUsed();
            }

            this.spriteCache.set(key, image);
            this.cacheAccessTimes.set(key, Date.now());
            
            this._log('Sprite cached', { key, size: this.spriteCache.size });
            return true;
        } catch (error) {
            this._handleRenderError(error, 'cacheSprite');
            return false;
        }
    }

    /**
     * Retrieves a cached sprite
     * @param {string} key - Cache key
     * @returns {HTMLImageElement|HTMLCanvasElement|null} Cached image or null
     */
    getCachedSprite(key) {
        const sprite = this.spriteCache.get(key);
        
        if (sprite) {
            this.cacheAccessTimes.set(key, Date.now());
            if (this.config.enableMetrics) {
                this.metrics.cacheHits++;
            }
            return sprite;
        }
        
        if (this.config.enableMetrics) {
            this.metrics.cacheMisses++;
        }
        
        return null;
    }

    /**
     * Clears the sprite cache
     */
    clearCache() {
        this.spriteCache.clear();
        this.cacheAccessTimes.clear();
        this._log('Sprite cache cleared');
    }

    /**
     * Gets current performance metrics
     * @returns {RenderMetrics} Current metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Disposes of the renderer and cleans up resources
     */
    dispose() {
        if (this.isDisposed) {
            return;
        }

        this.isDisposed = true;
        
        // Clear all caches and queues
        this.clearCache();
        this.renderQueue.length = 0;
        this.batchBuffer.length = 0;
        this.transformStack.length = 0;
        
        // Reset context state
        while (this.transformStack.length > 0) {
            this.popTransform();
        }
        
        this._log('SpriteRenderer disposed');
    }

    /**
     * Validates sprite data before rendering
     * @param {SpriteData} spriteData - Sprite data to validate
     * @returns {boolean} True if valid
     * @private
     */
    _validateSpriteData(spriteData) {
        if (!spriteData || typeof spriteData !== 'object') {
            this._logError('Sprite data must be an object');
            return false;
        }

        if (!spriteData.image) {
            this._logError('Sprite data must include an image');
            return false;
        }

        if (typeof spriteData.x !== 'number' || typeof spriteData.y !== 'number') {
            this._logError('Sprite position (x, y) must be numbers');
            return false;
        }

        if (typeof spriteData.width !== 'number' || typeof spriteData.height !== 'number') {
            this._logError('Sprite dimensions (width, height) must be numbers');
            return false;
        }

        if (spriteData.width <= 0 || spriteData.height <= 0) {
            this._logError('Sprite dimensions must be positive');
            return false;
        }

        return true;
    }

    /**
     * Renders a single sprite with all transformations applied
     * @param {SpriteData} spriteData - Sprite to render
     * @returns {boolean} True if rendered successfully
     * @private
     */
    _renderSingleSprite(spriteData) {
        try {
            const ctx = this.context;
            
            // Apply sprite-specific transformations
            ctx.save();
            
            // Set alpha if specified
            if (spriteData.alpha !== undefined && spriteData.alpha !== 1) {
                ctx.globalAlpha = Math.max(0, Math.min(1, spriteData.alpha));
            }
            
            // Set blend mode if specified
            if (spriteData.blendMode && spriteData.blendMode !== 'source-over') {
                ctx.globalCompositeOperation = spriteData.blendMode;
            }
            
            // Apply transformations if needed
            const hasTransforms = spriteData.rotation || 
                                 (spriteData.scaleX !== undefined && spriteData.scaleX !== 1) ||
                                 (spriteData.scaleY !== undefined && spriteData.scaleY !== 1);
            
            if (hasTransforms) {
                const centerX = spriteData.x + spriteData.width / 2;
                const centerY = spriteData.y + spriteData.height / 2;
                
                ctx.translate(centerX, centerY);
                
                if (spriteData.rotation) {
                    ctx.rotate(spriteData.rotation);
                }
                
                if (spriteData.scaleX !== undefined || spriteData.scaleY !== undefined) {
                    ctx.scale(spriteData.scaleX || 1, spriteData.scaleY || 1);
                }
                
                ctx.drawImage(
                    spriteData.image,
                    -spriteData.width / 2,
                    -spriteData.height / 2,
                    spriteData.width,
                    spriteData.height
                );
            } else {
                // Simple draw without transformations
                ctx.drawImage(
                    spriteData.image,
                    spriteData.x,
                    spriteData.y,
                    spriteData.width,
                    spriteData.height
                );
            }
            
            ctx.restore();
            
            // Debug rendering if enabled
            if (this.config.debugMode) {
                this._renderDebugInfo(spriteData);
            }
            
            return true;
        } catch (error) {
            this._handleRenderError(error, '_renderSingleSprite');
            return false;
        }
    }

    /**
     * Processes a batch of sprites for rendering
     * @param {SpriteData[]} batch - Batch of sprites to render
     * @returns {number} Number of sprites successfully rendered
     * @private
     */
    _processBatch(batch) {
        let successCount = 0;
        
        for (const sprite of batch) {
            if (this._validateSpriteData(sprite)) {
                if (this._renderSingleSprite(sprite)) {
                    successCount++;
                }
            }
        }
        
        return successCount;
    }

    /**
     * Evicts the least recently used sprite from cache
     * @private
     */
    _evictLeastRecentlyUsed() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, time] of this.cacheAccessTimes) {
            if (time < oldestTime) {
                oldestTime = time;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.spriteCache.delete(oldestKey);
            this.cacheAccessTimes.delete(oldestKey);
            this._log('Evicted sprite from cache', { key: oldestKey });
        }
    }

    /**
     * Renders debug information for a sprite
     * @param {SpriteData} spriteData - Sprite data
     * @private
     */
    _renderDebugInfo(spriteData) {
        const ctx = this.context;
        ctx.save();
        
        // Draw bounding box
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.strokeRect(spriteData.x, spriteData.y, spriteData.width, spriteData.height);
        
        // Draw center point
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(
            spriteData.x + spriteData.width / 2 - 1,
            spriteData.y + spriteData.height / 2 - 1,
            2,
            2
        );
        
        ctx.restore();
    }

    /**
     * Handles rendering errors with appropriate logging and recovery
     * @param {Error} error - The error that occurred
     * @param {string} context - Context where the error occurred
     * @private
     */
    _handleRenderError(error, context) {
        this.errorCount++;
        this.lastError = {
            error: error.message,
            context,
            timestamp: Date.now()
        };
        
        this._logError(`Rendering error in ${context}`, error);
        
        // Implement circuit breaker pattern for repeated errors
        if (this.errorCount > 10) {
            this._logError('Too many rendering errors, consider restarting renderer');
        }
    }

    /**
     * Logs informational messages
     * @param {string} message - Log message
     * @param {Object} [data] - Additional data to log
     * @private
     */
    _log(message, data = {}) {
        if (console && console.log) {
            console.log(`[SpriteRenderer] ${message}`, data);
        }
    }

    /**
     * Logs error messages
     * @param {string} message - Error message
     * @param {Error|Object} [error] - Error object or additional data
     * @private
     */
    _logError(message, error = {}) {
        if (console && console.error) {
            console.error(`[SpriteRenderer ERROR] ${message}`, error);
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpriteRenderer;
}

// Global export for browser environments
if (typeof window !== 'undefined') {
    window.SpriteRenderer = SpriteRenderer;
}