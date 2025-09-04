*/
class GameLoop {
    /**
     * Creates a new GameLoop instance
     * 
     * @param {Object} callbacks - Game loop callbacks
     * @param {Function} callbacks.update - Update function called each frame
     * @param {Function} callbacks.render - Render function called each frame
     * @param {Function} [callbacks.onError] - Error handler callback
     * @param {PerformanceConfig} [config] - Performance configuration
     */
    constructor(callbacks = {}, config = {}) {
        // Validate required callbacks
        if (typeof callbacks.update !== 'function') {
            throw new Error('GameLoop requires an update callback function');
        }
        if (typeof callbacks.render !== 'function') {
            throw new Error('GameLoop requires a render callback function');
        }

        // Core callbacks
        this._updateCallback = callbacks.update;
        this._renderCallback = callbacks.render;
        this._errorCallback = callbacks.onError || this._defaultErrorHandler.bind(this);

        // Configuration
        this._config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
        this._targetFrameTime = 1000 / this._config.targetFPS;

        // State management
        this._state = GameLoopState.STOPPED;
        this._animationFrameId = null;
        this._isRunning = false;

        // Timing variables
        this._lastFrameTime = 0;
        this._currentTime = 0;
        this._deltaTime = 0;
        this._accumulator = 0;

        // Performance monitoring
        this._frameCount = 0;
        this._fpsHistory = [];
        this._performanceMetrics = {
            averageFPS: 0,
            minFPS: Infinity,
            maxFPS: 0,
            frameTime: 0,
            updateTime: 0,
            renderTime: 0
        };

        // Event listeners for state changes
        this._stateListeners = new Map();

        // Bind methods to preserve context
        this._gameLoopStep = this._gameLoopStep.bind(this);
        this._handleVisibilityChange = this._handleVisibilityChange.bind(this);

        // Setup browser visibility API for automatic pause/resume
        this._setupVisibilityHandling();

        // Initialize performance monitoring
        this._initializePerformanceMonitoring();

        console.log('GameLoop initialized with config:', this._config);
    }

    /**
     * Starts the game loop
     * 
     * @throws {Error} If loop is already running
     * @returns {GameLoop} Returns this for method chaining
     */
    start() {
        if (this._state === GameLoopState.RUNNING) {
            console.warn('GameLoop is already running');
            return this;
        }

        try {
            this._state = GameLoopState.RUNNING;
            this._isRunning = true;
            this._lastFrameTime = performance.now();
            this._currentTime = this._lastFrameTime;
            
            // Reset performance metrics
            this._resetPerformanceMetrics();
            
            // Start the loop
            this._animationFrameId = requestAnimationFrame(this._gameLoopStep);
            
            this._notifyStateChange(GameLoopState.RUNNING);
            console.log('GameLoop started');
            
        } catch (error) {
            this._handleError('Failed to start game loop', error);
        }

        return this;
    }

    /**
     * Stops the game loop
     * 
     * @returns {GameLoop} Returns this for method chaining
     */
    stop() {
        if (this._state === GameLoopState.STOPPED) {
            return this;
        }

        try {
            this._isRunning = false;
            this._state = GameLoopState.STOPPED;
            
            if (this._animationFrameId) {
                cancelAnimationFrame(this._animationFrameId);
                this._animationFrameId = null;
            }
            
            this._notifyStateChange(GameLoopState.STOPPED);
            console.log('GameLoop stopped');
            
        } catch (error) {
            this._handleError('Failed to stop game loop', error);
        }

        return this;
    }

    /**
     * Pauses the game loop
     * 
     * @returns {GameLoop} Returns this for method chaining
     */
    pause() {
        if (this._state !== GameLoopState.RUNNING) {
            return this;
        }

        try {
            this._state = GameLoopState.PAUSED;
            
            if (this._animationFrameId) {
                cancelAnimationFrame(this._animationFrameId);
                this._animationFrameId = null;
            }
            
            this._notifyStateChange(GameLoopState.PAUSED);
            console.log('GameLoop paused');
            
        } catch (error) {
            this._handleError('Failed to pause game loop', error);
        }

        return this;
    }

