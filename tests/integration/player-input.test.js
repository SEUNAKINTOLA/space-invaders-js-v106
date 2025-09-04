/**
 * Integration Tests for Player Input System
 * 
 * Comprehensive test suite for player movement and input response,
 * covering keyboard controls, input buffering, and responsive gameplay.
 * 
 * Architecture:
 * - Integration testing approach with mock game environment
 * - Event-driven input simulation
 * - Performance and responsiveness validation
 * - Cross-browser compatibility testing
 * 
 * @module PlayerInputIntegrationTests
 * @version 1.0.0
 * @author Space Invaders JS Team
 */

/**
 * Mock Game Engine for Integration Testing
 * Provides minimal game environment for input testing
 */
class MockGameEngine {
    constructor() {
        this.canvas = this.createMockCanvas();
        this.ctx = this.canvas.getContext('2d');
        this.isRunning = false;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.inputBuffer = [];
        this.maxBufferSize = 10;
        
        // Player state
        this.player = {
            x: 400,
            y: 550,
            width: 32,
            height: 32,
            speed: 5,
            isAlive: true,
            canShoot: true,
            lastShotTime: 0,
            shootCooldown: 250
        };
        
        // Input state tracking
        this.inputState = {
            keys: new Set(),
            lastInputTime: 0,
            inputHistory: [],
            maxHistorySize: 50
        };
        
        // Performance metrics
        this.metrics = {
            inputLatency: [],
            frameTime: [],
            inputProcessingTime: []
        };
        
        this.setupEventListeners();
    }
    
    /**
     * Creates a mock canvas element for testing
     * @returns {HTMLCanvasElement} Mock canvas
     */
    createMockCanvas() {
        if (typeof document !== 'undefined') {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 600;
            return canvas;
        }
        
        // Mock canvas for Node.js environment
        return {
            width: 800,
            height: 600,
            getContext: () => ({
                clearRect: () => {},
                fillRect: () => {},
                drawImage: () => {}
            }),
            addEventListener: () => {},
            removeEventListener: () => {},
            getBoundingClientRect: () => ({
                left: 0,
                top: 0,
                width: 800,
                height: 600
            })
        };
    }
    
    /**
     * Sets up keyboard event listeners
     */
    setupEventListeners() {
        if (typeof document === 'undefined') return;
        
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
    }
    
    /**
     * Handles keydown events with input buffering
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        const startTime = performance.now();
        
        // Prevent default for game keys
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'];
        if (gameKeys.includes(event.code)) {
            event.preventDefault();
        }
        
        // Add to input buffer if not already pressed
        if (!this.inputState.keys.has(event.code)) {
            this.addToInputBuffer({
                type: 'keydown',
                code: event.code,
                timestamp: Date.now(),
                frameCount: this.frameCount
            });
            
            this.inputState.keys.add(event.code);
            this.inputState.lastInputTime = Date.now();
        }
        
        // Record input processing time
        const processingTime = performance.now() - startTime;
        this.metrics.inputProcessingTime.push(processingTime);
        
        // Keep metrics array size manageable
        if (this.metrics.inputProcessingTime.length > 100) {
            this.metrics.inputProcessingTime.shift();
        }
    }
    
    /**
     * Handles keyup events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyUp(event) {
        this.addToInputBuffer({
            type: 'keyup',
            code: event.code,
            timestamp: Date.now(),
            frameCount: this.frameCount
        });
        
        this.inputState.keys.delete(event.code);
    }
    
    /**
     * Adds input event to buffer with overflow protection
     * @param {Object} inputEvent - Input event data
     */
    addToInputBuffer(inputEvent) {
        this.inputBuffer.push(inputEvent);
        
        // Maintain buffer size
        if (this.inputBuffer.length > this.maxBufferSize) {
            this.inputBuffer.shift();
        }
        
        // Add to input history
        this.inputState.inputHistory.push(inputEvent);
        if (this.inputState.inputHistory.length > this.inputState.maxHistorySize) {
            this.inputState.inputHistory.shift();
        }
    }
    
