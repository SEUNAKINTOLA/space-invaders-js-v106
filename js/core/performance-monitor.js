/**
 * Performance Monitor Module
 * 
 * Provides comprehensive performance monitoring for the Space Invaders game,
 * including FPS tracking, render time analysis, memory usage monitoring,
 * and performance bottleneck detection.
 * 
 * Key Features:
 * - Real-time FPS calculation and smoothing
 * - Frame render time tracking with percentile analysis
 * - Memory usage monitoring and leak detection
 * - Performance alerts and degradation warnings
 * - Configurable sampling rates and thresholds
 * - Debug overlay for development
 * 
 * Architecture:
 * - Event-driven design for loose coupling
 * - Circular buffer for efficient data storage
 * - Statistical analysis with rolling averages
 * - Graceful degradation when performance APIs unavailable
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025
 */

/**
 * Performance monitoring configuration
 * @typedef {Object} PerformanceConfig
 * @property {number} sampleSize - Number of samples to keep for analysis
 * @property {number} updateInterval - How often to update metrics (ms)
 * @property {number} fpsThreshold - Minimum acceptable FPS
 * @property {number} renderTimeThreshold - Maximum acceptable render time (ms)
 * @property {boolean} enableMemoryMonitoring - Whether to track memory usage
 * @property {boolean} enableDebugOverlay - Whether to show debug information
 */

/**
 * Performance metrics data structure
 * @typedef {Object} PerformanceMetrics
 * @property {number} fps - Current frames per second
 * @property {number} avgFps - Average FPS over sample period
 * @property {number} minFps - Minimum FPS in sample period
 * @property {number} maxFps - Maximum FPS in sample period
 * @property {number} renderTime - Current frame render time (ms)
 * @property {number} avgRenderTime - Average render time (ms)
 * @property {number} p95RenderTime - 95th percentile render time (ms)
 * @property {number} memoryUsage - Current memory usage (MB)
 * @property {number} frameDrops - Number of dropped frames
 * @property {boolean} isPerformanceGood - Overall performance health
 */

/**
 * Circular buffer for efficient data storage
 */
class CircularBuffer {
    /**
     * Creates a new circular buffer
     * @param {number} size - Maximum number of elements to store
     */
    constructor(size) {
        this.size = Math.max(1, size);
        this.buffer = new Array(this.size);
        this.head = 0;
        this.count = 0;
    }

    /**
     * Adds a value to the buffer
     * @param {number} value - Value to add
     */
    push(value) {
        this.buffer[this.head] = value;
        this.head = (this.head + 1) % this.size;
        this.count = Math.min(this.count + 1, this.size);
    }

    /**
     * Gets all values in the buffer
     * @returns {number[]} Array of values
     */
    getValues() {
        if (this.count === 0) return [];
        
        const values = [];
        for (let i = 0; i < this.count; i++) {
            const index = (this.head - this.count + i + this.size) % this.size;
            values.push(this.buffer[index]);
        }
        return values;
    }

    /**
     * Gets the average of all values
     * @returns {number} Average value
     */
    getAverage() {
        const values = this.getValues();
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    }

    /**
     * Gets the minimum value
     * @returns {number} Minimum value
     */
    getMin() {
        const values = this.getValues();
        return values.length > 0 ? Math.min(...values) : 0;
    }

    /**
     * Gets the maximum value
     * @returns {number} Maximum value
     */
    getMax() {
        const values = this.getValues();
        return values.length > 0 ? Math.max(...values) : 0;
    }

    /**
     * Gets the percentile value
     * @param {number} percentile - Percentile to calculate (0-100)
     * @returns {number} Percentile value
     */
    getPercentile(percentile) {
        const values = this.getValues().sort((a, b) => a - b);
        if (values.length === 0) return 0;
        
        const index = Math.ceil((percentile / 100) * values.length) - 1;
        return values[Math.max(0, Math.min(index, values.length - 1))];
    }

    /**
     * Clears all values from the buffer
     */
    clear() {
        this.head = 0;
        this.count = 0;
    }
}

/**
 * Performance Monitor class for tracking game performance metrics
 */
