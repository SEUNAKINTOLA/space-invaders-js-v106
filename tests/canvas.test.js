/**
 * Canvas Unit Tests
 * 
 * Comprehensive test suite for HTML5 Canvas initialization, responsive behavior,
 * and core rendering functionality for the Space Invaders game.
 * 
 * Key Test Areas:
 * - Canvas element creation and initialization
 * - Responsive design behavior and viewport adaptation
 * - Context acquisition and configuration
 * - Error handling for unsupported browsers
 * - Performance monitoring and resource management
 * 
 * Architecture:
 * - Uses Jest testing framework patterns
 * - Mocks DOM APIs for isolated testing
 * - Implements test data builders for complex scenarios
 * - Follows Arrange-Act-Assert pattern
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

describe('Canvas System Tests', () => {
    let mockCanvas;
    let mockContext;
    let mockDocument;
    let mockWindow;
    let originalDocument;
    let originalWindow;

    /**
     * Test data builder for creating mock canvas elements
     * with configurable properties and methods
     */
    class MockCanvasBuilder {
        constructor() {
            this.width = 800;
            this.height = 600;
            this.contextType = '2d';
            this.devicePixelRatio = 1;
        }

        withDimensions(width, height) {
            this.width = width;
            this.height = height;
            return this;
        }

        withDevicePixelRatio(ratio) {
            this.devicePixelRatio = ratio;
            return this;
        }

        withContextType(type) {
            this.contextType = type;
            return this;
        }

        build() {
            const canvas = {
                width: this.width,
                height: this.height,
                style: {
                    width: `${this.width}px`,
                    height: `${this.height}px`
                },
                getContext: jest.fn(),
                getBoundingClientRect: jest.fn(() => ({
                    left: 0,
                    top: 0,
                    width: this.width,
                    height: this.height
                })),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                setAttribute: jest.fn(),
                getAttribute: jest.fn()
            };

            const context = {
                canvas: canvas,
                clearRect: jest.fn(),
                fillRect: jest.fn(),
                strokeRect: jest.fn(),
                drawImage: jest.fn(),
                fillText: jest.fn(),
                measureText: jest.fn(() => ({ width: 100 })),
                save: jest.fn(),
                restore: jest.fn(),
                translate: jest.fn(),
                rotate: jest.fn(),
                scale: jest.fn(),
                beginPath: jest.fn(),
                closePath: jest.fn(),
                moveTo: jest.fn(),
                lineTo: jest.fn(),
                arc: jest.fn(),
                fill: jest.fn(),
                stroke: jest.fn(),
                createImageData: jest.fn(),
                getImageData: jest.fn(),
                putImageData: jest.fn(),
                globalAlpha: 1,
                globalCompositeOperation: 'source-over',
                fillStyle: '#000000',
                strokeStyle: '#000000',
                lineWidth: 1,
                font: '10px sans-serif',
                textAlign: 'start',
                textBaseline: 'alphabetic'
            };

            canvas.getContext.mockReturnValue(context);
            return { canvas, context };
        }
    }

    /**
     * Canvas utility class for testing
     * Implements core canvas operations with error handling and validation
     */
    class CanvasManager {
        constructor() {
            this.canvas = null;
            this.context = null;
            this.isInitialized = false;
            this.devicePixelRatio = window?.devicePixelRatio || 1;
            this.resizeObserver = null;
            this.performanceMetrics = {
                frameCount: 0,
                lastFrameTime: 0,
                averageFPS: 0
            };
        }

        /**
         * Initialize canvas with responsive design support
         * @param {HTMLCanvasElement|string} canvasElement - Canvas element or selector
         * @param {Object} options - Configuration options
         * @returns {boolean} Success status
         */
        initialize(canvasElement, options = {}) {
            try {
                // Input validation
                if (!canvasElement) {
                    throw new Error('Canvas element is required');
                }

                // Get canvas element
                if (typeof canvasElement === 'string') {
                    this.canvas = document.querySelector(canvasElement);
                    if (!this.canvas) {
                        throw new Error(`Canvas element not found: ${canvasElement}`);
                    }
                } else {
                    this.canvas = canvasElement;
                }

                // Validate canvas element
                if (!this.canvas.getContext) {
                    throw new Error('Invalid canvas element provided');
                }

                // Get rendering context
                const contextType = options.contextType || '2d';
                this.context = this.canvas.getContext(contextType, options.contextAttributes);
                
                if (!this.context) {
                    throw new Error(`Failed to get ${contextType} context`);
                }

                // Configure responsive behavior
                this.setupResponsiveCanvas(options);

                // Setup performance monitoring
                this.setupPerformanceMonitoring();

                this.isInitialized = true;
                return true;

            } catch (error) {
                console.error('Canvas initialization failed:', error.message);
                return false;
            }
        }

        /**
         * Configure canvas for responsive design
         * @param {Object} options - Configuration options
         */
        setupResponsiveCanvas(options = {}) {
            if (!this.canvas) return;

            const {
                maintainAspectRatio = true,
                maxWidth = window.innerWidth,
                maxHeight = window.innerHeight,
                pixelRatio = this.devicePixelRatio
            } = options;

            // Set initial dimensions
            this.updateCanvasDimensions(maxWidth, maxHeight, maintainAspectRatio, pixelRatio);

            // Setup resize observer for responsive behavior
            if (window.ResizeObserver) {
                this.resizeObserver = new ResizeObserver((entries) => {
                    for (const entry of entries) {
                        const { width, height } = entry.contentRect;
                        this.updateCanvasDimensions(width, height, maintainAspectRatio, pixelRatio);
                    }
                });

                // Observe the canvas parent or canvas itself
                const observeTarget = this.canvas.parentElement || this.canvas;
                this.resizeObserver.observe(observeTarget);
            }

            // Fallback resize listener
            window.addEventListener('resize', () => {
                this.updateCanvasDimensions(
                    window.innerWidth,
                    window.innerHeight,
                    maintainAspectRatio,
                    pixelRatio
                );
            });
        }

        /**
         * Update canvas dimensions with pixel ratio support
         * @param {number} width - Target width
         * @param {number} height - Target height
         * @param {boolean} maintainAspectRatio - Whether to maintain aspect ratio
         * @param {number} pixelRatio - Device pixel ratio
         */
        updateCanvasDimensions(width, height, maintainAspectRatio = true, pixelRatio = 1) {
            if (!this.canvas) return;

            let canvasWidth = width;
            let canvasHeight = height;

            // Maintain aspect ratio if requested
            if (maintainAspectRatio) {
                const aspectRatio = 4 / 3; // Standard game aspect ratio
                const currentRatio = width / height;

                if (currentRatio > aspectRatio) {
                    canvasWidth = height * aspectRatio;
                } else {
                    canvasHeight = width / aspectRatio;
                }
            }

            // Set CSS dimensions
            this.canvas.style.width = `${canvasWidth}px`;
            this.canvas.style.height = `${canvasHeight}px`;

            // Set actual canvas dimensions with pixel ratio
            this.canvas.width = canvasWidth * pixelRatio;
            this.canvas.height = canvasHeight * pixelRatio;

            // Scale context for high DPI displays
            if (this.context && pixelRatio !== 1) {
                this.context.scale(pixelRatio, pixelRatio);
            }
        }

        /**
         * Setup performance monitoring
         */
        setupPerformanceMonitoring() {
            this.performanceMetrics.lastFrameTime = performance.now();
        }

        /**
         * Update performance metrics
         */
        updatePerformanceMetrics() {
            const currentTime = performance.now();
            const deltaTime = currentTime - this.performanceMetrics.lastFrameTime;
            
            this.performanceMetrics.frameCount++;
            this.performanceMetrics.lastFrameTime = currentTime;
            
            // Calculate average FPS over last 60 frames
            if (this.performanceMetrics.frameCount % 60 === 0) {
                this.performanceMetrics.averageFPS = 1000 / deltaTime;
            }
        }

        /**
         * Get canvas dimensions
         * @returns {Object} Canvas dimensions
         */
        getDimensions() {
            if (!this.canvas) return { width: 0, height: 0 };
            
            return {
                width: this.canvas.width,
                height: this.canvas.height,
                cssWidth: parseInt(this.canvas.style.width),
                cssHeight: parseInt(this.canvas.style.height)
            };
        }

        /**
         * Clear the canvas
         */
        clear() {
            if (!this.context) return;
            
            const { width, height } = this.getDimensions();
            this.context.clearRect(0, 0, width, height);
        }

        /**
         * Cleanup resources
         */
        destroy() {
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
                this.resizeObserver = null;
            }

            this.canvas = null;
            this.context = null;
            this.isInitialized = false;
        }
    }

    beforeEach(() => {
        // Store original globals
        originalDocument = global.document;
        originalWindow = global.window;

        // Setup mock DOM environment
        mockDocument = {
            querySelector: jest.fn(),
            createElement: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };

        mockWindow = {
            innerWidth: 1024,
            innerHeight: 768,
            devicePixelRatio: 1,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            ResizeObserver: jest.fn().mockImplementation(() => ({
                observe: jest.fn(),
                disconnect: jest.fn()
            })),
            performance: {
                now: jest.fn(() => Date.now())
            }
        };

        // Set global mocks
        global.document = mockDocument;
        global.window = mockWindow;
        global.performance = mockWindow.performance;

        // Create mock canvas and context
        const mockData = new MockCanvasBuilder().build();
        mockCanvas = mockData.canvas;
        mockContext = mockData.context;
    });

    afterEach(() => {
        // Restore original globals
        global.document = originalDocument;
        global.window = originalWindow;
        
        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('Canvas Initialization', () => {
        test('should successfully initialize canvas with valid element', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            mockDocument.querySelector.mockReturnValue(mockCanvas);

            // Act
            const result = canvasManager.initialize('#game-canvas');

            // Assert
            expect(result).toBe(true);
            expect(canvasManager.isInitialized).toBe(true);
            expect(canvasManager.canvas).toBe(mockCanvas);
            expect(canvasManager.context).toBe(mockContext);
            expect(mockCanvas.getContext).toHaveBeenCalledWith('2d', undefined);
        });

        test('should initialize canvas with direct element reference', () => {
            // Arrange
            const canvasManager = new CanvasManager();

            // Act
            const result = canvasManager.initialize(mockCanvas);

            // Assert
            expect(result).toBe(true);
            expect(canvasManager.canvas).toBe(mockCanvas);
            expect(mockDocument.querySelector).not.toHaveBeenCalled();
        });

        test('should fail initialization with null canvas element', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            // Act
            const result = canvasManager.initialize(null);

            // Assert
            expect(result).toBe(false);
            expect(canvasManager.isInitialized).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Canvas initialization failed:',
                'Canvas element is required'
            );

            consoleSpy.mockRestore();
        });

        test('should fail initialization when canvas element not found', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockDocument.querySelector.mockReturnValue(null);

            // Act
            const result = canvasManager.initialize('#nonexistent-canvas');

            // Assert
            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Canvas initialization failed:',
                'Canvas element not found: #nonexistent-canvas'
            );

            consoleSpy.mockRestore();
        });

        test('should fail initialization when context cannot be acquired', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockCanvas.getContext.mockReturnValue(null);

            // Act
            const result = canvasManager.initialize(mockCanvas);

            // Assert
            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Canvas initialization failed:',
                'Failed to get 2d context'
            );

            consoleSpy.mockRestore();
        });

        test('should initialize with custom context type and attributes', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            const options = {
                contextType: 'webgl',
                contextAttributes: { antialias: true, alpha: false }
            };

            // Act
            const result = canvasManager.initialize(mockCanvas, options);

            // Assert
            expect(result).toBe(true);
            expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl', options.contextAttributes);
        });
    });

    describe('Responsive Canvas Behavior', () => {
        test('should setup responsive canvas with default options', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            canvasManager.initialize(mockCanvas);

            // Act & Assert
            expect(mockWindow.ResizeObserver).toHaveBeenCalled();
            expect(mockWindow.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
        });

        test('should update canvas dimensions correctly', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            canvasManager.initialize(mockCanvas);

            // Act
            canvasManager.updateCanvasDimensions(800, 600, false, 2);

            // Assert
            expect(mockCanvas.style.width).toBe('800px');
            expect(mockCanvas.style.height).toBe('600px');
            expect(mockCanvas.width).toBe(1600); // 800 * 2 (pixel ratio)
            expect(mockCanvas.height).toBe(1200); // 600 * 2 (pixel ratio)
            expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
        });

        test('should maintain aspect ratio when requested', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            canvasManager.initialize(mockCanvas);

            // Act - Wide viewport should be constrained by height
            canvasManager.updateCanvasDimensions(1200, 600, true, 1);

            // Assert - Should maintain 4:3 aspect ratio
            expect(mockCanvas.style.width).toBe('800px'); // 600 * (4/3)
            expect(mockCanvas.style.height).toBe('600px');
        });

        test('should handle high DPI displays correctly', () => {
            // Arrange
            mockWindow.devicePixelRatio = 2;
            const canvasManager = new CanvasManager();
            canvasManager.initialize(mockCanvas);

            // Act
            canvasManager.updateCanvasDimensions(400, 300, false, 2);

            // Assert
            expect(mockCanvas.width).toBe(800); // 400 * 2
            expect(mockCanvas.height).toBe(600); // 300 * 2
            expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
        });

        test('should handle resize observer when available', () => {
            // Arrange
            const mockObserver = {
                observe: jest.fn(),
                disconnect: jest.fn()
            };
            mockWindow.ResizeObserver.mockImplementation(() => mockObserver);
            
            const canvasManager = new CanvasManager();
            canvasManager.initialize(mockCanvas);

            // Assert
            expect(mockObserver.observe).toHaveBeenCalled();
        });

        test('should fallback gracefully when ResizeObserver is not available', () => {
            // Arrange
            mockWindow.ResizeObserver = undefined;
            const canvasManager = new CanvasManager();

            // Act
            const result = canvasManager.initialize(mockCanvas);

            // Assert
            expect(result).toBe(true);
            expect(mockWindow.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
        });
    });

    describe('Canvas Operations', () => {
        test('should return correct canvas dimensions', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            canvasManager.initialize(mockCanvas);
            mockCanvas.width = 800;
            mockCanvas.height = 600;
            mockCanvas.style.width = '400px';
            mockCanvas.style.height = '300px';

            // Act
            const dimensions = canvasManager.getDimensions();

            // Assert
            expect(dimensions).toEqual({
                width: 800,
                height: 600,
                cssWidth: 400,
                cssHeight: 300
            });
        });

        test('should clear canvas correctly', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            canvasManager.initialize(mockCanvas);
            mockCanvas.width = 800;
            mockCanvas.height = 600;

            // Act
            canvasManager.clear();

            // Assert
            expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
        });

        test('should handle clear operation when context is not available', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            canvasManager.context = null;

            // Act & Assert - Should not throw error
            expect(() => canvasManager.clear()).not.toThrow();
            expect(mockContext.clearRect).not.toHaveBeenCalled();
        });
    });

    describe('Performance Monitoring', () => {
        test('should initialize performance metrics', () => {
            // Arrange
            const mockTime = 1000;
            mockWindow.performance.now.mockReturnValue(mockTime);
            const canvasManager = new CanvasManager();

            // Act
            canvasManager.initialize(mockCanvas);

            // Assert
            expect(canvasManager.performanceMetrics.lastFrameTime).toBe(mockTime);
            expect(canvasManager.performanceMetrics.frameCount).toBe(0);
        });

        test('should update performance metrics correctly', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            canvasManager.initialize(mockCanvas);
            mockWindow.performance.now
                .mockReturnValueOnce(1000) // Initial time
                .mockReturnValueOnce(1016); // 16ms later (60 FPS)

            // Act
            canvasManager.updatePerformanceMetrics();

            // Assert
            expect(canvasManager.performanceMetrics.frameCount).toBe(1);
            expect(canvasManager.performanceMetrics.lastFrameTime).toBe(1016);
        });

        test('should calculate average FPS every 60 frames', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            canvasManager.initialize(mockCanvas);
            canvasManager.performanceMetrics.frameCount = 59;
            mockWindow.performance.now
                .mockReturnValueOnce(1000)
                .mockReturnValueOnce(1016);

            // Act
            canvasManager.updatePerformanceMetrics();

            // Assert
            expect(canvasManager.performanceMetrics.frameCount).toBe(60);
            expect(canvasManager.performanceMetrics.averageFPS).toBeCloseTo(62.5, 1); // 1000/16
        });
    });

    describe('Resource Management', () => {
        test('should cleanup resources properly', () => {
            // Arrange
            const mockObserver = {
                observe: jest.fn(),
                disconnect: jest.fn()
            };
            mockWindow.ResizeObserver.mockImplementation(() => mockObserver);
            
            const canvasManager = new CanvasManager();
            canvasManager.initialize(mockCanvas);

            // Act
            canvasManager.destroy();

            // Assert
            expect(mockObserver.disconnect).toHaveBeenCalled();
            expect(canvasManager.canvas).toBeNull();
            expect(canvasManager.context).toBeNull();
            expect(canvasManager.isInitialized).toBe(false);
        });

        test('should handle cleanup when ResizeObserver is not available', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            canvasManager.initialize(mockCanvas);
            canvasManager.resizeObserver = null;

            // Act & Assert - Should not throw error
            expect(() => canvasManager.destroy()).not.toThrow();
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle invalid canvas element gracefully', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const invalidElement = { notACanvas: true };

            // Act
            const result = canvasManager.initialize(invalidElement);

            // Assert
            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Canvas initialization failed:',
                'Invalid canvas element provided'
            );

            consoleSpy.mockRestore();
        });

        test('should handle getDimensions when canvas is not initialized', () => {
            // Arrange
            const canvasManager = new CanvasManager();

            // Act
            const dimensions = canvasManager.getDimensions();

            // Assert
            expect(dimensions).toEqual({ width: 0, height: 0 });
        });

        test('should handle updateCanvasDimensions when canvas is not available', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            canvasManager.canvas = null;

            // Act & Assert - Should not throw error
            expect(() => canvasManager.updateCanvasDimensions(800, 600)).not.toThrow();
        });

        test('should handle missing window object gracefully', () => {
            // Arrange
            const originalWindow = global.window;
            global.window = undefined;
            
            // Act & Assert - Should not throw error during construction
            expect(() => new CanvasManager()).not.toThrow();
            
            // Restore
            global.window = originalWindow;
        });
    });

    describe('Browser Compatibility', () => {
        test('should detect and handle missing canvas support', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const elementWithoutCanvas = {};

            // Act
            const result = canvasManager.initialize(elementWithoutCanvas);

            // Assert
            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        test('should handle different context types', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            const webglContext = { ...mockContext, isWebGL: true };
            mockCanvas.getContext.mockImplementation((type) => {
                return type === 'webgl' ? webglContext : null;
            });

            // Act
            const result = canvasManager.initialize(mockCanvas, { contextType: 'webgl' });

            // Assert
            expect(result).toBe(true);
            expect(canvasManager.context).toBe(webglContext);
        });

        test('should handle context creation failure for specific types', () => {
            // Arrange
            const canvasManager = new CanvasManager();
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            mockCanvas.getContext.mockReturnValue(null);

            // Act
            const result = canvasManager.initialize(mockCanvas, { contextType: 'webgl2' });

            // Assert
            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Canvas initialization failed:',
                'Failed to get webgl2 context'
            );

            consoleSpy.mockRestore();
        });
    });
});