    /**
     * Resumes the game loop from paused state
     * 
     * @returns {GameLoop} Returns this for method chaining
     */
    resume() {
        if (this._state !== GameLoopState.PAUSED) {
            return this;
        }

        try {
            this._state = GameLoopState.RUNNING;
            this._lastFrameTime = performance.now();
            this._animationFrameId = requestAnimationFrame(this._gameLoopStep);
            
            this._notifyStateChange(GameLoopState.RUNNING);
            console.log('GameLoop resumed');
            
        } catch (error) {
            this._handleError('Failed to resume game loop', error);
        }

        return this;
    }

    /**
     * Main game loop step executed each frame
     * 
     * @private
     * @param {number} timestamp - High-resolution timestamp from requestAnimationFrame
     */
    _gameLoopStep(timestamp) {
        if (!this._isRunning || this._state !== GameLoopState.RUNNING) {
            return;
        }

        try {
            // Calculate delta time
            this._currentTime = timestamp;
            this._deltaTime = Math.min(
                this._currentTime - this._lastFrameTime,
                this._config.maxDeltaTime
            );
            this._lastFrameTime = this._currentTime;

            // Performance monitoring start
            const frameStartTime = performance.now();

            // Update game logic
            const updateStartTime = performance.now();
            this._updateCallback(this._deltaTime);
            const updateEndTime = performance.now();

            // Render game
            const renderStartTime = performance.now();
            const interpolation = this._calculateInterpolation();
            this._renderCallback(interpolation);
            const renderEndTime = performance.now();

            // Performance monitoring end
            const frameEndTime = performance.now();

            // Update performance metrics
            this._updatePerformanceMetrics(
                frameEndTime - frameStartTime,
                updateEndTime - updateStartTime,
                renderEndTime - renderStartTime
            );

            // Schedule next frame
            this._animationFrameId = requestAnimationFrame(this._gameLoopStep);

        } catch (error) {
            this._handleError('Error in game loop step', error);
        }
    }

    /**
     * Calculates interpolation factor for smooth rendering
     * 
     * @private
     * @returns {number} Interpolation factor between 0 and 1
     */
    _calculateInterpolation() {
        // Simple interpolation based on frame timing
        // Can be enhanced for more sophisticated interpolation
        return Math.min(this._deltaTime / this._targetFrameTime, 1.0);
    }

    /**
     * Updates performance metrics
     * 
     * @private
     * @param {number} frameTime - Total frame time in milliseconds
     * @param {number} updateTime - Update phase time in milliseconds
     * @param {number} renderTime - Render phase time in milliseconds
     */
    _updatePerformanceMetrics(frameTime, updateTime, renderTime) {
        if (!this._config.enableProfiling) {
            return;
        }

        this._frameCount++;
        const currentFPS = 1000 / frameTime;

        // Update FPS history
        this._fpsHistory.push(currentFPS);
        if (this._fpsHistory.length > this._config.performanceSampleSize) {
            this._fpsHistory.shift();
        }

        // Calculate metrics
        this._performanceMetrics.frameTime = frameTime;
        this._performanceMetrics.updateTime = updateTime;
        this._performanceMetrics.renderTime = renderTime;
        this._performanceMetrics.minFPS = Math.min(this._performanceMetrics.minFPS, currentFPS);
        this._performanceMetrics.maxFPS = Math.max(this._performanceMetrics.maxFPS, currentFPS);
        
        // Calculate average FPS
        if (this._fpsHistory.length > 0) {
            this._performanceMetrics.averageFPS = 
                this._fpsHistory.reduce((sum, fps) => sum + fps, 0) / this._fpsHistory.length;
        }
    }

    /**
     * Resets performance metrics
     * 
     * @private
     */
    _resetPerformanceMetrics() {
        this._frameCount = 0;
        this._fpsHistory = [];
        this._performanceMetrics = {
            averageFPS: 0,
            minFPS: Infinity,
            maxFPS: 0,
            frameTime: 0,
            updateTime: 0,
            renderTime: 0
        };
    }

    /**
     * Initializes performance monitoring
     * 
     * @private
     */
    _initializePerformanceMonitoring() {
        if (this._config.enableProfiling) {
            // Log performance metrics periodically
            setInterval(() => {
                if (this._state === GameLoopState.RUNNING) {
                    console.log('Performance Metrics:', {
                        ...this._performanceMetrics,
                        frameCount: this._frameCount
                    });
                }
            }, 5000); // Log every 5 seconds
        }
    }