class PerformanceMonitor {
    /**
     * Creates a new performance monitor
     * @param {PerformanceConfig} config - Configuration options
     */
    constructor(config = {}) {
        // Configuration with secure defaults
        this.config = {
            sampleSize: Math.max(10, Math.min(1000, config.sampleSize || 60)),
            updateInterval: Math.max(100, Math.min(5000, config.updateInterval || 1000)),
            fpsThreshold: Math.max(15, Math.min(120, config.fpsThreshold || 30)),
            renderTimeThreshold: Math.max(1, Math.min(100, config.renderTimeThreshold || 16.67)),
            enableMemoryMonitoring: Boolean(config.enableMemoryMonitoring ?? true),
            enableDebugOverlay: Boolean(config.enableDebugOverlay ?? false),
            ...config
        };

        // Performance tracking buffers
        this.fpsBuffer = new CircularBuffer(this.config.sampleSize);
        this.renderTimeBuffer = new CircularBuffer(this.config.sampleSize);
        this.memoryBuffer = new CircularBuffer(this.config.sampleSize);

        // Timing variables
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.lastUpdateTime = 0;
        this.frameDrops = 0;

        // Current metrics
        this.currentMetrics = this._createEmptyMetrics();

        // Event listeners
        this.listeners = new Map();

        // Performance API availability
        this.hasPerformanceAPI = typeof performance !== 'undefined' && performance.now;
        this.hasMemoryAPI = typeof performance !== 'undefined' && performance.memory;

        // Debug overlay element
        this.debugOverlay = null;

        // Initialize
        this._initialize();
    }

    /**
     * Initializes the performance monitor
     * @private
     */
    _initialize() {
        try {
            if (this.config.enableDebugOverlay) {
                this._createDebugOverlay();
            }

            // Start the update loop
            this._startUpdateLoop();

            this._log('info', 'Performance monitor initialized', {
                config: this.config,
                hasPerformanceAPI: this.hasPerformanceAPI,
                hasMemoryAPI: this.hasMemoryAPI
            });
        } catch (error) {
            this._handleError('Failed to initialize performance monitor', error);
        }
    }

    /**
     * Creates empty metrics object
     * @returns {PerformanceMetrics} Empty metrics
     * @private
     */
    _createEmptyMetrics() {
        return {
            fps: 0,
            avgFps: 0,
            minFps: 0,
            maxFps: 0,
            renderTime: 0,
            avgRenderTime: 0,
            p95RenderTime: 0,
            memoryUsage: 0,
            frameDrops: 0,
            isPerformanceGood: true
        };
    }

    /**
     * Starts a new frame measurement
     * @returns {number} Frame start timestamp
     */
    startFrame() {
        try {
            const now = this._getCurrentTime();
            
            // Calculate FPS if we have a previous frame
            if (this.lastFrameTime > 0) {
                const deltaTime = now - this.lastFrameTime;
                if (deltaTime > 0) {
                    const fps = 1000 / deltaTime;
                    this.fpsBuffer.push(fps);
                    
                    // Detect frame drops (assuming 60 FPS target)
                    if (deltaTime > 20) { // More than ~50 FPS
                        this.frameDrops++;
                    }
                }
            }

            this.lastFrameTime = now;
            this.frameCount++;

            return now;
        } catch (error) {
            this._handleError('Failed to start frame measurement', error);
            return this._getCurrentTime();
        }
    }

    /**
     * Ends frame measurement and records render time
     * @param {number} frameStartTime - Timestamp from startFrame()
     */
    endFrame(frameStartTime) {
        try {
            const now = this._getCurrentTime();
            const renderTime = now - frameStartTime;
            
            if (renderTime >= 0) {
                this.renderTimeBuffer.push(renderTime);
            }

            // Update metrics periodically
            if (now - this.lastUpdateTime >= this.config.updateInterval) {
                this._updateMetrics();
                this.lastUpdateTime = now;
            }
        } catch (error) {
            this._handleError('Failed to end frame measurement', error);
        }
    }

    /**
     * Updates all performance metrics
     * @private
     */
    _updateMetrics() {
        try {
            // FPS metrics
            const fpsValues = this.fpsBuffer.getValues();
            this.currentMetrics.fps = fpsValues.length > 0 ? fpsValues[fpsValues.length - 1] : 0;
            this.currentMetrics.avgFps = this.fpsBuffer.getAverage();
            this.currentMetrics.minFps = this.fpsBuffer.getMin();
            this.currentMetrics.maxFps = this.fpsBuffer.getMax();

            // Render time metrics
            const renderTimeValues = this.renderTimeBuffer.getValues();
            this.currentMetrics.renderTime = renderTimeValues.length > 0 ? renderTimeValues[renderTimeValues.length - 1] : 0;
            this.currentMetrics.avgRenderTime = this.renderTimeBuffer.getAverage();
            this.currentMetrics.p95RenderTime = this.renderTimeBuffer.getPercentile(95);

            // Memory metrics
            if (this.config.enableMemoryMonitoring && this.hasMemoryAPI) {
                const memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
                this.memoryBuffer.push(memoryUsage);
                this.currentMetrics.memoryUsage = memoryUsage;
            }

            // Frame drops
            this.currentMetrics.frameDrops = this.frameDrops;

            // Overall performance health
            this.currentMetrics.isPerformanceGood = this._assessPerformanceHealth();

            // Emit metrics update event
            this._emit('metricsUpdated', { ...this.currentMetrics });

            // Check for performance issues
            this._checkPerformanceThresholds();

            // Update debug overlay
            if (this.config.enableDebugOverlay && this.debugOverlay) {
                this._updateDebugOverlay();
            }
        } catch (error) {
            this._handleError('Failed to update metrics', error);
        }
    }