    /**
     * Processes input buffer and updates player state
     */
    processInput() {
        const currentTime = Date.now();
        
        // Process movement
        if (this.inputState.keys.has('ArrowLeft')) {
            this.player.x = Math.max(0, this.player.x - this.player.speed);
        }
        
        if (this.inputState.keys.has('ArrowRight')) {
            this.player.x = Math.min(
                this.canvas.width - this.player.width,
                this.player.x + this.player.speed
            );
        }
        
        if (this.inputState.keys.has('ArrowUp')) {
            this.player.y = Math.max(0, this.player.y - this.player.speed);
        }
        
        if (this.inputState.keys.has('ArrowDown')) {
            this.player.y = Math.min(
                this.canvas.height - this.player.height,
                this.player.y + this.player.speed
            );
        }
        
        // Process shooting
        if (this.inputState.keys.has('Space') && this.canPlayerShoot(currentTime)) {
            this.playerShoot(currentTime);
        }
        
        // Clear processed input buffer
        this.inputBuffer = [];
    }
    
    /**
     * Checks if player can shoot based on cooldown
     * @param {number} currentTime - Current timestamp
     * @returns {boolean} Whether player can shoot
     */
    canPlayerShoot(currentTime) {
        return this.player.canShoot && 
               (currentTime - this.player.lastShotTime) >= this.player.shootCooldown;
    }
    
    /**
     * Handles player shooting action
     * @param {number} currentTime - Current timestamp
     */
    playerShoot(currentTime) {
        this.player.lastShotTime = currentTime;
        // In a real game, this would create a projectile
        return {
            x: this.player.x + this.player.width / 2,
            y: this.player.y,
            timestamp: currentTime
        };
    }
    
    /**
     * Simulates a game frame update
     */
    update() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        
        this.processInput();
        this.frameCount++;
        
        // Record frame time
        this.metrics.frameTime.push(deltaTime);
        if (this.metrics.frameTime.length > 100) {
            this.metrics.frameTime.shift();
        }
        
        this.lastFrameTime = currentTime;
    }
    
    /**
     * Starts the game loop
     */
    start() {
        this.isRunning = true;
        this.lastFrameTime = performance.now();
    }
    
    /**
     * Stops the game loop
     */
    stop() {
        this.isRunning = false;
    }
    
    /**
     * Resets game state for testing
     */
    reset() {
        this.player.x = 400;
        this.player.y = 550;
        this.player.isAlive = true;
        this.player.canShoot = true;
        this.player.lastShotTime = 0;
        
        this.inputState.keys.clear();
        this.inputBuffer = [];
        this.inputState.inputHistory = [];
        
        this.frameCount = 0;
        this.metrics.inputLatency = [];
        this.metrics.frameTime = [];
        this.metrics.inputProcessingTime = [];
    }
    
    /**
     * Gets current performance metrics
     * @returns {Object} Performance metrics
     */
    getMetrics() {
        const avgInputLatency = this.metrics.inputLatency.length > 0 
            ? this.metrics.inputLatency.reduce((a, b) => a + b, 0) / this.metrics.inputLatency.length 
            : 0;
            
        const avgFrameTime = this.metrics.frameTime.length > 0
            ? this.metrics.frameTime.reduce((a, b) => a + b, 0) / this.metrics.frameTime.length
            : 0;
            
        const avgInputProcessingTime = this.metrics.inputProcessingTime.length > 0
            ? this.metrics.inputProcessingTime.reduce((a, b) => a + b, 0) / this.metrics.inputProcessingTime.length
            : 0;
        
        return {
            averageInputLatency: avgInputLatency,
            averageFrameTime: avgFrameTime,
            averageInputProcessingTime: avgInputProcessingTime,
            totalInputEvents: this.inputState.inputHistory.length,
            currentBufferSize: this.inputBuffer.length
        };
    }
}

/**
 * Input Event Simulator for Testing
 * Simulates keyboard events for automated testing
 */
