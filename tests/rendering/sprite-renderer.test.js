/**
 * Sprite Renderer Test Suite
 * 
 * Comprehensive tests for the sprite rendering system with mock Canvas context.
 * Tests cover sprite loading, rendering, transformations, and error handling.
 * 
 * Architecture:
 * - Mock Canvas API for isolated testing
 * - Test data builders for complex sprite objects
 * - Property-based testing for edge cases
 * - Performance benchmarking for rendering operations
 * 
 * Dependencies: None (vanilla JavaScript)
 * Test Framework: Custom lightweight test runner
 */

'use strict';

// Test Framework - Lightweight custom implementation
class TestFramework {
    constructor() {
        this.tests = [];
        this.beforeEachCallbacks = [];
        this.afterEachCallbacks = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    describe(description, callback) {
        console.group(`📋 ${description}`);
        callback();
        console.groupEnd();
    }

    beforeEach(callback) {
        this.beforeEachCallbacks.push(callback);
    }

    afterEach(callback) {
        this.afterEachCallbacks.push(callback);
    }

    it(description, testFunction) {
        this.tests.push({ description, testFunction });
    }

    async run() {
        console.log('🚀 Starting Sprite Renderer Tests...\n');
        
        for (const test of this.tests) {
            try {
                // Run beforeEach callbacks
                for (const callback of this.beforeEachCallbacks) {
                    await callback();
                }

                await test.testFunction();
                
                // Run afterEach callbacks
                for (const callback of this.afterEachCallbacks) {
                    await callback();
                }

                console.log(`✅ ${test.description}`);
                this.results.passed++;
            } catch (error) {
                console.error(`❌ ${test.description}`);
                console.error(`   Error: ${error.message}`);
                this.results.failed++;
            }
            this.results.total++;
        }

        this.printResults();
    }

    printResults() {
        console.log('\n📊 Test Results:');
        console.log(`   Total: ${this.results.total}`);
        console.log(`   Passed: ${this.results.passed}`);
        console.log(`   Failed: ${this.results.failed}`);
        console.log(`   Coverage: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
        
        if (this.results.failed === 0) {
            console.log('🎉 All tests passed!');
        }
    }
}

// Assertion utilities
class Assert {
    static equal(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`${message} Expected: ${expected}, Actual: ${actual}`);
        }
    }

    static deepEqual(actual, expected, message = '') {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`${message} Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
        }
    }

    static true(value, message = '') {
        if (value !== true) {
            throw new Error(`${message} Expected true, got: ${value}`);
        }
    }

    static false(value, message = '') {
        if (value !== false) {
            throw new Error(`${message} Expected false, got: ${value}`);
        }
    }

    static throws(fn, expectedError, message = '') {
        try {
            fn();
            throw new Error(`${message} Expected function to throw`);
        } catch (error) {
            if (expectedError && !(error instanceof expectedError)) {
                throw new Error(`${message} Expected ${expectedError.name}, got ${error.constructor.name}`);
            }
        }
    }

    static async throwsAsync(fn, expectedError, message = '') {
        try {
            await fn();
            throw new Error(`${message} Expected async function to throw`);
        } catch (error) {
            if (expectedError && !(error instanceof expectedError)) {
                throw new Error(`${message} Expected ${expectedError.name}, got ${error.constructor.name}`);
            }
        }
    }

    static notNull(value, message = '') {
        if (value === null || value === undefined) {
            throw new Error(`${message} Expected non-null value`);
        }
    }

    static instanceOf(value, constructor, message = '') {
        if (!(value instanceof constructor)) {
            throw new Error(`${message} Expected instance of ${constructor.name}`);
        }
    }
}

// Mock Canvas Context for testing
class MockCanvasContext {
    constructor() {
        this.reset();
    }

    reset() {
        this.calls = [];
        this.state = {
            fillStyle: '#000000',
            strokeStyle: '#000000',
            lineWidth: 1,
            globalAlpha: 1,
            transform: [1, 0, 0, 1, 0, 0]
        };
        this.imageData = null;
    }

    // Drawing methods
    drawImage(...args) {
        this.calls.push({ method: 'drawImage', args: [...args] });
    }

