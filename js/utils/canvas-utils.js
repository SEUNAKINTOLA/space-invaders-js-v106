/**
 * Canvas Utilities Module
 * 
 * Provides comprehensive canvas utility functions for HTML5 Canvas games with
 * responsive design, scaling, and performance optimizations.
 * 
 * Key Features:
 * - Responsive canvas scaling and resizing
 * - Device pixel ratio handling for crisp rendering
 * - Canvas context optimization
 * - Coordinate transformation utilities
 * - Performance monitoring and metrics
 * 
 * Architecture:
 * - Pure functional approach for predictable behavior
 * - Immutable transformations where possible
 * - Error boundary patterns for graceful degradation
 * - Observable patterns for canvas state changes
 * 
 * @module CanvasUtils
 * @version 1.0.0
 * @author Space Invaders JS Team
 */

/**
 * Canvas configuration object type definition
 * @typedef {Object} CanvasConfig
 * @property {number} width - Canvas logical width
 * @property {number} height - Canvas logical height
 * @property {number} minWidth - Minimum canvas width
 * @property {number} maxWidth - Maximum canvas width
 * @property {boolean} maintainAspectRatio - Whether to maintain aspect ratio
 * @property {string} scaleMode - Scaling mode ('fit', 'fill', 'stretch')
 * @property {boolean} pixelPerfect - Enable pixel-perfect rendering
 */

/**
 * Canvas state object type definition
 * @typedef {Object} CanvasState
 * @property {number} logicalWidth - Current logical width
 * @property {number} logicalHeight - Current logical height
 * @property {number} actualWidth - Current actual canvas width
 * @property {number} actualHeight - Current actual canvas height
 * @property {number} scaleX - Horizontal scale factor
 * @property {number} scaleY - Vertical scale factor
 * @property {number} devicePixelRatio - Current device pixel ratio
 * @property {boolean} isRetina - Whether display is high-DPI
 */

/**
 * Performance metrics for canvas operations
 * @typedef {Object} CanvasMetrics
 * @property {number} frameTime - Last frame render time in ms
 * @property {number} averageFrameTime - Average frame time over last 60 frames
 * @property {number} fps - Current frames per second
 * @property {number} drawCalls - Number of draw calls in last frame
 * @property {number} memoryUsage - Estimated canvas memory usage
 */

/**
 * Default canvas configuration
 * @type {CanvasConfig}
 */
const DEFAULT_CONFIG = {
    width: 800,
    height: 600,
    minWidth: 320,
    maxWidth: 1920,
    maintainAspectRatio: true,
    scaleMode: 'fit',
    pixelPerfect: true
};

/**
 * Canvas state management
 * @type {Map<HTMLCanvasElement, CanvasState>}
 */
const canvasStates = new Map();

/**
 * Performance metrics storage
 * @type {Map<HTMLCanvasElement, CanvasMetrics>}
 */
const performanceMetrics = new Map();

/**
 * Frame time history for FPS calculation
 * @type {Map<HTMLCanvasElement, number[]>}
 */
const frameTimeHistory = new Map();

/**
 * Event listeners registry for cleanup
 * @type {Map<HTMLCanvasElement, Function[]>}
 */
const eventListeners = new Map();

/**
 * Logger utility for structured logging
 */
const Logger = {
    /**
     * Log info message with context
     * @param {string} message - Log message
     * @param {Object} context - Additional context data
     */
    info(message, context = {}) {
        console.log(`[CanvasUtils] ${message}`, context);
    },

    /**
     * Log warning message with context
     * @param {string} message - Warning message
     * @param {Object} context - Additional context data
     */
    warn(message, context = {}) {
        console.warn(`[CanvasUtils] ${message}`, context);
    },

    /**
     * Log error message with context
     * @param {string} message - Error message
     * @param {Error|Object} error - Error object or context
     */
    error(message, error = {}) {
        console.error(`[CanvasUtils] ${message}`, error);
    }
};

/**
 * Validates canvas element and throws descriptive error if invalid
 * @param {HTMLCanvasElement} canvas - Canvas element to validate
 * @throws {Error} If canvas is invalid
 */