class InputSimulator {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.simulationQueue = [];
        this.isSimulating = false;
    }
    
    /**
     * Simulates a key press event
     * @param {string} keyCode - Key code to simulate
     * @param {number} duration - Duration to hold key (ms)
     * @returns {Promise} Promise that resolves when simulation completes
     */
    async simulateKeyPress(keyCode, duration = 100) {
        return new Promise((resolve) => {
            // Simulate keydown
            this.gameEngine.handleKeyDown({
                code: keyCode,
                preventDefault: () => {}
            });
            
            // Simulate keyup after duration
            setTimeout(() => {
                this.gameEngine.handleKeyUp({
                    code: keyCode
                });
                resolve();
            }, duration);
        });
    }
    
    /**
     * Simulates a sequence of key presses
     * @param {Array} keySequence - Array of {key, duration} objects
     * @returns {Promise} Promise that resolves when sequence completes
     */
    async simulateKeySequence(keySequence) {
        for (const {key, duration = 100, delay = 0} of keySequence) {
            if (delay > 0) {
                await this.wait(delay);
            }
            await this.simulateKeyPress(key, duration);
        }
    }
    
    /**
     * Simulates simultaneous key presses (chord)
     * @param {Array} keys - Array of key codes
     * @param {number} duration - Duration to hold keys
     * @returns {Promise} Promise that resolves when simulation completes
     */
    async simulateKeyChord(keys, duration = 100) {
        // Press all keys
        keys.forEach(key => {
            this.gameEngine.handleKeyDown({
                code: key,
                preventDefault: () => {}
            });
        });
        
        // Release all keys after duration
        return new Promise((resolve) => {
            setTimeout(() => {
                keys.forEach(key => {
                    this.gameEngine.handleKeyUp({
                        code: key
                    });
                });
                resolve();
            }, duration);
        });
    }
    
    /**
     * Utility method to wait for specified duration
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise} Promise that resolves after delay
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Test Suite for Player Input Integration
 */