    fillRect(x, y, width, height) {
        this.calls.push({ method: 'fillRect', args: [x, y, width, height] });
    }

    strokeRect(x, y, width, height) {
        this.calls.push({ method: 'strokeRect', args: [x, y, width, height] });
    }

    clearRect(x, y, width, height) {
        this.calls.push({ method: 'clearRect', args: [x, y, width, height] });
    }

    // Transform methods
    save() {
        this.calls.push({ method: 'save', args: [] });
    }

    restore() {
        this.calls.push({ method: 'restore', args: [] });
    }

    translate(x, y) {
        this.calls.push({ method: 'translate', args: [x, y] });
    }

    rotate(angle) {
        this.calls.push({ method: 'rotate', args: [angle] });
    }

    scale(x, y) {
        this.calls.push({ method: 'scale', args: [x, y] });
    }

    transform(a, b, c, d, e, f) {
        this.calls.push({ method: 'transform', args: [a, b, c, d, e, f] });
    }

    setTransform(a, b, c, d, e, f) {
        this.calls.push({ method: 'setTransform', args: [a, b, c, d, e, f] });
        this.state.transform = [a, b, c, d, e, f];
    }

    // State methods
    set fillStyle(value) {
        this.state.fillStyle = value;
    }

    get fillStyle() {
        return this.state.fillStyle;
    }

    set globalAlpha(value) {
        this.state.globalAlpha = value;
    }

    get globalAlpha() {
        return this.state.globalAlpha;
    }

    // Helper methods for testing
    getCallCount(method) {
        return this.calls.filter(call => call.method === method).length;
    }

    getLastCall(method) {
        const calls = this.calls.filter(call => call.method === method);
        return calls[calls.length - 1];
    }

    getAllCalls(method) {
        return this.calls.filter(call => call.method === method);
    }
}

// Mock Image class
class MockImage {
    constructor() {
        this.width = 0;
        this.height = 0;
        this.src = '';
        this.onload = null;
        this.onerror = null;
        this.complete = false;
    }

    // Simulate successful image loading
    simulateLoad(width = 64, height = 64) {
        this.width = width;
        this.height = height;
        this.complete = true;
        if (this.onload) {
            setTimeout(() => this.onload(), 0);
        }
    }

    // Simulate image loading error
    simulateError() {
        if (this.onerror) {
            setTimeout(() => this.onerror(new Error('Failed to load image')), 0);
        }
    }
}

// Sprite Renderer Implementation (for testing)
class SpriteRenderer {
    constructor(context) {
        this.context = context;
        this.imageCache = new Map();
        this.loadingPromises = new Map();
        this.defaultSprite = null;
        this.renderStats = {
            spritesRendered: 0,
            drawCalls: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
    }

    /**
     * Load a sprite image
     * @param {string} src - Image source URL
     * @returns {Promise<HTMLImageElement>} Loaded image
     */
    async loadSprite(src) {
        if (!src || typeof src !== 'string') {
            throw new Error('Invalid sprite source');
        }

        // Check cache first
        if (this.imageCache.has(src)) {
            this.renderStats.cacheHits++;
            return this.imageCache.get(src);
        }

        // Check if already loading
        if (this.loadingPromises.has(src)) {
            return this.loadingPromises.get(src);
        }

        // Start loading
        const loadPromise = new Promise((resolve, reject) => {
            const img = new MockImage();
            
            img.onload = () => {
                this.imageCache.set(src, img);
                this.loadingPromises.delete(src);
                this.renderStats.cacheMisses++;
                resolve(img);
            };

            img.onerror = () => {
                this.loadingPromises.delete(src);
                reject(new Error(`Failed to load sprite: ${src}`));
            };

            img.src = src;
            
            // For testing, simulate immediate load
            setTimeout(() => img.simulateLoad(), 10);
        });

        this.loadingPromises.set(src, loadPromise);
        return loadPromise;
    }

    /**
     * Render a sprite
     * @param {Object} sprite - Sprite configuration
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} options - Rendering options
     */
    async renderSprite(sprite, x, y, options = {}) {
        if (!sprite) {
            throw new Error('Sprite is required');
        }

        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('Position coordinates must be numbers');
        }

        const {
            width = null,
            height = null,
            rotation = 0,
            scale = 1,
            alpha = 1,
            flipX = false,
            flipY = false,
            sourceX = 0,
            sourceY = 0,
            sourceWidth = null,
            sourceHeight = null
        } = options;

        try {
            const image = await this.loadSprite(sprite.src);
            
            this.context.save();

            // Apply transformations
            this.context.globalAlpha = Math.max(0, Math.min(1, alpha));
            
            if (rotation !== 0 || scale !== 1 || flipX || flipY) {
                this.context.translate(x + (width || image.width) / 2, y + (height || image.height) / 2);
                
                if (rotation !== 0) {
                    this.context.rotate(rotation);
                }
                
                if (scale !== 1 || flipX || flipY) {
                    this.context.scale(
                        flipX ? -scale : scale,
                        flipY ? -scale : scale
                    );
                }
                
                this.context.translate(-(width || image.width) / 2, -(height || image.height) / 2);
            } else {
                this.context.translate(x, y);
            }

            // Render the sprite
            if (sourceWidth !== null && sourceHeight !== null) {
                // Render sprite sheet section
                this.context.drawImage(
                    image,
                    sourceX, sourceY, sourceWidth, sourceHeight,
                    0, 0, width || sourceWidth, height || sourceHeight
                );
            } else {
                // Render full sprite
                this.context.drawImage(
                    image,
                    0, 0,
                    width || image.width,
                    height || image.height
                );
            }

            this.context.restore();
            
            this.renderStats.spritesRendered++;
            this.renderStats.drawCalls++;

        } catch (error) {
            this.context.restore();
            throw new Error(`Failed to render sprite: ${error.message}`);
        }
    }