function validateCanvas(canvas) {
    if (!canvas) {
        throw new Error('Canvas element is required but was null or undefined');
    }
    
    if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error(`Expected HTMLCanvasElement, got ${typeof canvas}`);
    }
    
    if (!canvas.getContext) {
        throw new Error('Canvas element does not support getContext method');
    }
}

/**
 * Validates canvas configuration object
 * @param {CanvasConfig} config - Configuration to validate
 * @throws {Error} If configuration is invalid
 */
function validateConfig(config) {
    if (!config || typeof config !== 'object') {
        throw new Error('Canvas configuration must be an object');
    }
    
    const requiredNumbers = ['width', 'height', 'minWidth', 'maxWidth'];
    for (const prop of requiredNumbers) {
        if (typeof config[prop] !== 'number' || config[prop] <= 0) {
            throw new Error(`Configuration property '${prop}' must be a positive number`);
        }
    }
    
    if (config.width < config.minWidth || config.width > config.maxWidth) {
        throw new Error('Canvas width must be between minWidth and maxWidth');
    }
    
    const validScaleModes = ['fit', 'fill', 'stretch'];
    if (!validScaleModes.includes(config.scaleMode)) {
        throw new Error(`Invalid scale mode '${config.scaleMode}'. Must be one of: ${validScaleModes.join(', ')}`);
    }
}

/**
 * Gets the device pixel ratio with fallback
 * @returns {number} Device pixel ratio
 */
function getDevicePixelRatio() {
    try {
        return window.devicePixelRatio || 1;
    } catch (error) {
        Logger.warn('Failed to get device pixel ratio, using fallback', { error });
        return 1;
    }
}

/**
 * Calculates optimal canvas dimensions based on container and configuration
 * @param {HTMLElement} container - Container element
 * @param {CanvasConfig} config - Canvas configuration
 * @returns {Object} Calculated dimensions {width, height, scaleX, scaleY}
 */
function calculateDimensions(container, config) {
    try {
        const containerRect = container.getBoundingClientRect();
        const containerWidth = Math.max(containerRect.width, config.minWidth);
        const containerHeight = Math.max(containerRect.height, 200); // Minimum height fallback
        
        let width = containerWidth;
        let height = containerHeight;
        let scaleX = 1;
        let scaleY = 1;
        
        if (config.maintainAspectRatio) {
            const targetAspectRatio = config.width / config.height;
            const containerAspectRatio = containerWidth / containerHeight;
            
            switch (config.scaleMode) {
                case 'fit':
                    if (containerAspectRatio > targetAspectRatio) {
                        // Container is wider, fit to height
                        height = containerHeight;
                        width = height * targetAspectRatio;
                    } else {
                        // Container is taller, fit to width
                        width = containerWidth;
                        height = width / targetAspectRatio;
                    }
                    scaleX = scaleY = Math.min(width / config.width, height / config.height);
                    break;
                    
                case 'fill':
                    if (containerAspectRatio > targetAspectRatio) {
                        // Container is wider, fill width
                        width = containerWidth;
                        height = width / targetAspectRatio;
                    } else {
                        // Container is taller, fill height
                        height = containerHeight;
                        width = height * targetAspectRatio;
                    }
                    scaleX = scaleY = Math.max(width / config.width, height / config.height);
                    break;
                    
                case 'stretch':
                    width = containerWidth;
                    height = containerHeight;
                    scaleX = width / config.width;
                    scaleY = height / config.height;
                    break;
            }
        } else {
            width = Math.min(Math.max(containerWidth, config.minWidth), config.maxWidth);
            height = containerHeight;
            scaleX = width / config.width;
            scaleY = height / config.height;
        }
        
        return {
            width: Math.round(width),
            height: Math.round(height),
            scaleX,
            scaleY
        };
    } catch (error) {
        Logger.error('Failed to calculate canvas dimensions', error);
        return {
            width: config.width,
            height: config.height,
            scaleX: 1,
            scaleY: 1
        };
    }
}

