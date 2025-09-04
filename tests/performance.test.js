/**
 * Performance Test Suite for Space Invaders Game Engine
 * 
 * This comprehensive test suite validates the performance characteristics
 * of the game loop architecture, ensuring consistent frame rates and
 * optimal resource utilization across different scenarios.
 * 
 * Key Performance Metrics Tested:
 * - Frame rate consistency (60 FPS target)
 * - Delta time accuracy and stability
 * - Memory usage patterns
 * - CPU utilization efficiency
 * - Garbage collection impact
 * - Animation smoothness
 * 
 * Architecture Decisions:
 * - Uses performance.now() for high-precision timing
 * - Implements statistical analysis for frame rate validation
 * - Provides memory leak detection capabilities
 * - Supports cross-browser performance testing
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025
 */

/**
 * Performance monitoring utilities for game loop testing
 */
class PerformanceMonitor {
    constructor() {
        this.frameTimestamps = [];
        this.deltaTimeHistory = [];
        this.memorySnapshots = [];
        this.maxSamples = 1000;
        this.isMonitoring = false;
        this.startTime = 0;
        this.frameCount = 0;
    }

    /**
     * Start performance monitoring
     */
    startMonitoring() {
        this.isMonitoring = true;
        this.startTime = performance.now();
        this.frameCount = 0;
        this.frameTimestamps = [];
        this.deltaTimeHistory = [];
        this.memorySnapshots = [];
    }

    /**
     * Stop performance monitoring and return results
     * @returns {Object} Performance metrics
     */
    stopMonitoring() {
        this.isMonitoring = false;
        return this.getMetrics();
    }

    /**
     * Record a frame timestamp
     * @param {number} timestamp - Current timestamp
     * @param {number} deltaTime - Time since last frame
     */
    recordFrame(timestamp, deltaTime) {
        if (!this.isMonitoring) return;

        this.frameTimestamps.push(timestamp);
        this.deltaTimeHistory.push(deltaTime);
        this.frameCount++;

        // Record memory usage if available
        if (performance.memory) {
            this.memorySnapshots.push({
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                timestamp: timestamp
            });
        }

        // Limit sample size to prevent memory issues
        if (this.frameTimestamps.length > this.maxSamples) {
            this.frameTimestamps.shift();
            this.deltaTimeHistory.shift();
            if (this.memorySnapshots.length > 0) {
                this.memorySnapshots.shift();
            }
        }
    }

    /**
     * Calculate comprehensive performance metrics
     * @returns {Object} Detailed performance analysis
     */
    getMetrics() {
        const totalTime = performance.now() - this.startTime;
        const averageFPS = (this.frameCount / totalTime) * 1000;

        // Calculate frame rate statistics
        const frameTimes = this.calculateFrameTimes();
        const frameRateStats = this.calculateFrameRateStats(frameTimes);
        
        // Calculate delta time statistics
        const deltaTimeStats = this.calculateDeltaTimeStats();
        
        // Calculate memory statistics
        const memoryStats = this.calculateMemoryStats();

        return {
            totalTime,
            frameCount: this.frameCount,
            averageFPS,
            frameRateStats,
            deltaTimeStats,
            memoryStats,
            performanceGrade: this.calculatePerformanceGrade(frameRateStats, deltaTimeStats)
        };
    }

    /**
     * Calculate frame times from timestamps
     * @returns {number[]} Array of frame times in milliseconds
     */
    calculateFrameTimes() {
        const frameTimes = [];
        for (let i = 1; i < this.frameTimestamps.length; i++) {
            frameTimes.push(this.frameTimestamps[i] - this.frameTimestamps[i - 1]);
        }
        return frameTimes;
    }

    /**
     * Calculate frame rate statistics
     * @param {number[]} frameTimes - Array of frame times
     * @returns {Object} Frame rate statistics
     */
    calculateFrameRateStats(frameTimes) {
        if (frameTimes.length === 0) {
            return { min: 0, max: 0, average: 0, median: 0, standardDeviation: 0 };
        }

        const frameRates = frameTimes.map(time => 1000 / time);
        const sorted = [...frameRates].sort((a, b) => a - b);
        
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const average = frameRates.reduce((sum, rate) => sum + rate, 0) / frameRates.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        
        // Calculate standard deviation
        const variance = frameRates.reduce((sum, rate) => sum + Math.pow(rate - average, 2), 0) / frameRates.length;
        const standardDeviation = Math.sqrt(variance);

        return {
            min: Math.round(min * 100) / 100,
            max: Math.round(max * 100) / 100,
            average: Math.round(average * 100) / 100,
            median: Math.round(median * 100) / 100,
            standardDeviation: Math.round(standardDeviation * 100) / 100,
            consistency: this.calculateConsistency(frameRates)
        };
    }