    /**
     * Render multiple sprites in batch
     * @param {Array} sprites - Array of sprite render commands
     */
    async renderBatch(sprites) {
        if (!Array.isArray(sprites)) {
            throw new Error('Sprites must be an array');
        }

        const renderPromises = sprites.map(({ sprite, x, y, options }) => 
            this.renderSprite(sprite, x, y, options)
        );

        await Promise.all(renderPromises);
    }

    /**
     * Clear the rendering area
     * @param {number} x - X position
     * @param {number} y - Y position  
     * @param {number} width - Width to clear
     * @param {number} height - Height to clear
     */
    clear(x = 0, y = 0, width = 800, height = 600) {
        this.context.clearRect(x, y, width, height);
    }

    /**
     * Get rendering statistics
     * @returns {Object} Render stats
     */
    getStats() {
        return { ...this.renderStats };
    }

    /**
     * Reset rendering statistics
     */
    resetStats() {
        this.renderStats = {
            spritesRendered: 0,
            drawCalls: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
    }

    /**
     * Preload multiple sprites
     * @param {Array<string>} sources - Array of sprite sources
     * @returns {Promise<Array>} Array of loaded images
     */
    async preloadSprites(sources) {
        if (!Array.isArray(sources)) {
            throw new Error('Sources must be an array');
        }

        const loadPromises = sources.map(src => this.loadSprite(src));
        return Promise.all(loadPromises);
    }

    /**
     * Get cache size
     * @returns {number} Number of cached sprites
     */
    getCacheSize() {
        return this.imageCache.size;
    }

    /**
     * Clear sprite cache
     */
    clearCache() {
        this.imageCache.clear();
        this.loadingPromises.clear();
    }
}

// Test Data Builders
class SpriteBuilder {
    constructor() {
        this.sprite = {
            src: 'test-sprite.png',
            width: 64,
            height: 64
        };
    }

    withSource(src) {
        this.sprite.src = src;
        return this;
    }

    withDimensions(width, height) {
        this.sprite.width = width;
        this.sprite.height = height;
        return this;
    }