/**
 * Sets up canvas for high-DPI displays
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {number} width - Logical width
 * @param {number} height - Logical height
 * @param {boolean} pixelPerfect - Enable pixel-perfect rendering
 */
function setupHighDPI(canvas, context, width, height, pixelPerfect = true) {
    try {
        const devicePixelRatio = getDevicePixelRatio();
        
        if (pixelPerfect && devicePixelRatio > 1) {
            // Set actual canvas size in memory (scaled up for high-DPI)
            canvas.width = width * devicePixelRatio;
            canvas.height = height * devicePixelRatio;
            
            // Scale the canvas back down using CSS
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            
            // Scale the drawing context so everything draws at the correct size
            context.scale(devicePixelRatio, devicePixelRatio);
            
            Logger.info('High-DPI canvas setup completed', {
                devicePixelRatio,
                logicalSize: { width, height },
                actualSize: { width: canvas.width, height: canvas.height }
            });
        } else {
            canvas.width = width;
            canvas.height = height;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
        }
    } catch (error) {
        Logger.error('Failed to setup high-DPI canvas', error);
        // Fallback to standard setup
        canvas.width = width;
        canvas.height = height;
    }
}

/**
 * Optimizes canvas context for better performance
 * @param {CanvasRenderingContext2D} context - Canvas context to optimize
 */
function optimizeContext(context) {
    try {
        // Disable image smoothing for pixel-perfect rendering
        context.imageSmoothingEnabled = false;
        
        // Set optimal text rendering
        context.textBaseline = 'top';
        context.textAlign = 'left';
        
        // Optimize composite operations
        context.globalCompositeOperation = 'source-over';
        
        Logger.info('Canvas context optimization completed');
    } catch (error) {
        Logger.warn('Failed to optimize canvas context', error);
    }
}

/**
 * Creates and configures a responsive canvas element
 * @param {HTMLElement} container - Container element for the canvas
 * @param {CanvasConfig} config - Canvas configuration options
 * @returns {Object} Canvas setup result {canvas, context, state}
 */
export function createResponsiveCanvas(container, config = {}) {
    try {
        // Validate inputs
        if (!container || !(container instanceof HTMLElement)) {
            throw new Error('Container must be a valid HTML element');
        }
        
        const finalConfig = { ...DEFAULT_CONFIG, ...config };
        validateConfig(finalConfig);
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
            throw new Error('Failed to get 2D rendering context');
        }
        
        // Calculate initial dimensions
        const dimensions = calculateDimensions(container, finalConfig);
        
        // Setup high-DPI support
        setupHighDPI(canvas, context, dimensions.width, dimensions.height, finalConfig.pixelPerfect);
        
        // Optimize context
        optimizeContext(context);
        
        // Create canvas state
        const state = {
            logicalWidth: finalConfig.width,
            logicalHeight: finalConfig.height,
            actualWidth: dimensions.width,
            actualHeight: dimensions.height,
            scaleX: dimensions.scaleX,
            scaleY: dimensions.scaleY,
            devicePixelRatio: getDevicePixelRatio(),
            isRetina: getDevicePixelRatio() > 1
        };
        
        // Store state
        canvasStates.set(canvas, state);
        
        // Initialize performance metrics
        performanceMetrics.set(canvas, {
            frameTime: 0,
            averageFrameTime: 16.67, // 60 FPS baseline
            fps: 60,
            drawCalls: 0,
            memoryUsage: 0
        });
        
        frameTimeHistory.set(canvas, []);
        
        // Add canvas to container
        container.appendChild(canvas);
        
        Logger.info('Responsive canvas created successfully', {
            config: finalConfig,
            dimensions,
            state
        });
        
        return { canvas, context, state };
        
    } catch (error) {
        Logger.error('Failed to create responsive canvas', error);
        throw error;
    }
}

/**
 * Resizes canvas to fit its container while maintaining configuration
 * @param {HTMLCanvasElement} canvas - Canvas element to resize
 * @param {CanvasConfig} config - Canvas configuration
 */