    /**
     * Calculate delta time statistics
     * @returns {Object} Delta time statistics
     */
    calculateDeltaTimeStats() {
        if (this.deltaTimeHistory.length === 0) {
            return { min: 0, max: 0, average: 0, stability: 0 };
        }

        const sorted = [...this.deltaTimeHistory].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const average = this.deltaTimeHistory.reduce((sum, dt) => sum + dt, 0) / this.deltaTimeHistory.length;
        
        // Calculate stability (inverse of coefficient of variation)
        const variance = this.deltaTimeHistory.reduce((sum, dt) => sum + Math.pow(dt - average, 2), 0) / this.deltaTimeHistory.length;
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = standardDeviation / average;
        const stability = Math.max(0, 1 - coefficientOfVariation);

        return {
            min: Math.round(min * 1000) / 1000,
            max: Math.round(max * 1000) / 1000,
            average: Math.round(average * 1000) / 1000,
            stability: Math.round(stability * 100) / 100
        };
    }

    /**
     * Calculate memory usage statistics
     * @returns {Object} Memory statistics
     */
    calculateMemoryStats() {
        if (this.memorySnapshots.length === 0) {
            return { available: false };
        }

        const usedMemory = this.memorySnapshots.map(snapshot => snapshot.used);
        const totalMemory = this.memorySnapshots.map(snapshot => snapshot.total);

        const minUsed = Math.min(...usedMemory);
        const maxUsed = Math.max(...usedMemory);
        const averageUsed = usedMemory.reduce((sum, mem) => sum + mem, 0) / usedMemory.length;
        
        const memoryGrowth = usedMemory[usedMemory.length - 1] - usedMemory[0];
        const memoryLeakSuspected = memoryGrowth > (averageUsed * 0.1); // 10% growth threshold

        return {
            available: true,
            minUsed: Math.round(minUsed / 1024 / 1024 * 100) / 100, // MB
            maxUsed: Math.round(maxUsed / 1024 / 1024 * 100) / 100, // MB
            averageUsed: Math.round(averageUsed / 1024 / 1024 * 100) / 100, // MB
            memoryGrowth: Math.round(memoryGrowth / 1024 / 1024 * 100) / 100, // MB
            memoryLeakSuspected
        };
    }

    /**
     * Calculate frame rate consistency score
     * @param {number[]} frameRates - Array of frame rates
     * @returns {number} Consistency score (0-1)
     */
    calculateConsistency(frameRates) {
        if (frameRates.length < 2) return 1;

        const average = frameRates.reduce((sum, rate) => sum + rate, 0) / frameRates.length;
        const deviations = frameRates.map(rate => Math.abs(rate - average) / average);
        const averageDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
        
        return Math.max(0, 1 - averageDeviation);
    }

    /**
     * Calculate overall performance grade
     * @param {Object} frameRateStats - Frame rate statistics
     * @param {Object} deltaTimeStats - Delta time statistics
     * @returns {string} Performance grade (A-F)
     */
    calculatePerformanceGrade(frameRateStats, deltaTimeStats) {
        let score = 0;

        // Frame rate score (40% weight)
        if (frameRateStats.average >= 58) score += 40;
        else if (frameRateStats.average >= 50) score += 32;
        else if (frameRateStats.average >= 40) score += 24;
        else if (frameRateStats.average >= 30) score += 16;
        else score += 8;

        // Consistency score (30% weight)
        score += frameRateStats.consistency * 30;

        // Stability score (30% weight)
        score += deltaTimeStats.stability * 30;

        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }
}

/**
 * Mock Game Loop for testing purposes
 */
class MockGameLoop {
    constructor(targetFPS = 60) {
        this.targetFPS = targetFPS;
        this.targetFrameTime = 1000 / targetFPS;
        this.isRunning = false;
        this.lastTimestamp = 0;
        this.frameId = null;
        this.updateCallback = null;
        this.renderCallback = null;
        this.performanceMonitor = new PerformanceMonitor();
        
        // Simulation parameters
        this.cpuLoadFactor = 1; // Multiplier for artificial CPU load
        this.memoryLeakEnabled = false;
        this.memoryLeakArray = [];
    }

    /**
     * Set update callback
     * @param {Function} callback - Update function
     */
    setUpdateCallback(callback) {
        this.updateCallback = callback;
    }

