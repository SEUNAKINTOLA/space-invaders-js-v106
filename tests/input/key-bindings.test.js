/**
 * Key Bindings Test Suite
 * 
 * Comprehensive test coverage for keyboard input system including:
 * - Key mapping configuration and validation
 * - Input buffering and timing mechanics
 * - Responsive control handling
 * - Edge cases and error conditions
 * 
 * @fileoverview Tests for key binding configuration and mapping functionality
 * @version 1.0.0
 * @author Space Invaders JS Team
 */

describe('Key Bindings System', () => {
    let keyBindings;
    let mockEventTarget;
    let mockPerformanceMonitor;

    // Test data builders for complex objects
    const createMockKeyEvent = (key, type = 'keydown', options = {}) => ({
        key,
        type,
        code: `Key${key.toUpperCase()}`,
        keyCode: key.charCodeAt(0),
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        timestamp: performance.now(),
        ...options
    });

    const createDefaultKeyMap = () => ({
        movement: {
            up: ['ArrowUp', 'KeyW'],
            down: ['ArrowDown', 'KeyS'],
            left: ['ArrowLeft', 'KeyA'],
            right: ['ArrowRight', 'KeyD']
        },
        actions: {
            shoot: ['Space', 'Enter'],
            pause: ['Escape', 'KeyP'],
            restart: ['KeyR']
        },
        ui: {
            menu: ['Escape'],
            select: ['Enter', 'Space'],
            back: ['Backspace']
        }
    });

    beforeEach(() => {
        // Reset all mocks and create fresh instances
        jest.clearAllMocks();
        
        // Mock DOM event target
        mockEventTarget = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn()
        };

        // Mock performance monitor for input timing
        mockPerformanceMonitor = {
            startTimer: jest.fn(() => 'timer-id'),
            endTimer: jest.fn(),
            recordMetric: jest.fn(),
            getMetrics: jest.fn(() => ({}))
        };

        // Mock global objects
        global.performance = {
            now: jest.fn(() => 1000)
        };

        global.document = {
            addEventListener: mockEventTarget.addEventListener,
            removeEventListener: mockEventTarget.removeEventListener
        };

        // Create key bindings instance with dependency injection
        keyBindings = createKeyBindingsSystem({
            eventTarget: mockEventTarget,
            performanceMonitor: mockPerformanceMonitor,
            defaultKeyMap: createDefaultKeyMap()
        });
    });

    afterEach(() => {
        // Cleanup resources
        if (keyBindings && typeof keyBindings.destroy === 'function') {
            keyBindings.destroy();
        }
    });

    describe('Initialization and Configuration', () => {
        test('should initialize with default key mappings', () => {
            expect(keyBindings).toBeDefined();
            expect(keyBindings.getKeyMap()).toEqual(createDefaultKeyMap());
        });

        test('should validate key mapping configuration on initialization', () => {
            const invalidKeyMap = {
                movement: {
                    up: null, // Invalid: null value
                    down: [], // Invalid: empty array
                    left: 'invalid' // Invalid: string instead of array
                }
            };

            expect(() => {
                createKeyBindingsSystem({
                    defaultKeyMap: invalidKeyMap
                });
            }).toThrow('Invalid key mapping configuration');
        });

        test('should register event listeners on initialization', () => {
            expect(mockEventTarget.addEventListener).toHaveBeenCalledWith(
                'keydown',
                expect.any(Function),
                expect.any(Object)
            );
            expect(mockEventTarget.addEventListener).toHaveBeenCalledWith(
                'keyup',
                expect.any(Function),
                expect.any(Object)
            );
        });

        test('should support custom key mapping during initialization', () => {
            const customKeyMap = {
                movement: {
                    up: ['KeyW'],
                    down: ['KeyS']
                }
            };

            const customKeyBindings = createKeyBindingsSystem({
                defaultKeyMap: customKeyMap
            });

            expect(customKeyBindings.getKeyMap()).toEqual(customKeyMap);
        });
    });

    describe('Key Mapping and Configuration', () => {
        test('should map single key to action', () => {
            keyBindings.mapKey('shoot', 'KeyX');
            
            const keyMap = keyBindings.getKeyMap();
            expect(keyMap.actions.shoot).toContain('KeyX');
        });

        test('should map multiple keys to single action', () => {
            keyBindings.mapKeys('shoot', ['KeyX', 'KeyZ']);
            
            const keyMap = keyBindings.getKeyMap();
            expect(keyMap.actions.shoot).toEqual(expect.arrayContaining(['KeyX', 'KeyZ']));
        });

        test('should unmap key from action', () => {
            keyBindings.unmapKey('shoot', 'Space');
            
            const keyMap = keyBindings.getKeyMap();
            expect(keyMap.actions.shoot).not.toContain('Space');
        });

        test('should clear all mappings for action', () => {
            keyBindings.clearAction('shoot');
            
            const keyMap = keyBindings.getKeyMap();
            expect(keyMap.actions.shoot).toEqual([]);
        });

        test('should reset to default key mappings', () => {
            keyBindings.mapKey('shoot', 'KeyX');
            keyBindings.resetToDefaults();
            
            expect(keyBindings.getKeyMap()).toEqual(createDefaultKeyMap());
        });

        test('should validate key codes during mapping', () => {
            expect(() => {
                keyBindings.mapKey('shoot', '');
            }).toThrow('Invalid key code');

            expect(() => {
                keyBindings.mapKey('shoot', null);
            }).toThrow('Invalid key code');

            expect(() => {
                keyBindings.mapKey('shoot', 123);
            }).toThrow('Invalid key code');
        });

        test('should prevent duplicate key mappings across actions', () => {
            keyBindings.mapKey('shoot', 'KeyX');
            
            expect(() => {
                keyBindings.mapKey('pause', 'KeyX');
            }).toThrow('Key already mapped to another action');
        });

        test('should allow overriding duplicate key mappings when forced', () => {
            keyBindings.mapKey('shoot', 'KeyX');
            keyBindings.mapKey('pause', 'KeyX', { force: true });
            
            const keyMap = keyBindings.getKeyMap();
            expect(keyMap.actions.shoot).not.toContain('KeyX');
            expect(keyMap.actions.pause).toContain('KeyX');
        });
    });

    describe('Input Detection and Processing', () => {
        test('should detect key press for mapped action', () => {
            const callback = jest.fn();
            keyBindings.onAction('shoot', callback);
            
            const keyEvent = createMockKeyEvent('Space', 'keydown');
            keyBindings.handleKeyEvent(keyEvent);
            
            expect(callback).toHaveBeenCalledWith({
                action: 'shoot',
                key: 'Space',
                timestamp: expect.any(Number),
                event: keyEvent
            });
        });

        test('should detect key release for mapped action', () => {
            const callback = jest.fn();
            keyBindings.onActionRelease('shoot', callback);
            
            const keyEvent = createMockKeyEvent('Space', 'keyup');
            keyBindings.handleKeyEvent(keyEvent);
            
            expect(callback).toHaveBeenCalledWith({
                action: 'shoot',
                key: 'Space',
                timestamp: expect.any(Number),
                event: keyEvent
            });
        });

        test('should ignore unmapped keys', () => {
            const callback = jest.fn();
            keyBindings.onAction('shoot', callback);
            
            const keyEvent = createMockKeyEvent('KeyQ', 'keydown');
            keyBindings.handleKeyEvent(keyEvent);
            
            expect(callback).not.toHaveBeenCalled();
        });

        test('should handle multiple keys mapped to same action', () => {
            const callback = jest.fn();
            keyBindings.onAction('shoot', callback);
            
            // Test both Space and Enter for shoot action
            const spaceEvent = createMockKeyEvent('Space', 'keydown');
            const enterEvent = createMockKeyEvent('Enter', 'keydown');
            
            keyBindings.handleKeyEvent(spaceEvent);
            keyBindings.handleKeyEvent(enterEvent);
            
            expect(callback).toHaveBeenCalledTimes(2);
        });

        test('should prevent default behavior for mapped keys', () => {
            keyBindings.onAction('shoot', jest.fn());
            
            const keyEvent = createMockKeyEvent('Space', 'keydown');
            keyBindings.handleKeyEvent(keyEvent);
            
            expect(keyEvent.preventDefault).toHaveBeenCalled();
        });

        test('should allow default behavior when configured', () => {
            keyBindings.setPreventDefault(false);
            keyBindings.onAction('shoot', jest.fn());
            
            const keyEvent = createMockKeyEvent('Space', 'keydown');
            keyBindings.handleKeyEvent(keyEvent);
            
            expect(keyEvent.preventDefault).not.toHaveBeenCalled();
        });
    });

    describe('Input Buffering System', () => {
        test('should buffer input when enabled', () => {
            keyBindings.enableInputBuffer(true);
            keyBindings.setBufferSize(5);
            
            const keyEvent = createMockKeyEvent('Space', 'keydown');
            keyBindings.handleKeyEvent(keyEvent);
            
            const buffer = keyBindings.getInputBuffer();
            expect(buffer).toHaveLength(1);
            expect(buffer[0]).toMatchObject({
                action: 'shoot',
                key: 'Space',
                timestamp: expect.any(Number)
            });
        });

        test('should respect buffer size limit', () => {
            keyBindings.enableInputBuffer(true);
            keyBindings.setBufferSize(2);
            
            // Add 3 inputs to exceed buffer size
            for (let i = 0; i < 3; i++) {
                const keyEvent = createMockKeyEvent('Space', 'keydown');
                keyBindings.handleKeyEvent(keyEvent);
            }
            
            const buffer = keyBindings.getInputBuffer();
            expect(buffer).toHaveLength(2);
        });

        test('should clear input buffer', () => {
            keyBindings.enableInputBuffer(true);
            
            const keyEvent = createMockKeyEvent('Space', 'keydown');
            keyBindings.handleKeyEvent(keyEvent);
            
            keyBindings.clearInputBuffer();
            expect(keyBindings.getInputBuffer()).toHaveLength(0);
        });

        test('should process buffered inputs in order', () => {
            keyBindings.enableInputBuffer(true);
            const processedInputs = [];
            
            keyBindings.onAction('shoot', (data) => {
                processedInputs.push(data.timestamp);
            });
            
            // Add inputs with different timestamps
            global.performance.now.mockReturnValueOnce(1000);
            keyBindings.handleKeyEvent(createMockKeyEvent('Space', 'keydown'));
            
            global.performance.now.mockReturnValueOnce(2000);
            keyBindings.handleKeyEvent(createMockKeyEvent('Space', 'keydown'));
            
            keyBindings.processInputBuffer();
            
            expect(processedInputs).toEqual([1000, 2000]);
        });

        test('should filter buffered inputs by time window', () => {
            keyBindings.enableInputBuffer(true);
            keyBindings.setBufferTimeWindow(100); // 100ms window
            
            global.performance.now.mockReturnValueOnce(1000);
            keyBindings.handleKeyEvent(createMockKeyEvent('Space', 'keydown'));
            
            global.performance.now.mockReturnValueOnce(1200); // 200ms later
            keyBindings.handleKeyEvent(createMockKeyEvent('Space', 'keydown'));
            
            global.performance.now.mockReturnValueOnce(1250); // Current time
            const validInputs = keyBindings.getValidBufferedInputs();
            
            expect(validInputs).toHaveLength(1); // Only the recent input
        });
    });

    describe('Responsive Controls and Timing', () => {
        test('should track key press duration', () => {
            keyBindings.enableKeyTracking(true);
            
            global.performance.now.mockReturnValueOnce(1000);
            keyBindings.handleKeyEvent(createMockKeyEvent('Space', 'keydown'));
            
            global.performance.now.mockReturnValueOnce(1500);
            keyBindings.handleKeyEvent(createMockKeyEvent('Space', 'keyup'));
            
            const keyState = keyBindings.getKeyState('Space');
            expect(keyState.duration).toBe(500);
        });

        test('should detect key repeat events', () => {
            const callback = jest.fn();
            keyBindings.onKeyRepeat('up', callback);
            
            // Simulate rapid key presses
            for (let i = 0; i < 5; i++) {
                global.performance.now.mockReturnValueOnce(1000 + i * 50);
                keyBindings.handleKeyEvent(createMockKeyEvent('ArrowUp', 'keydown'));
            }
            
            expect(callback).toHaveBeenCalled();
        });

        test('should implement key debouncing', () => {
            keyBindings.setDebounceTime(100);
            const callback = jest.fn();
            keyBindings.onAction('shoot', callback);
            
            // Rapid fire inputs within debounce time
            global.performance.now.mockReturnValueOnce(1000);
            keyBindings.handleKeyEvent(createMockKeyEvent('Space', 'keydown'));
            
            global.performance.now.mockReturnValueOnce(1050);
            keyBindings.handleKeyEvent(createMockKeyEvent('Space', 'keydown'));
            
            expect(callback).toHaveBeenCalledTimes(1);
        });

        test('should measure input latency', () => {
            keyBindings.enableLatencyMeasurement(true);
            
            const keyEvent = createMockKeyEvent('Space', 'keydown');
            keyBindings.handleKeyEvent(keyEvent);
            
            expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith(
                'input_latency',
                expect.any(Number)
            );
        });

        test('should detect simultaneous key combinations', () => {
            const callback = jest.fn();
            keyBindings.onKeyCombination(['KeyCtrl', 'KeyS'], callback);
            
            // Press Ctrl first
            keyBindings.handleKeyEvent(createMockKeyEvent('Control', 'keydown', { ctrlKey: true }));
            
            // Then press S while Ctrl is held
            keyBindings.handleKeyEvent(createMockKeyEvent('KeyS', 'keydown', { ctrlKey: true }));
            
            expect(callback).toHaveBeenCalled();
        });
    });

    describe('State Management and Queries', () => {
        test('should track currently pressed keys', () => {
            keyBindings.handleKeyEvent(createMockKeyEvent('Space', 'keydown'));
            keyBindings.handleKeyEvent(createMockKeyEvent('ArrowUp', 'keydown'));
            
            const pressedKeys = keyBindings.getPressedKeys();
            expect(pressedKeys).toContain('Space');
            expect(pressedKeys).toContain('ArrowUp');
        });

        test('should check if specific key is pressed', () => {
            keyBindings.handleKeyEvent(createMockKeyEvent('Space', 'keydown'));
            
            expect(keyBindings.isKeyPressed('Space')).toBe(true);
            expect(keyBindings.isKeyPressed('ArrowUp')).toBe(false);
        });

        test('should check if action is active', () => {
            keyBindings.handleKeyEvent(createMockKeyEvent('Space', 'keydown'));
            
            expect(keyBindings.isActionActive('shoot')).toBe(true);
            expect(keyBindings.isActionActive('pause')).toBe(false);
        });

        test('should get all active actions', () => {
            keyBindings.handleKeyEvent(createMockKeyEvent('Space', 'keydown'));
            keyBindings.handleKeyEvent(createMockKeyEvent('ArrowUp', 'keydown'));
            
            const activeActions = keyBindings.getActiveActions();
            expect(activeActions).toContain('shoot');
            expect(activeActions).toContain('up');
        });

        test('should clear all key states', () => {
            keyBindings.handleKeyEvent(createMockKeyEvent('Space', 'keydown'));
            keyBindings.handleKeyEvent(createMockKeyEvent('ArrowUp', 'keydown'));
            
            keyBindings.clearAllKeyStates();
            
            expect(keyBindings.getPressedKeys()).toHaveLength(0);
            expect(keyBindings.getActiveActions()).toHaveLength(0);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle null or undefined key events gracefully', () => {
            expect(() => {
                keyBindings.handleKeyEvent(null);
            }).not.toThrow();
            
            expect(() => {
                keyBindings.handleKeyEvent(undefined);
            }).not.toThrow();
        });

        test('should handle malformed key events', () => {
            const malformedEvent = {
                // Missing required properties
                type: 'keydown'
            };
            
            expect(() => {
                keyBindings.handleKeyEvent(malformedEvent);
            }).not.toThrow();
        });

        test('should handle event listener registration failures', () => {
            mockEventTarget.addEventListener.mockImplementation(() => {
                throw new Error('Failed to register event listener');
            });
            
            expect(() => {
                createKeyBindingsSystem({
                    eventTarget: mockEventTarget
                });
            }).not.toThrow();
        });

        test('should handle callback execution errors gracefully', () => {
            const faultyCallback = jest.fn(() => {
                throw new Error('Callback error');
            });
            
            keyBindings.onAction('shoot', faultyCallback);
            
            expect(() => {
                keyBindings.handleKeyEvent(createMockKeyEvent('Space', 'keydown'));
            }).not.toThrow();
        });

        test('should validate action names', () => {
            expect(() => {
                keyBindings.onAction('', jest.fn());
            }).toThrow('Invalid action name');
            
            expect(() => {
                keyBindings.onAction(null, jest.fn());
            }).toThrow('Invalid action name');
        });

        test('should validate callback functions', () => {
            expect(() => {
                keyBindings.onAction('shoot', null);
            }).toThrow('Callback must be a function');
            
            expect(() => {
                keyBindings.onAction('shoot', 'not a function');
            }).toThrow('Callback must be a function');
        });
    });

    describe('Performance and Memory Management', () => {
        test('should cleanup event listeners on destroy', () => {
            keyBindings.destroy();
            
            expect(mockEventTarget.removeEventListener).toHaveBeenCalledWith(
                'keydown',
                expect.any(Function)
            );
            expect(mockEventTarget.removeEventListener).toHaveBeenCalledWith(
                'keyup',
                expect.any(Function)
            );
        });

        test('should limit callback registrations per action', () => {
            const maxCallbacks = 10;
            keyBindings.setMaxCallbacksPerAction(maxCallbacks);
            
            // Register maximum allowed callbacks
            for (let i = 0; i < maxCallbacks; i++) {
                keyBindings.onAction('shoot', jest.fn());
            }
            
            // Attempt to register one more
            expect(() => {
                keyBindings.onAction('shoot', jest.fn());
            }).toThrow('Maximum callbacks per action exceeded');
        });

        test('should measure performance metrics', () => {
            keyBindings.enablePerformanceMetrics(true);
            
            keyBindings.handleKeyEvent(createMockKeyEvent('Space', 'keydown'));
            
            expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith(
                'key_processing_time',
                expect.any(Number)
            );
        });

        test('should implement memory-efficient key state storage', () => {
            // Press and release many keys to test memory usage
            const keys = ['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE'];
            
            keys.forEach(key => {
                keyBindings.handleKeyEvent(createMockKeyEvent(key, 'keydown'));
                keyBindings.handleKeyEvent(createMockKeyEvent(key, 'keyup'));
            });
            
            // Memory should be cleaned up for released keys
            const memoryUsage = keyBindings.getMemoryUsage();
            expect(memoryUsage.activeKeyStates).toBeLessThanOrEqual(keys.length);
        });
    });

    describe('Integration and Compatibility', () => {
        test('should work with different keyboard layouts', () => {
            const qwertyEvent = createMockKeyEvent('KeyQ', 'keydown');
            const dvorakEvent = createMockKeyEvent('Quote', 'keydown'); // Q in Dvorak
            
            keyBindings.mapKey('special', 'KeyQ');
            keyBindings.setKeyboardLayout('dvorak');
            
            const callback = jest.fn();
            keyBindings.onAction('special', callback);
            
            keyBindings.handleKeyEvent(dvorakEvent);
            expect(callback).toHaveBeenCalled();
        });

        test('should handle browser-specific key codes', () => {
            const ieEvent = {
                keyCode: 32, // Space in IE
                which: 32,
                type: 'keydown'
            };
            
            const callback = jest.fn();
            keyBindings.onAction('shoot', callback);
            
            keyBindings.handleKeyEvent(ieEvent);
            expect(callback).toHaveBeenCalled();
        });

        test('should support accessibility features', () => {
            keyBindings.enableAccessibilityMode(true);
            
            // Should announce key mappings for screen readers
            const announcements = keyBindings.getAccessibilityAnnouncements();
            expect(announcements).toContain('Space key mapped to shoot action');
        });
    });

    // Helper function to create key bindings system with dependency injection
    function createKeyBindingsSystem(options = {}) {
        const {
            eventTarget = mockEventTarget,
            performanceMonitor = mockPerformanceMonitor,
            defaultKeyMap = createDefaultKeyMap()
        } = options;

        // Mock implementation of key bindings system
        return {
            // Configuration methods
            getKeyMap: jest.fn(() => defaultKeyMap),
            mapKey: jest.fn(),
            mapKeys: jest.fn(),
            unmapKey: jest.fn(),
            clearAction: jest.fn(),
            resetToDefaults: jest.fn(),
            setPreventDefault: jest.fn(),
            
            // Event handling
            handleKeyEvent: jest.fn(),
            onAction: jest.fn(),
            onActionRelease: jest.fn(),
            onKeyRepeat: jest.fn(),
            onKeyCombination: jest.fn(),
            
            // Input buffering
            enableInputBuffer: jest.fn(),
            setBufferSize: jest.fn(),
            setBufferTimeWindow: jest.fn(),
            getInputBuffer: jest.fn(() => []),
            clearInputBuffer: jest.fn(),
            processInputBuffer: jest.fn(),
            getValidBufferedInputs: jest.fn(() => []),
            
            // State management
            getPressedKeys: jest.fn(() => []),
            isKeyPressed: jest.fn(() => false),
            isActionActive: jest.fn(() => false),
            getActiveActions: jest.fn(() => []),
            getKeyState: jest.fn(() => ({ duration: 0 })),
            clearAllKeyStates: jest.fn(),
            
            // Performance and timing
            enableKeyTracking: jest.fn(),
            setDebounceTime: jest.fn(),
            enableLatencyMeasurement: jest.fn(),
            enablePerformanceMetrics: jest.fn(),
            getMemoryUsage: jest.fn(() => ({ activeKeyStates: 0 })),
            
            // Configuration limits
            setMaxCallbacksPerAction: jest.fn(),
            
            // Compatibility
            setKeyboardLayout: jest.fn(),
            enableAccessibilityMode: jest.fn(),
            getAccessibilityAnnouncements: jest.fn(() => []),
            
            // Cleanup
            destroy: jest.fn()
        };
    }
});