export function resizeCanvas(canvas, config = DEFAULT_CONFIG) {
    try {
        validateCanvas(canvas);
        validateConfig(config);
        
        const container = canvas.parentElement;
        if (!container) {
            throw new Error('Canvas must have a parent container for resizing');
        }
        
        const context = canvas.getContext('2d');
        const dimensions = calculateDimensions(container, config);
        
        // Store current context state
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Resize canvas
        setupHighDPI(canvas, context, dimensions.width, dimensions.height, config.pixelPerfect);
        
        // Re-optimize context after resize
        optimizeContext(context);
        
        // Update state
        const state = canvasStates.get(canvas);
        if (state) {
            Object.assign(state, {
                actualWidth: dimensions.width,
                actualHeight: dimensions.height,
                scaleX: dimensions.scaleX,
                scaleY: dimensions.scaleY,
                devicePixelRatio: getDevicePixelRatio()
            });
        }
        
        Logger.info('Canvas resized successfully', { dimensions, state });
        
    } catch (error) {
        Logger.error('Failed to resize canvas', error);
        throw error;
    }
}

/**
 * Sets up automatic canvas resizing on window resize
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {CanvasConfig} config - Canvas configuration
 * @param {number} debounceMs - Debounce delay in milliseconds
 */
export function setupAutoResize(canvas, config = DEFAULT_CONFIG, debounceMs = 250) {
    try {
        validateCanvas(canvas);
        
        let resizeTimeout;
        
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                try {
                    resizeCanvas(canvas, config);
                } catch (error) {
                    Logger.error('Auto-resize failed', error);
                }
            }, debounceMs);
        };
        
        // Add event listener
        window.addEventListener('resize', handleResize);
        
        // Store listener for cleanup
        const listeners = eventListeners.get(canvas) || [];
        listeners.push(() => window.removeEventListener('resize', handleResize));
        eventListeners.set(canvas, listeners);
        
        Logger.info('Auto-resize setup completed', { debounceMs });
        
    } catch (error) {
        Logger.error('Failed to setup auto-resize', error);
        throw error;
    }
}

/**
 * Converts screen coordinates to canvas coordinates
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @returns {Object} Canvas coordinates {x, y}
 */
export function screenToCanvas(canvas, screenX, screenY) {
    try {
        validateCanvas(canvas);
        
        const rect = canvas.getBoundingClientRect();
        const state = canvasStates.get(canvas);
        
        if (!state) {
            throw new Error('Canvas state not found. Canvas may not be properly initialized.');
        }
        
        const x = (screenX - rect.left) / state.scaleX;
        const y = (screenY - rect.top) / state.scaleY;
        
        return { x, y };
        
    } catch (error) {
        Logger.error('Failed to convert screen to canvas coordinates', error);
        return { x: 0, y: 0 };
    }
}

/**
 * Converts canvas coordinates to screen coordinates
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {number} canvasX - Canvas X coordinate
 * @param {number} canvasY - Canvas Y coordinate
 * @returns {Object} Screen coordinates {x, y}
 */
export function canvasToScreen(canvas, canvasX, canvasY) {
    try {
        validateCanvas(canvas);
        
        const rect = canvas.getBoundingClientRect();
        const state = canvasStates.get(canvas);
        
        if (!state) {
            throw new Error('Canvas state not found. Canvas may not be properly initialized.');
        }
        
        const x = rect.left + (canvasX * state.scaleX);
        const y = rect.top + (canvasY * state.scaleY);
        
        return { x, y };
        
    } catch (error) {
        Logger.error('Failed to convert canvas to screen coordinates', error);
        return { x: 0, y: 0 };
    }
}

/**
 * Gets current canvas state information
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {CanvasState|null} Current canvas state or null if not found
 */
export function getCanvasState(canvas) {
    try {
        validateCanvas(canvas);
        return canvasStates.get(canvas) || null;
    } catch (error) {
        Logger.error('Failed to get canvas state', error);
        return null;
    }
}