    /**
     * Set render callback
     * @param {Function} callback - Render function
     */
    setRenderCallback(callback) {
        this.renderCallback = callback;
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTimestamp = performance.now();
        this.performanceMonitor.startMonitoring();
        this.gameLoop(this.lastTimestamp);
    }

    /**
     * Stop the game loop
     * @returns {Object} Performance metrics
     */
    stop() {
        if (!this.isRunning) return null;
        
        this.isRunning = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
        
        return this.performanceMonitor.stopMonitoring();
    }

    /**
     * Main game loop implementation
     * @param {number} timestamp - Current timestamp
     */
    gameLoop(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = (timestamp - this.lastTimestamp) / 1000; // Convert to seconds
        this.lastTimestamp = timestamp;

        // Record performance data
        this.performanceMonitor.recordFrame(timestamp, deltaTime);

        // Simulate CPU load
        this.simulateCPULoad();

        // Simulate memory leak if enabled
        if (this.memoryLeakEnabled) {
            this.simulateMemoryLeak();
        }

        // Execute callbacks
        if (this.updateCallback) {
            this.updateCallback(deltaTime);
        }
        
        if (this.renderCallback) {
            this.renderCallback(deltaTime);
        }

        // Schedule next frame
        this.frameId = requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    /**
     * Simulate CPU load for testing
     */
    simulateCPULoad() {
        const iterations = Math.floor(1000 * this.cpuLoadFactor);
        let dummy = 0;
        for (let i = 0; i < iterations; i++) {
            dummy += Math.random();
        }
    }

    /**
     * Simulate memory leak for testing
     */
    simulateMemoryLeak() {
        // Add some objects to simulate memory leak
        for (let i = 0; i < 10; i++) {
            this.memoryLeakArray.push({
                data: new Array(100).fill(Math.random()),
                timestamp: performance.now()
            });
        }
        
        // Occasionally clean up old entries to prevent browser crash
        if (this.memoryLeakArray.length > 10000) {
            this.memoryLeakArray.splice(0, 5000);
        }
    }

    /**
     * Set CPU load factor for testing
     * @param {number} factor - Load multiplier
     */
    setCPULoadFactor(factor) {
        this.cpuLoadFactor = Math.max(0, factor);
    }

    /**
     * Enable or disable memory leak simulation
     * @param {boolean} enabled - Whether to enable memory leak
     */
    setMemoryLeakEnabled(enabled) {
        this.memoryLeakEnabled = enabled;
        if (!enabled) {
            this.memoryLeakArray = [];
        }
    }
}

/**
 * Performance Test Suite
 */
describe('Game Loop Performance Tests', () => {
    let gameLoop;
    let updateCallCount;
    let renderCallCount;

    beforeEach(() => {
        gameLoop = new MockGameLoop(60);
        updateCallCount = 0;
        renderCallCount = 0;

        // Set up mock callbacks
        gameLoop.setUpdateCallback((deltaTime) => {
            updateCallCount++;
            // Simulate some game logic
            const entities = new Array(100).fill(0).map(() => ({
                x: Math.random() * 800,
                y: Math.random() * 600,
                velocity: { x: Math.random() - 0.5, y: Math.random() - 0.5 }
            }));
            
            entities.forEach(entity => {
                entity.x += entity.velocity.x * deltaTime * 60;
                entity.y += entity.velocity.y * deltaTime * 60;
            });
        });

        gameLoop.setRenderCallback((deltaTime) => {
            renderCallCount++;
            // Simulate rendering operations
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, 800, 600);
        });
    });

    afterEach(() => {
        if (gameLoop) {
            gameLoop.stop();
        }
    });

    describe('Frame Rate Consistency', () => {
        test('should maintain 60 FPS under normal conditions', async () => {
            const testDuration = 1000; // 1 second
            
            gameLoop.start();
            
            await new Promise(resolve => setTimeout(resolve, testDuration));
            
            const metrics = gameLoop.stop();
            
            expect(metrics.averageFPS).toBeGreaterThan(55);
            expect(metrics.averageFPS).toBeLessThan(65);
            expect(metrics.frameRateStats.consistency).toBeGreaterThan(0.8);
            expect(metrics.performanceGrade).toMatch(/[A-C]/);
        });

        test('should handle high CPU load gracefully', async () => {
            const testDuration = 1000;
            
            gameLoop.setCPULoadFactor(3); // 3x normal load
            gameLoop.start();
            
            await new Promise(resolve => setTimeout(resolve, testDuration));
            
            const metrics = gameLoop.stop();
            
            // Should still maintain reasonable performance
            expect(metrics.averageFPS).toBeGreaterThan(30);
            expect(metrics.frameRateStats.min).toBeGreaterThan(20);
        });

        test('should detect frame rate drops', async () => {
            const testDuration = 500;
            
            gameLoop.start();
            
            // Introduce heavy load after 250ms
            setTimeout(() => {
                gameLoop.setCPULoadFactor(10);
            }, 250);
            
            await new Promise(resolve => setTimeout(resolve, testDuration));
            
            const metrics = gameLoop.stop();
            
            expect(metrics.frameRateStats.standardDeviation).toBeGreaterThan(5);
            expect(metrics.frameRateStats.consistency).toBeLessThan(0.7);
        });
    });

    describe('Delta Time Accuracy', () => {
        test('should provide stable delta time values', async () => {
            const testDuration = 1000;
            
            gameLoop.start();
            
            await new Promise(resolve => setTimeout(resolve, testDuration));
            
            const metrics = gameLoop.stop();
            
            // Delta time should be close to 1/60 seconds (16.67ms)
            const expectedDeltaTime = 1 / 60;
            expect(metrics.deltaTimeStats.average).toBeCloseTo(expectedDeltaTime, 1);
            expect(metrics.deltaTimeStats.stability).toBeGreaterThan(0.7);
        });

        test('should handle variable frame rates', async () => {
            const testDuration = 1000;
            
            gameLoop.start();
            
            // Vary CPU load during test
            let loadFactor = 1;
            const interval = setInterval(() => {
                loadFactor = 1 + Math.random() * 2;
                gameLoop.setCPULoadFactor(loadFactor);
            }, 100);
            
            await new Promise(resolve => setTimeout(resolve, testDuration));
            
            clearInterval(interval);
            const metrics = gameLoop.stop();
            
            // Delta time should adapt to frame rate changes
            expect(metrics.deltaTimeStats.min).toBeGreaterThan(0.01);
            expect(metrics.deltaTimeStats.max).toBeLessThan(0.1);
        });
    });

    describe('Memory Management', () => {
        test('should maintain stable memory usage', async () => {
            const testDuration = 2000;
            
            gameLoop.start();
            
            await new Promise(resolve => setTimeout(resolve, testDuration));
            
            const metrics = gameLoop.stop();
            
            if (metrics.memoryStats.available) {
                expect(metrics.memoryStats.memoryLeakSuspected).toBe(false);
                expect(metrics.memoryStats.memoryGrowth).toBeLessThan(10); // Less than 10MB growth
            }
        });

        test('should detect memory leaks', async () => {
            const testDuration = 1500;
            
            gameLoop.setMemoryLeakEnabled(true);
            gameLoop.start();
            
            await new Promise(resolve => setTimeout(resolve, testDuration));
            
            const metrics = gameLoop.stop();
            
            if (metrics.memoryStats.available) {
                expect(metrics.memoryStats.memoryLeakSuspected).toBe(true);
                expect(metrics.memoryStats.memoryGrowth).toBeGreaterThan(1);
            }
        });
    });

    describe('Callback Execution', () => {
        test('should execute update and render callbacks consistently', async () => {
            const testDuration = 1000;
            
            gameLoop.start();
            
            await new Promise(resolve => setTimeout(resolve, testDuration));
            
            const metrics = gameLoop.stop();
            
            // Should have called update and render for each frame
            expect(updateCallCount).toBeGreaterThan(50);
            expect(renderCallCount).toBeGreaterThan(50);
            expect(Math.abs(updateCallCount - renderCallCount)).toBeLessThan(5);
            expect(updateCallCount).toBeCloseTo(metrics.frameCount, 5);
        });

        test('should handle callback errors gracefully', async () => {
            const testDuration = 500;
            let errorCount = 0;
            
            // Override update callback to throw errors occasionally
            gameLoop.setUpdateCallback((deltaTime) => {
                updateCallCount++;
                if (Math.random() < 0.1) { // 10% chance of error
                    errorCount++;
                    throw new Error('Simulated callback error');
                }
            });
            
            gameLoop.start();
            
            await new Promise(resolve => setTimeout(resolve, testDuration));
            
            const metrics = gameLoop.stop();
            
            // Game loop should continue despite errors
            expect(updateCallCount).toBeGreaterThan(20);
            expect(metrics.averageFPS).toBeGreaterThan(30);
        });
    });

    describe('Performance Grading', () => {
        test('should assign appropriate performance grades', async () => {
            const testCases = [
                { cpuLoad: 1, expectedGrade: /[A-B]/, description: 'normal load' },
                { cpuLoad: 3, expectedGrade: /[B-D]/, description: 'moderate load' },
                { cpuLoad: 8, expectedGrade: /[D-F]/, description: 'heavy load' }
            ];
            
            for (const testCase of testCases) {
                gameLoop = new MockGameLoop(60);
                gameLoop.setUpdateCallback(() => updateCallCount++);
                gameLoop.setRenderCallback(() => renderCallCount++);
                gameLoop.setCPULoadFactor(testCase.cpuLoad);
                
                gameLoop.start();
                await new Promise(resolve => setTimeout(resolve, 1000));
                const metrics = gameLoop.stop();
                
                expect(metrics.performanceGrade).toMatch(testCase.expectedGrade);
            }
        });
    });

    describe('Cross-Browser Compatibility', () => {
        test('should work with different requestAnimationFrame implementations', () => {
            // Mock different RAF implementations
            const originalRAF = window.requestAnimationFrame;
            const originalCAF = window.cancelAnimationFrame;
            
            // Test with setTimeout fallback
            window.requestAnimationFrame = undefined;
            window.cancelAnimationFrame = undefined;
            
            expect(() => {
                const testLoop = new MockGameLoop(30);
                testLoop.start();
                testLoop.stop();
            }).not.toThrow();
            
            // Restore original implementations
            window.requestAnimationFrame = originalRAF;
            window.cancelAnimationFrame = originalCAF;
        });

        test('should handle performance.now() unavailability', () => {
            const originalPerformanceNow = performance.now;
            
            // Mock performance.now unavailability
            performance.now = undefined;
            
            expect(() => {
                const testLoop = new MockGameLoop(60);
                testLoop.start();
                testLoop.stop();
            }).not.toThrow();
            
            // Restore original implementation
            performance.now = originalPerformanceNow;
        });
    });

    describe('Edge Cases', () => {
        test('should handle very short test durations', async () => {
            gameLoop.start();
            
            await new Promise(resolve => setTimeout(resolve, 50)); // 50ms
            
            const metrics = gameLoop.stop();
            
            expect(metrics).toBeDefined();
            expect(metrics.frameCount).toBeGreaterThan(0);
            expect(metrics.totalTime).toBeGreaterThan(0);
        });

        test('should handle multiple start/stop cycles', async () => {
            for (let i = 0; i < 3; i++) {
                gameLoop.start();
                await new Promise(resolve => setTimeout(resolve, 200));
                const metrics = gameLoop.stop();
                
                expect(metrics).toBeDefined();
                expect(metrics.frameCount).toBeGreaterThan(0);
            }
        });

        test('should handle stop without start', () => {
            expect(() => {
                const metrics = gameLoop.stop();
                expect(metrics).toBeNull();
            }).not.toThrow();
        });
    });
});