    /**
     * Assesses overall performance health
     * @returns {boolean} True if performance is good
     * @private
     */
    _assessPerformanceHealth() {
        const fpsGood = this.currentMetrics.avgFps >= this.config.fpsThreshold;
        const renderTimeGood = this.currentMetrics.avgRenderTime <= this.config.renderTimeThreshold;
        const frameDropsAcceptable = this.frameDrops < (this.frameCount * 0.05); // Less than 5% drops
        
        return fpsGood && renderTimeGood && frameDropsAcceptable;
    }

    /**
     * Checks performance thresholds and emits warnings
     * @private
     */
    _checkPerformanceThresholds() {
        // Low FPS warning
        if (this.currentMetrics.avgFps < this.config.fpsThreshold) {
            this._emit('performanceWarning', {
                type: 'lowFps',
                message: `Average FPS (${this.currentMetrics.avgFps.toFixed(1)}) below threshold (${this.config.fpsThreshold})`,
                severity: 'warning',
                metrics: { ...this.currentMetrics }
            });
        }

        // High render time warning
        if (this.currentMetrics.avgRenderTime > this.config.renderTimeThreshold) {
            this._emit('performanceWarning', {
                type: 'highRenderTime',
                message: `Average render time (${this.currentMetrics.avgRenderTime.toFixed(2)}ms) above threshold (${this.config.renderTimeThreshold}ms)`,
                severity: 'warning',
                metrics: { ...this.currentMetrics }
            });
        }

        // Memory usage warning (if over 100MB)
        if (this.currentMetrics.memoryUsage > 100) {
            this._emit('performanceWarning', {
                type: 'highMemoryUsage',
                message: `Memory usage (${this.currentMetrics.memoryUsage.toFixed(1)}MB) is high`,
                severity: 'info',
                metrics: { ...this.currentMetrics }
            });
        }
    }

    /**
     * Gets current performance metrics
     * @returns {PerformanceMetrics} Current metrics
     */
    getMetrics() {
        return { ...this.currentMetrics };
    }

    /**
     * Gets performance summary for logging/debugging
     * @returns {Object} Performance summary
     */
    getPerformanceSummary() {
        return {
            fps: {
                current: Number(this.currentMetrics.fps.toFixed(1)),
                average: Number(this.currentMetrics.avgFps.toFixed(1)),
                min: Number(this.currentMetrics.minFps.toFixed(1)),
                max: Number(this.currentMetrics.maxFps.toFixed(1))
            },
            renderTime: {
                current: Number(this.currentMetrics.renderTime.toFixed(2)),
                average: Number(this.currentMetrics.avgRenderTime.toFixed(2)),
                p95: Number(this.currentMetrics.p95RenderTime.toFixed(2))
            },
            memory: {
                usage: Number(this.currentMetrics.memoryUsage.toFixed(1))
            },
            health: {
                isGood: this.currentMetrics.isPerformanceGood,
                frameDrops: this.currentMetrics.frameDrops,
                totalFrames: this.frameCount
            }
        };
    }

    /**
     * Resets all performance counters
     */
    reset() {
        try {
            this.fpsBuffer.clear();
            this.renderTimeBuffer.clear();
            this.memoryBuffer.clear();
            
            this.frameCount = 0;
            this.frameDrops = 0;
            this.lastFrameTime = 0;
            this.lastUpdateTime = 0;
            
            this.currentMetrics = this._createEmptyMetrics();
            
            this._emit('metricsReset');
            this._log('info', 'Performance metrics reset');
        } catch (error) {
            this._handleError('Failed to reset performance metrics', error);
        }
    }