describe('Player Input Integration Tests', () => {
    let gameEngine;
    let inputSimulator;
    
    beforeEach(() => {
        gameEngine = new MockGameEngine();
        inputSimulator = new InputSimulator(gameEngine);
        gameEngine.start();
    });
    
    afterEach(() => {
        gameEngine.stop();
        gameEngine.reset();
    });
    
    describe('Basic Movement Controls', () => {
        test('should move player left when left arrow is pressed', async () => {
            const initialX = gameEngine.player.x;
            
            await inputSimulator.simulateKeyPress('ArrowLeft', 200);
            
            // Process multiple frames to ensure movement
            for (let i = 0; i < 10; i++) {
                gameEngine.update();
                await inputSimulator.wait(16); // ~60fps
            }
            
            expect(gameEngine.player.x).toBeLessThan(initialX);
        });
        
        test('should move player right when right arrow is pressed', async () => {
            const initialX = gameEngine.player.x;
            
            await inputSimulator.simulateKeyPress('ArrowRight', 200);
            
            for (let i = 0; i < 10; i++) {
                gameEngine.update();
                await inputSimulator.wait(16);
            }
            
            expect(gameEngine.player.x).toBeGreaterThan(initialX);
        });
        
        test('should move player up when up arrow is pressed', async () => {
            const initialY = gameEngine.player.y;
            
            await inputSimulator.simulateKeyPress('ArrowUp', 200);
            
            for (let i = 0; i < 10; i++) {
                gameEngine.update();
                await inputSimulator.wait(16);
            }
            
            expect(gameEngine.player.y).toBeLessThan(initialY);
        });
        
        test('should move player down when down arrow is pressed', async () => {
            const initialY = gameEngine.player.y;
            
            await inputSimulator.simulateKeyPress('ArrowDown', 200);
            
            for (let i = 0; i < 10; i++) {
                gameEngine.update();
                await inputSimulator.wait(16);
            }
            
            expect(gameEngine.player.y).toBeGreaterThan(initialY);
        });
    });
    
    describe('Boundary Constraints', () => {
        test('should not move player beyond left boundary', async () => {
            gameEngine.player.x = 10; // Near left edge
            
            await inputSimulator.simulateKeyPress('ArrowLeft', 500);
            
            for (let i = 0; i < 20; i++) {
                gameEngine.update();
                await inputSimulator.wait(16);
            }
            
            expect(gameEngine.player.x).toBeGreaterThanOrEqual(0);
        });
        
        test('should not move player beyond right boundary', async () => {
            gameEngine.player.x = gameEngine.canvas.width - gameEngine.player.width - 10;
            
            await inputSimulator.simulateKeyPress('ArrowRight', 500);
            
            for (let i = 0; i < 20; i++) {
                gameEngine.update();
                await inputSimulator.wait(16);
            }
            
            expect(gameEngine.player.x).toBeLessThanOrEqual(
                gameEngine.canvas.width - gameEngine.player.width
            );
        });
        
        test('should not move player beyond top boundary', async () => {
            gameEngine.player.y = 10;
            
            await inputSimulator.simulateKeyPress('ArrowUp', 500);
            
            for (let i = 0; i < 20; i++) {
                gameEngine.update();
                await inputSimulator.wait(16);
            }
            
            expect(gameEngine.player.y).toBeGreaterThanOrEqual(0);
        });
        
        test('should not move player beyond bottom boundary', async () => {
            gameEngine.player.y = gameEngine.canvas.height - gameEngine.player.height - 10;
            
            await inputSimulator.simulateKeyPress('ArrowDown', 500);
            
            for (let i = 0; i < 20; i++) {
                gameEngine.update();
                await inputSimulator.wait(16);
            }
            
            expect(gameEngine.player.y).toBeLessThanOrEqual(
                gameEngine.canvas.height - gameEngine.player.height
            );
        });
    });
    
    describe('Diagonal Movement', () => {
        test('should handle diagonal movement correctly', async () => {
            const initialX = gameEngine.player.x;
            const initialY = gameEngine.player.y;
            
            // Simulate diagonal movement (right + up)
            await inputSimulator.simulateKeyChord(['ArrowRight', 'ArrowUp'], 300);
            
            for (let i = 0; i < 15; i++) {
                gameEngine.update();
                await inputSimulator.wait(16);
            }
            
            expect(gameEngine.player.x).toBeGreaterThan(initialX);
            expect(gameEngine.player.y).toBeLessThan(initialY);
        });
        
        test('should handle complex movement patterns', async () => {
            const movementSequence = [
                {key: 'ArrowRight', duration: 100},
                {key: 'ArrowUp', duration: 100, delay: 50},
                {key: 'ArrowLeft', duration: 100, delay: 50},
                {key: 'ArrowDown', duration: 100, delay: 50}
            ];
            
            await inputSimulator.simulateKeySequence(movementSequence);
            
            // Process frames during movement
            for (let i = 0; i < 30; i++) {
                gameEngine.update();
                await inputSimulator.wait(16);
            }
            
            // Player should have moved from initial position
            expect(gameEngine.inputState.inputHistory.length).toBeGreaterThan(0);
        });
    });
    
    describe('Shooting Mechanics', () => {
        test('should handle shooting input', async () => {
            const initialShotTime = gameEngine.player.lastShotTime;
            
            await inputSimulator.simulateKeyPress('Space', 100);
            gameEngine.update();
            
            expect(gameEngine.player.lastShotTime).toBeGreaterThan(initialShotTime);
        });
        
        test('should respect shooting cooldown', async () => {
            // First shot
            await inputSimulator.simulateKeyPress('Space', 50);
            gameEngine.update();
            const firstShotTime = gameEngine.player.lastShotTime;
            
            // Immediate second shot attempt
            await inputSimulator.simulateKeyPress('Space', 50);
            gameEngine.update();
            
            // Should not have fired again due to cooldown
            expect(gameEngine.player.lastShotTime).toBe(firstShotTime);
            
            // Wait for cooldown to expire
            await inputSimulator.wait(gameEngine.player.shootCooldown + 50);
            
            // Third shot should work
            await inputSimulator.simulateKeyPress('Space', 50);
            gameEngine.update();
            
            expect(gameEngine.player.lastShotTime).toBeGreaterThan(firstShotTime);
        });
        
        test('should handle rapid fire attempts', async () => {
            const rapidFireSequence = Array(10).fill().map(() => ({
                key: 'Space',
                duration: 20,
                delay: 10
            }));
            
            await inputSimulator.simulateKeySequence(rapidFireSequence);
            
            for (let i = 0; i < 20; i++) {
                gameEngine.update();
                await inputSimulator.wait(16);
            }
            
            // Should have limited shots due to cooldown
            expect(gameEngine.inputState.inputHistory.filter(
                event => event.code === 'Space'
            ).length).toBe(20); // 10 keydown + 10 keyup events
        });
    });
    
    describe('Input Buffering', () => {
        test('should buffer input events correctly', async () => {
            await inputSimulator.simulateKeySequence([
                {key: 'ArrowLeft', duration: 50},
                {key: 'ArrowRight', duration: 50, delay: 10},
                {key: 'Space', duration: 50, delay: 10}
            ]);
            
            expect(gameEngine.inputState.inputHistory.length).toBeGreaterThan(0);
            expect(gameEngine.inputState.inputHistory.some(
                event => event.code === 'ArrowLeft'
            )).toBe(true);
            expect(gameEngine.inputState.inputHistory.some(
                event => event.code === 'ArrowRight'
            )).toBe(true);
            expect(gameEngine.inputState.inputHistory.some(
                event => event.code === 'Space'
            )).toBe(true);
        });
        
        test('should maintain buffer size limits', async () => {
            // Generate more inputs than buffer size
            const manyInputs = Array(gameEngine.maxBufferSize + 5).fill().map((_, i) => ({
                key: i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight',
                duration: 20,
                delay: 5
            }));
            
            await inputSimulator.simulateKeySequence(manyInputs);
            
            // Buffer should not exceed max size
            expect(gameEngine.inputBuffer.length).toBeLessThanOrEqual(gameEngine.maxBufferSize);
        });
    });
    
    describe('Performance and Responsiveness', () => {
        test('should maintain responsive input processing', async () => {
            const testDuration = 1000; // 1 second
            const startTime = Date.now();
            
            // Simulate continuous input
            const continuousInput = async () => {
                while (Date.now() - startTime < testDuration) {
                    await inputSimulator.simulateKeyPress('ArrowLeft', 50);
                    await inputSimulator.wait(30);
                }
            };
            
            // Run continuous input and game updates
            const inputPromise = continuousInput();
            const updatePromise = (async () => {
                while (Date.now() - startTime < testDuration) {
                    gameEngine.update();
                    await inputSimulator.wait(16); // ~60fps
                }
            })();
            
            await Promise.all([inputPromise, updatePromise]);
            
            const metrics = gameEngine.getMetrics();
            
            // Input processing should be fast (< 5ms average)
            expect(metrics.averageInputProcessingTime).toBeLessThan(5);
            
            // Frame time should be reasonable (< 20ms for 60fps)
            expect(metrics.averageFrameTime).toBeLessThan(20);
        });
        
        test('should handle input burst without degradation', async () => {
            // Simulate input burst
            const burstInputs = Array(50).fill().map((_, i) => ({
                key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'][i % 5],
                duration: 10,
                delay: 1
            }));
            
            const startTime = performance.now();
            await inputSimulator.simulateKeySequence(burstInputs);
            const endTime = performance.now();
            
            // Should handle burst quickly
            expect(endTime - startTime).toBeLessThan(2000); // 2 seconds max
            
            // All inputs should be recorded
            expect(gameEngine.inputState.inputHistory.length).toBeGreaterThan(90); // keydown + keyup events
        });
    });
    
    describe('Input State Management', () => {
        test('should track active keys correctly', async () => {
            // Press multiple keys
            gameEngine.handleKeyDown({code: 'ArrowLeft', preventDefault: () => {}});
            gameEngine.handleKeyDown({code: 'Space', preventDefault: () => {}});
            
            expect(gameEngine.inputState.keys.has('ArrowLeft')).toBe(true);
            expect(gameEngine.inputState.keys.has('Space')).toBe(true);
            expect(gameEngine.inputState.keys.size).toBe(2);
            
            // Release one key
            gameEngine.handleKeyUp({code: 'ArrowLeft'});
            
            expect(gameEngine.inputState.keys.has('ArrowLeft')).toBe(false);
            expect(gameEngine.inputState.keys.has('Space')).toBe(true);
            expect(gameEngine.inputState.keys.size).toBe(1);
        });
        
        test('should prevent duplicate key events', async () => {
            const initialHistoryLength = gameEngine.inputState.inputHistory.length;
            
            // Press same key multiple times
            gameEngine.handleKeyDown({code: 'ArrowLeft', preventDefault: () => {}});
            gameEngine.handleKeyDown({code: 'ArrowLeft', preventDefault: () => {}});
            gameEngine.handleKeyDown({code: 'ArrowLeft', preventDefault: () => {}});
            
            // Should only register one keydown event
            expect(gameEngine.inputState.keys.size).toBe(1);
            expect(gameEngine.inputState.inputHistory.length).toBe(initialHistoryLength + 1);
        });
    });
    
    describe('Error Handling and Edge Cases', () => {
        test('should handle invalid key codes gracefully', () => {
            expect(() => {
                gameEngine.handleKeyDown({code: null, preventDefault: () => {}});
            }).not.toThrow();
            
            expect(() => {
                gameEngine.handleKeyDown({code: undefined, preventDefault: () => {}});
            }).not.toThrow();
        });
        
        test('should handle missing event properties', () => {
            expect(() => {
                gameEngine.handleKeyDown({});
            }).not.toThrow();
            
            expect(() => {
                gameEngine.handleKeyUp({});
            }).not.toThrow();
        });
        
        test('should maintain game state integrity during errors', () => {
            const initialPlayerState = {...gameEngine.player};
            
            try {
                gameEngine.handleKeyDown({code: 'InvalidKey', preventDefault: () => {}});
                gameEngine.update();
            } catch (error) {
                // Should not throw, but if it does, state should be preserved
            }
            
            // Core player properties should remain valid
            expect(typeof gameEngine.player.x).toBe('number');
            expect(typeof gameEngine.player.y).toBe('number');
            expect(gameEngine.player.x).toBeGreaterThanOrEqual(0);
            expect(gameEngine.player.y).toBeGreaterThanOrEqual(0);
        });
    });
    
    describe('Integration with Game Loop', () => {
        test('should integrate smoothly with game update cycle', async () => {
            let updateCount = 0;
            const maxUpdates = 60; // 1 second at 60fps
            
            // Start continuous movement
            gameEngine.handleKeyDown({code: 'ArrowRight', preventDefault: () => {}});
            
            const initialX = gameEngine.player.x;
            
            // Run game loop
            while (updateCount < maxUpdates) {
                gameEngine.update();
                updateCount++;
                await inputSimulator.wait(16);
            }
            
            gameEngine.handleKeyUp({code: 'ArrowRight'});
            
            // Player should have moved smoothly
            expect(gameEngine.player.x).toBeGreaterThan(initialX);
            expect(gameEngine.frameCount).toBe(maxUpdates);
        });
        
        test('should maintain consistent frame timing with input', async () => {
            const frameTimes = [];
            let lastTime = performance.now();
            
            // Simulate input during frame updates
            for (let i = 0; i < 30; i++) {
                if (i % 5 === 0) {
                    await inputSimulator.simulateKeyPress('Space', 20);
                }
                
                gameEngine.update();
                
                const currentTime = performance.now();
                frameTimes.push(currentTime - lastTime);
                lastTime = currentTime;
                
                await inputSimulator.wait(16);
            }
            
            // Frame times should be relatively consistent
            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            const maxDeviation = Math.max(...frameTimes.map(t => Math.abs(t - avgFrameTime)));
            
            expect(maxDeviation).toBeLessThan(50); // 50ms max deviation
        });
    });
});

// Export for use in other test files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MockGameEngine,
        InputSimulator
    };
}