/**
 * Integration tests for performance monitoring
 */
describe('Performance Monitor Integration', () => {
    let monitor;

    beforeEach(() => {
        monitor = new PerformanceMonitor();
    });

    test('should provide accurate timing measurements', () => {
        monitor.startMonitoring();
        
        const startTime = performance.now();
        
        // Simulate frame recordings
        for (let i = 0; i < 60; i++) {
            const timestamp = startTime + (i * 16.67); // 60 FPS
            const deltaTime = 0.01667; // ~16.67ms in seconds
            monitor.recordFrame(timestamp, deltaTime);
        }
        
        const metrics = monitor.stopMonitoring();
        
        expect(metrics.frameCount).toBe(60);
        expect(metrics.averageFPS).toBeCloseTo(60, 0);
        expect(metrics.deltaTimeStats.average).toBeCloseTo(0.01667, 3);
    });

    test('should detect performance anomalies', () => {
        monitor.startMonitoring();
        
        const startTime = performance.now();
        
        // Record normal frames
        for (let i = 0; i < 30; i++) {
            monitor.recordFrame(startTime + (i * 16.67), 0.01667);
        }
        
        // Record slow frames
        for (let i = 30; i < 60; i++) {
            monitor.recordFrame(startTime + (i * 33.33), 0.03333); // 30 FPS
        }
        
        const metrics = monitor.stopMonitoring();
        
        expect(metrics.frameRateStats.standardDeviation).toBeGreaterThan(10);
        expect(metrics.frameRateStats.consistency).toBeLessThan(0.8);
        expect(metrics.performanceGrade).toMatch(/[C-F]/);
    });
});

// Export for potential use in other test files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PerformanceMonitor,
        MockGameLoop
    };
}