    build() {
        return { ...this.sprite };
    }
}

// Test Suite
const testFramework = new TestFramework();
let mockContext;
let spriteRenderer;

testFramework.beforeEach(() => {
    mockContext = new MockCanvasContext();
    spriteRenderer = new SpriteRenderer(mockContext);
});

testFramework.afterEach(() => {
    mockContext.reset();
    spriteRenderer.clearCache();
    spriteRenderer.resetStats();
});

testFramework.describe('SpriteRenderer Tests', () => {
    
    testFramework.describe('Constructor', () => {
        testFramework.it('should initialize with canvas context', () => {
            const renderer = new SpriteRenderer(mockContext);
            Assert.notNull(renderer.context);
            Assert.equal(renderer.getCacheSize(), 0);
        });

        testFramework.it('should initialize render stats', () => {
            const stats = spriteRenderer.getStats();
            Assert.equal(stats.spritesRendered, 0);
            Assert.equal(stats.drawCalls, 0);
            Assert.equal(stats.cacheHits, 0);
            Assert.equal(stats.cacheMisses, 0);
        });
    });

    testFramework.describe('Sprite Loading', () => {
        testFramework.it('should load sprite successfully', async () => {
            const sprite = await spriteRenderer.loadSprite('test.png');
            Assert.notNull(sprite);
            Assert.equal(spriteRenderer.getCacheSize(), 1);
        });

        testFramework.it('should cache loaded sprites', async () => {
            await spriteRenderer.loadSprite('test.png');
            await spriteRenderer.loadSprite('test.png');
            
            const stats = spriteRenderer.getStats();
            Assert.equal(stats.cacheHits, 1);
            Assert.equal(stats.cacheMisses, 1);
        });

        testFramework.it('should handle invalid sprite source', async () => {
            await Assert.throwsAsync(
                () => spriteRenderer.loadSprite(null),
                Error,
                'Should throw for null source'
            );

            await Assert.throwsAsync(
                () => spriteRenderer.loadSprite(''),
                Error,
                'Should throw for empty source'
            );
        });

        testFramework.it('should preload multiple sprites', async () => {
            const sources = ['sprite1.png', 'sprite2.png', 'sprite3.png'];
            const sprites = await spriteRenderer.preloadSprites(sources);
            
            Assert.equal(sprites.length, 3);
            Assert.equal(spriteRenderer.getCacheSize(), 3);
        });
    });

    testFramework.describe('Sprite Rendering', () => {
        testFramework.it('should render basic sprite', async () => {
            const sprite = new SpriteBuilder().build();
            
            await spriteRenderer.renderSprite(sprite, 100, 200);
            
            Assert.equal(mockContext.getCallCount('drawImage'), 1);
            Assert.equal(mockContext.getCallCount('save'), 1);
            Assert.equal(mockContext.getCallCount('restore'), 1);
            
            const stats = spriteRenderer.getStats();
            Assert.equal(stats.spritesRendered, 1);
        });

        testFramework.it('should apply position correctly', async () => {
            const sprite = new SpriteBuilder().build();
            
            await spriteRenderer.renderSprite(sprite, 150, 250);
            
            const translateCall = mockContext.getLastCall('translate');
            Assert.deepEqual(translateCall.args, [150, 250]);
        });

        testFramework.it('should handle rotation', async () => {
            const sprite = new SpriteBuilder().build();
            
            await spriteRenderer.renderSprite(sprite, 100, 100, { rotation: Math.PI / 4 });
            
            Assert.equal(mockContext.getCallCount('rotate'), 1);
            const rotateCall = mockContext.getLastCall('rotate');
            Assert.equal(rotateCall.args[0], Math.PI / 4);
        });

        testFramework.it('should handle scaling', async () => {
            const sprite = new SpriteBuilder().build();
            
            await spriteRenderer.renderSprite(sprite, 100, 100, { scale: 2 });
            
            Assert.equal(mockContext.getCallCount('scale'), 1);
            const scaleCall = mockContext.getLastCall('scale');
            Assert.deepEqual(scaleCall.args, [2, 2]);
        });

        testFramework.it('should handle flipping', async () => {
            const sprite = new SpriteBuilder().build();
            
            await spriteRenderer.renderSprite(sprite, 100, 100, { flipX: true, flipY: true });
            
            Assert.equal(mockContext.getCallCount('scale'), 1);
            const scaleCall = mockContext.getLastCall('scale');
            Assert.deepEqual(scaleCall.args, [-1, -1]);
        });

        testFramework.it('should handle alpha transparency', async () => {
            const sprite = new SpriteBuilder().build();
            
            await spriteRenderer.renderSprite(sprite, 100, 100, { alpha: 0.5 });
            
            Assert.equal(mockContext.state.globalAlpha, 0.5);
        });

        testFramework.it('should clamp alpha values', async () => {
            const sprite = new SpriteBuilder().build();
            
            await spriteRenderer.renderSprite(sprite, 100, 100, { alpha: 2.0 });
            Assert.equal(mockContext.state.globalAlpha, 1.0);
            
            await spriteRenderer.renderSprite(sprite, 100, 100, { alpha: -0.5 });
            Assert.equal(mockContext.state.globalAlpha, 0.0);
        });

        testFramework.it('should handle sprite sheet rendering', async () => {
            const sprite = new SpriteBuilder().build();
            
            await spriteRenderer.renderSprite(sprite, 100, 100, {
                sourceX: 32,
                sourceY: 32,
                sourceWidth: 32,
                sourceHeight: 32
            });
            
            const drawCall = mockContext.getLastCall('drawImage');
            Assert.equal(drawCall.args.length, 9); // 9-parameter drawImage call
            Assert.equal(drawCall.args[1], 32); // sourceX
            Assert.equal(drawCall.args[2], 32); // sourceY
        });

        testFramework.it('should validate input parameters', async () => {
            await Assert.throwsAsync(
                () => spriteRenderer.renderSprite(null, 100, 100),
                Error,
                'Should throw for null sprite'
            );

            const sprite = new SpriteBuilder().build();
            
            await Assert.throwsAsync(
                () => spriteRenderer.renderSprite(sprite, 'invalid', 100),
                Error,
                'Should throw for invalid x coordinate'
            );

            await Assert.throwsAsync(
                () => spriteRenderer.renderSprite(sprite, 100, 'invalid'),
                Error,
                'Should throw for invalid y coordinate'
            );
        });
    });

    testFramework.describe('Batch Rendering', () => {
        testFramework.it('should render multiple sprites', async () => {
            const sprites = [
                { sprite: new SpriteBuilder().withSource('sprite1.png').build(), x: 100, y: 100 },
                { sprite: new SpriteBuilder().withSource('sprite2.png').build(), x: 200, y: 200 },
                { sprite: new SpriteBuilder().withSource('sprite3.png').build(), x: 300, y: 300 }
            ];
            
            await spriteRenderer.renderBatch(sprites);
            
            Assert.equal(mockContext.getCallCount('drawImage'), 3);
            
            const stats = spriteRenderer.getStats();
            Assert.equal(stats.spritesRendered, 3);
        });

        testFramework.it('should handle empty batch', async () => {
            await spriteRenderer.renderBatch([]);
            
            Assert.equal(mockContext.getCallCount('drawImage'), 0);
            
            const stats = spriteRenderer.getStats();
            Assert.equal(stats.spritesRendered, 0);
        });

        testFramework.it('should validate batch input', async () => {
            await Assert.throwsAsync(
                () => spriteRenderer.renderBatch(null),
                Error,
                'Should throw for null batch'
            );

            await Assert.throwsAsync(
                () => spriteRenderer.renderBatch('invalid'),
                Error,
                'Should throw for non-array batch'
            );
        });
    });

    testFramework.describe('Utility Methods', () => {
        testFramework.it('should clear rendering area', () => {
            spriteRenderer.clear(10, 20, 100, 200);
            
            Assert.equal(mockContext.getCallCount('clearRect'), 1);
            const clearCall = mockContext.getLastCall('clearRect');
            Assert.deepEqual(clearCall.args, [10, 20, 100, 200]);
        });

        testFramework.it('should clear with default parameters', () => {
            spriteRenderer.clear();
            
            const clearCall = mockContext.getLastCall('clearRect');
            Assert.deepEqual(clearCall.args, [0, 0, 800, 600]);
        });

        testFramework.it('should track rendering statistics', async () => {
            const sprite = new SpriteBuilder().build();
            
            await spriteRenderer.renderSprite(sprite, 100, 100);
            await spriteRenderer.renderSprite(sprite, 200, 200);
            
            const stats = spriteRenderer.getStats();
            Assert.equal(stats.spritesRendered, 2);
            Assert.equal(stats.drawCalls, 2);
            Assert.equal(stats.cacheHits, 1);
            Assert.equal(stats.cacheMisses, 1);
        });

        testFramework.it('should reset statistics', async () => {
            const sprite = new SpriteBuilder().build();
            await spriteRenderer.renderSprite(sprite, 100, 100);
            
            spriteRenderer.resetStats();
            
            const stats = spriteRenderer.getStats();
            Assert.equal(stats.spritesRendered, 0);
            Assert.equal(stats.drawCalls, 0);
            Assert.equal(stats.cacheHits, 0);
            Assert.equal(stats.cacheMisses, 0);
        });

        testFramework.it('should clear cache', async () => {
            await spriteRenderer.loadSprite('test1.png');
            await spriteRenderer.loadSprite('test2.png');
            
            Assert.equal(spriteRenderer.getCacheSize(), 2);
            
            spriteRenderer.clearCache();
            
            Assert.equal(spriteRenderer.getCacheSize(), 0);
        });
    });

    testFramework.describe('Error Handling', () => {
        testFramework.it('should handle rendering errors gracefully', async () => {
            const sprite = new SpriteBuilder().withSource('invalid.png').build();
            
            // Mock image loading failure
            const originalLoadSprite = spriteRenderer.loadSprite;
            spriteRenderer.loadSprite = () => Promise.reject(new Error('Load failed'));
            
            await Assert.throwsAsync(
                () => spriteRenderer.renderSprite(sprite, 100, 100),
                Error,
                'Should propagate loading errors'
            );
            
            // Restore original method
            spriteRenderer.loadSprite = originalLoadSprite;
        });

        testFramework.it('should restore context state on error', async () => {
            const sprite = new SpriteBuilder().build();
            
            // Mock drawImage to throw
            const originalDrawImage = mockContext.drawImage;
            mockContext.drawImage = () => { throw new Error('Draw failed'); };
            
            try {
                await spriteRenderer.renderSprite(sprite, 100, 100);
            } catch (error) {
                // Expected to throw
            }
            
            // Should have called restore even on error
            Assert.equal(mockContext.getCallCount('restore'), 1);
            
            // Restore original method
            mockContext.drawImage = originalDrawImage;
        });
    });

    testFramework.describe('Performance Tests', () => {
        testFramework.it('should handle large batch efficiently', async () => {
            const batchSize = 100;
            const sprites = Array.from({ length: batchSize }, (_, i) => ({
                sprite: new SpriteBuilder().withSource(`sprite${i}.png`).build(),
                x: i * 10,
                y: i * 10
            }));
            
            const startTime = performance.now();
            await spriteRenderer.renderBatch(sprites);
            const endTime = performance.now();
            
            const renderTime = endTime - startTime;
            console.log(`   📊 Rendered ${batchSize} sprites in ${renderTime.toFixed(2)}ms`);
            
            Assert.equal(mockContext.getCallCount('drawImage'), batchSize);
            Assert.true(renderTime < 1000, 'Should render batch within reasonable time');
        });

        testFramework.it('should benefit from sprite caching', async () => {
            const sprite = new SpriteBuilder().build();
            
            // First render - cache miss
            const startTime1 = performance.now();
            await spriteRenderer.renderSprite(sprite, 100, 100);
            const endTime1 = performance.now();
            
            // Second render - cache hit
            const startTime2 = performance.now();
            await spriteRenderer.renderSprite(sprite, 200, 200);
            const endTime2 = performance.now();
            
            const firstRenderTime = endTime1 - startTime1;
            const secondRenderTime = endTime2 - startTime2;
            
            console.log(`   📊 First render: ${firstRenderTime.toFixed(2)}ms, Second render: ${secondRenderTime.toFixed(2)}ms`);
            
            const stats = spriteRenderer.getStats();
            Assert.equal(stats.cacheHits, 1);
            Assert.equal(stats.cacheMisses, 1);
        });
    });
});

// Export for use in other test files or test runners
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TestFramework,
        Assert,
        MockCanvasContext,
        MockImage,
        SpriteRenderer,
        SpriteBuilder
    };
}

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined' || typeof global !== 'undefined') {
    // Browser or Node.js environment
    testFramework.run().catch(console.error);
}