    /**
     * Sets up browser visibility API handling for automatic pause/resume
     * 
     * @private
     */
    _setupVisibilityHandling() {
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this._handleVisibilityChange);
        }
    }

    /**
     * Handles browser visibility changes
     * 
     * @private
     */
    _handleVisibilityChange() {
        if (document.hidden && this._state === GameLoopState.RUNNING) {
            this.pause();
            console.log('GameLoop auto-paused due to tab visibility change');
        } else if (!document.hidden && this._state === GameLoopState.PAUSED) {
            this.resume();
            console.log('GameLoop auto-resumed due to tab visibility change');
        }
    }

    /**
     * Default error handler
     * 
     * @private
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    _defaultErrorHandler(message, error) {
        console.error(`GameLoop Error: ${message}`, error);
        
        // Attempt to recover by stopping the loop
        this._state = GameLoopState.ERROR;
        this._isRunning = false;
        
        if (this._animationFrameId) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
        
        this._notifyStateChange(GameLoopState.ERROR, { message, error });
    }

    /**
     * Handles errors with recovery attempts
     * 
     * @private
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    _handleError(message, error) {
        try {
            this._errorCallback(message, error);
        } catch (handlerError) {
            console.error('Error in error handler:', handlerError);
            this._defaultErrorHandler(message, error);
        }
    }

    /**
     * Notifies state change listeners
     * 
     * @private
     * @param {string} newState - New game loop state
     * @param {Object} [data] - Additional data to pass to listeners
     */
    _notifyStateChange(newState, data = {}) {
        const listeners = this._stateListeners.get(newState) || [];
        listeners.forEach(listener => {
            try {
                listener({ state: newState, ...data });
            } catch (error) {
                console.error('Error in state change listener:', error);
            }
        });
    }

    /**
     * Adds a state change listener
     * 
     * @param {string} state - State to listen for
     * @param {Function} callback - Callback function
     * @returns {GameLoop} Returns this for method chaining
     */
    onStateChange(state, callback) {
        if (typeof callback !== 'function') {
            throw new Error('State change callback must be a function');
        }

        if (!this._stateListeners.has(state)) {
            this._stateListeners.set(state, []);
        }
        
        this._stateListeners.get(state).push(callback);
        return this;
    }

    /**
     * Removes a state change listener
     * 
     * @param {string} state - State to remove listener from
     * @param {Function} callback - Callback function to remove
     * @returns {GameLoop} Returns this for method chaining
     */
    removeStateListener(state, callback) {
        const listeners = this._stateListeners.get(state);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
        return this;
    }

    /**
     * Gets current game loop state
     * 
     * @returns {string} Current state
     */
    getState() {
        return this._state;
    }

    /**
     * Gets performance metrics
     * 
     * @returns {Object} Performance metrics object
     */
    getPerformanceMetrics() {
        return { ...this._performanceMetrics };
    }

    /**
     * Gets current FPS
     * 
     * @returns {number} Current frames per second
     */
    getCurrentFPS() {
        return this._performanceMetrics.averageFPS;
    }

    /**
     * Checks if the game loop is running
     * 
     * @returns {boolean} True if running
     */
    isRunning() {
        return this._state === GameLoopState.RUNNING;
    }

    /**
     * Checks if the game loop is paused
     * 
     * @returns {boolean} True if paused
     */
    isPaused() {
        return this._state === GameLoopState.PAUSED;
    }

    /**
     * Updates configuration
     * 
     * @param {PerformanceConfig} newConfig - New configuration options
     * @returns {GameLoop} Returns this for method chaining
     */
    updateConfig(newConfig) {
        this._config = { ...this._config, ...newConfig };
        this._targetFrameTime = 1000 / this._config.targetFPS;
        
        console.log('GameLoop configuration updated:', this._config);
        return this;
    }

    /**
     * Cleanup method to remove event listeners and cancel animation frames
     */
    destroy() {
        this.stop();
        
        // Remove visibility change listener
        if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this._handleVisibilityChange);
        }
        
        // Clear all state listeners
        this._stateListeners.clear();
        
        console.log('GameLoop destroyed');
    }
}

// Export the GameLoop class and related constants
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameLoop, GameLoopState, DEFAULT_PERFORMANCE_CONFIG };
} else if (typeof window !== 'undefined') {
    window.GameLoop = GameLoop;
    window.GameLoopState = GameLoopState;
    window.DEFAULT_PERFORMANCE_CONFIG = DEFAULT_PERFORMANCE_CONFIG;
}