    /**
     * Adds event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    addEventListener(event, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    /**
     * Removes event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    removeEventListener(event, callback) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(callback);
            if (eventListeners.size === 0) {
                this.listeners.delete(event);
            }
        }
    }

    /**
     * Creates debug overlay element
     * @private
     */
    _createDebugOverlay() {
        try {
            this.debugOverlay = document.createElement('div');
            this.debugOverlay.id = 'performance-debug-overlay';
            this.debugOverlay.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #00ff00;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                padding: 10px;
                border-radius: 5px;
                z-index: 10000;
                min-width: 200px;
                pointer-events: none;
            `;
            
            document.body.appendChild(this.debugOverlay);
        } catch (error) {
            this._handleError('Failed to create debug overlay', error);
        }
    }

    /**
     * Updates debug overlay content
     * @private
     */
    _updateDebugOverlay() {
        if (!this.debugOverlay) return;

        try {
            const metrics = this.currentMetrics;
            const healthColor = metrics.isPerformanceGood ? '#00ff00' : '#ff6600';
            
            this.debugOverlay.innerHTML = `
                <div style="color: ${healthColor}; font-weight: bold;">Performance Monitor</div>
                <div>FPS: ${metrics.fps.toFixed(1)} (avg: ${metrics.avgFps.toFixed(1)})</div>
                <div>Render: ${metrics.renderTime.toFixed(2)}ms (avg: ${metrics.avgRenderTime.toFixed(2)}ms)</div>
                <div>P95 Render: ${metrics.p95RenderTime.toFixed(2)}ms</div>
                ${this.config.enableMemoryMonitoring ? `<div>Memory: ${metrics.memoryUsage.toFixed(1)}MB</div>` : ''}
                <div>Frame Drops: ${metrics.frameDrops}</div>
                <div>Total Frames: ${this.frameCount}</div>
                <div style="color: ${healthColor}">Health: ${metrics.isPerformanceGood ? 'Good' : 'Poor'}</div>
            `;
        } catch (error) {
            this._handleError('Failed to update debug overlay', error);
        }
    }

    /**
     * Starts the update loop
     * @private
     */
    _startUpdateLoop() {
        const updateLoop = () => {
            try {
                // Update memory metrics if enabled
                if (this.config.enableMemoryMonitoring && this.hasMemoryAPI) {
                    const now = this._getCurrentTime();
                    if (now - this.lastUpdateTime >= this.config.updateInterval) {
                        this._updateMetrics();
                        this.lastUpdateTime = now;
                    }
                }
            } catch (error) {
                this._handleError('Error in update loop', error);
            }
            
            setTimeout(updateLoop, this.config.updateInterval);
        };
        
        updateLoop();
    }

    /**
     * Gets current high-resolution timestamp
     * @returns {number} Current timestamp in milliseconds
     * @private
     */
    _getCurrentTime() {
        return this.hasPerformanceAPI ? performance.now() : Date.now();
    }

    /**
     * Emits an event to all listeners
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @private
     */
    _emit(event, data) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this._handleError(`Error in event listener for ${event}`, error);
                }
            });
        }
    }

    /**
     * Handles errors with logging
     * @param {string} message - Error message
     * @param {Error} error - Error object
     * @private
     */
    _handleError(message, error) {
        const errorInfo = {
            message,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        
        this._log('error', message, errorInfo);
        this._emit('error', errorInfo);
    }

    /**
     * Logs messages with structured format
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     * @private
     */
    _log(level, message, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            component: 'PerformanceMonitor',
            message,
            ...data
        };

        // Use appropriate console method
        const consoleMethod = console[level] || console.log;
        consoleMethod('[PerformanceMonitor]', message, data);
    }

    /**
     * Destroys the performance monitor and cleans up resources
     */
    destroy() {
        try {
            // Remove debug overlay
            if (this.debugOverlay && this.debugOverlay.parentNode) {
                this.debugOverlay.parentNode.removeChild(this.debugOverlay);
                this.debugOverlay = null;
            }

            // Clear all listeners
            this.listeners.clear();

            // Clear buffers
            this.fpsBuffer.clear();
            this.renderTimeBuffer.clear();
            this.memoryBuffer.clear();

            this._log('info', 'Performance monitor destroyed');
        } catch (error) {
            this._handleError('Failed to destroy performance monitor', error);
        }
    }
}

// Export the PerformanceMonitor class and related utilities
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceMonitor, CircularBuffer };
} else if (typeof window !== 'undefined') {
    window.PerformanceMonitor = PerformanceMonitor;
    window.CircularBuffer = CircularBuffer;
}