/**
 * Updates performance metrics for a canvas
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {number} frameTime - Frame render time in milliseconds
 * @param {number} drawCalls - Number of draw calls in frame
 */
export function updatePerformanceMetrics(canvas, frameTime, drawCalls = 0) {
    try {
        validateCanvas(canvas);
        
        const metrics = performanceMetrics.get(canvas);
        const history = frameTimeHistory.get(canvas);
        
        if (!metrics || !history) {
            Logger.warn('Performance metrics not initialized for canvas');
            return;
        }
        
        // Update frame time history
        history.push(frameTime);
        if (history.length > 60) {
            history.shift(); // Keep only last 60 frames
        }
        
        // Calculate average frame time and FPS
        const averageFrameTime = history.reduce((sum, time) => sum + time, 0) / history.length;
        const fps = Math.round(1000 / averageFrameTime);
        
        // Estimate memory usage (rough approximation)
        const state = canvasStates.get(canvas);
        const memoryUsage = state ? 
            (state.actualWidth * state.actualHeight * 4) / (1024 * 1024) : 0; // RGBA bytes to MB
        
        // Update metrics
        Object.assign(metrics, {
            frameTime,
            averageFrameTime,
            fps,
            drawCalls,
            memoryUsage
        });
        
    } catch (error) {
        Logger.error('Failed to update performance metrics', error);
    }
}

/**
 * Gets performance metrics for a canvas
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {CanvasMetrics|null} Performance metrics or null if not found
 */
export function getPerformanceMetrics(canvas) {
    try {
        validateCanvas(canvas);
        return performanceMetrics.get(canvas) || null;
    } catch (error) {
        Logger.error('Failed to get performance metrics', error);
        return null;
    }
}

/**
 * Clears canvas with optional background color
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} backgroundColor - Background color (optional)
 */
export function clearCanvas(canvas, backgroundColor = null) {
    try {
        validateCanvas(canvas);
        
        const context = canvas.getContext('2d');
        const state = canvasStates.get(canvas);
        
        if (!state) {
            throw new Error('Canvas state not found');
        }
        
        if (backgroundColor) {
            context.fillStyle = backgroundColor;
            context.fillRect(0, 0, state.logicalWidth, state.logicalHeight);
        } else {
            context.clearRect(0, 0, state.logicalWidth, state.logicalHeight);
        }
        
    } catch (error) {
        Logger.error('Failed to clear canvas', error);
    }
}

/**
 * Cleans up canvas resources and event listeners
 * @param {HTMLCanvasElement} canvas - Canvas element to cleanup
 */
export function cleanupCanvas(canvas) {
    try {
        validateCanvas(canvas);
        
        // Remove event listeners
        const listeners = eventListeners.get(canvas);
        if (listeners) {
            listeners.forEach(cleanup => cleanup());
            eventListeners.delete(canvas);
        }
        
        // Clear stored data
        canvasStates.delete(canvas);
        performanceMetrics.delete(canvas);
        frameTimeHistory.delete(canvas);
        
        // Remove from DOM if still attached
        if (canvas.parentElement) {
            canvas.parentElement.removeChild(canvas);
        }
        
        Logger.info('Canvas cleanup completed');
        
    } catch (error) {
        Logger.error('Failed to cleanup canvas', error);
    }
}

/**
 * Checks if canvas is properly initialized and ready for use
 * @param {HTMLCanvasElement} canvas - Canvas element to check
 * @returns {boolean} True if canvas is ready
 */
export function isCanvasReady(canvas) {
    try {
        validateCanvas(canvas);
        
        const context = canvas.getContext('2d');
        const state = canvasStates.get(canvas);
        
        return !!(context && state && canvas.width > 0 && canvas.height > 0);
        
    } catch (error) {
        Logger.error('Failed to check canvas readiness', error);
        return false;
    }
}

// Export default configuration for external use
export { DEFAULT_CONFIG };

// Export type definitions for documentation
export const Types = {
    CanvasConfig: 'CanvasConfig',
    CanvasState: 'CanvasState',
    CanvasMetrics: 'CanvasMetrics'
};