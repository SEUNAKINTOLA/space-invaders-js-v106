/**
 * Comprehensive test suite for input manager functionality
 * Tests keyboard input handling, key mapping, input buffering, and responsive controls
 * 
 * @fileoverview Input Manager Test Suite
 * @version 1.0.0
 * @author Space Invaders JS Team
 * @since 2025-01-27
 */

describe('InputManager', () => {
    let inputManager;
    let mockCanvas;
    let mockGameEngine;
    let mockEventTarget;

    // Test data builders for complex scenarios
    const createMockKeyEvent = (type, key, code, options = {}) => ({
        type,
        key,
        code,
        ctrlKey: options.ctrlKey || false,
        shiftKey: options.shiftKey || false,
        altKey: options.altKey || false,
        metaKey: options.metaKey || false,
        repeat: options.repeat || false,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: mockEventTarget,
        timeStamp: Date.now(),
        ...options
    });

    const createMockTouchEvent = (type, touches = [], options = {}) => ({
        type,
        touches: touches.map(touch => ({
            identifier: touch.id || 0,
            clientX: touch.x || 0,
            clientY: touch.y || 0,
            pageX: touch.x || 0,
            pageY: touch.y || 0,
            target: mockCanvas,
            ...touch
        })),
        changedTouches: touches.map(touch => ({
            identifier: touch.id || 0,
            clientX: touch.x || 0,
            clientY: touch.y || 0,
            pageX: touch.x || 0,
            pageY: touch.y || 0,
            target: mockCanvas,
            ...touch
        })),
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: mockCanvas,
        timeStamp: Date.now(),
        ...options
    });

    beforeEach(() => {
        // Reset DOM and create fresh mocks
        document.body.innerHTML = '';
        
        mockCanvas = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            getBoundingClientRect: jest.fn(() => ({
                left: 0,
                top: 0,
                width: 800,
                height: 600
            })),
            focus: jest.fn(),
            tabIndex: 0
        };

        mockGameEngine = {
            handleInput: jest.fn(),
            isRunning: jest.fn(() => true),
            isPaused: jest.fn(() => false),
            getState: jest.fn(() => 'playing'),
            emit: jest.fn()
        };

        mockEventTarget = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };

        // Mock global objects
        global.window = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            requestAnimationFrame: jest.fn(cb => setTimeout(cb, 16)),
            cancelAnimationFrame: jest.fn(),
            performance: {
                now: jest.fn(() => Date.now())
            }
        };

        global.document = {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            activeElement: mockCanvas,
            body: mockEventTarget
        };

        // Create InputManager instance with dependency injection
        inputManager = createInputManager(mockCanvas, mockGameEngine);
    });

    afterEach(() => {
        if (inputManager && typeof inputManager.destroy === 'function') {
            inputManager.destroy();
        }
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    describe('Initialization and Setup', () => {
        test('should initialize with default configuration', () => {
            expect(inputManager).toBeDefined();
            expect(inputManager.isEnabled()).toBe(true);
            expect(inputManager.getKeyMappings()).toBeDefined();
            expect(inputManager.getInputBuffer()).toBeDefined();
        });

        test('should register event listeners on canvas and document', () => {
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
            expect(global.document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
            expect(global.document.addEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
        });

        test('should handle missing canvas gracefully', () => {
            expect(() => createInputManager(null, mockGameEngine)).not.toThrow();
            const nullInputManager = createInputManager(null, mockGameEngine);
            expect(nullInputManager.isEnabled()).toBe(false);
        });

        test('should validate game engine dependency', () => {
            expect(() => createInputManager(mockCanvas, null)).toThrow('GameEngine is required');
        });
    });

    describe('Key Mapping System', () => {
        test('should have default key mappings for player actions', () => {
            const mappings = inputManager.getKeyMappings();
            
            expect(mappings.moveLeft).toContain('ArrowLeft');
            expect(mappings.moveLeft).toContain('KeyA');
            expect(mappings.moveRight).toContain('ArrowRight');
            expect(mappings.moveRight).toContain('KeyD');
            expect(mappings.shoot).toContain('Space');
            expect(mappings.pause).toContain('Escape');
        });

        test('should allow custom key mapping configuration', () => {
            const customMappings = {
                moveLeft: ['KeyQ'],
                moveRight: ['KeyE'],
                shoot: ['KeyF'],
                pause: ['KeyP']
            };

            inputManager.setKeyMappings(customMappings);
            const updatedMappings = inputManager.getKeyMappings();

            expect(updatedMappings.moveLeft).toEqual(['KeyQ']);
            expect(updatedMappings.moveRight).toEqual(['KeyE']);
            expect(updatedMappings.shoot).toEqual(['KeyF']);
            expect(updatedMappings.pause).toEqual(['KeyP']);
        });

        test('should validate key mapping format', () => {
            expect(() => {
                inputManager.setKeyMappings({ invalidAction: 'not-an-array' });
            }).toThrow('Key mappings must be arrays');

            expect(() => {
                inputManager.setKeyMappings({ moveLeft: [''] });
            }).toThrow('Key codes cannot be empty');
        });

        test('should support multiple keys per action', () => {
            const mappings = {
                moveLeft: ['ArrowLeft', 'KeyA', 'KeyQ'],
                shoot: ['Space', 'Enter', 'KeyX']
            };

            inputManager.setKeyMappings(mappings);
            
            // Test that all mapped keys trigger the action
            const leftArrowEvent = createMockKeyEvent('keydown', 'ArrowLeft', 'ArrowLeft');
            const aKeyEvent = createMockKeyEvent('keydown', 'a', 'KeyA');
            const qKeyEvent = createMockKeyEvent('keydown', 'q', 'KeyQ');

            inputManager.handleKeyDown(leftArrowEvent);
            inputManager.handleKeyDown(aKeyEvent);
            inputManager.handleKeyDown(qKeyEvent);

            expect(inputManager.isActionPressed('moveLeft')).toBe(true);
        });
    });

    describe('Input State Management', () => {
        test('should track key press and release states', () => {
            const keyDownEvent = createMockKeyEvent('keydown', 'ArrowLeft', 'ArrowLeft');
            const keyUpEvent = createMockKeyEvent('keyup', 'ArrowLeft', 'ArrowLeft');

            expect(inputManager.isKeyPressed('ArrowLeft')).toBe(false);

            inputManager.handleKeyDown(keyDownEvent);
            expect(inputManager.isKeyPressed('ArrowLeft')).toBe(true);

            inputManager.handleKeyUp(keyUpEvent);
            expect(inputManager.isKeyPressed('ArrowLeft')).toBe(false);
        });

        test('should track action states based on key mappings', () => {
            const leftKeyEvent = createMockKeyEvent('keydown', 'ArrowLeft', 'ArrowLeft');
            const shootKeyEvent = createMockKeyEvent('keydown', ' ', 'Space');

            inputManager.handleKeyDown(leftKeyEvent);
            inputManager.handleKeyDown(shootKeyEvent);

            expect(inputManager.isActionPressed('moveLeft')).toBe(true);
            expect(inputManager.isActionPressed('shoot')).toBe(true);
            expect(inputManager.isActionPressed('moveRight')).toBe(false);
        });

        test('should handle key repeat events appropriately', () => {
            const repeatEvent = createMockKeyEvent('keydown', 'ArrowLeft', 'ArrowLeft', { repeat: true });
            
            inputManager.handleKeyDown(repeatEvent);
            
            // Should not trigger multiple press states for repeat events
            expect(inputManager.getInputBuffer().length).toBe(0);
        });

        test('should prevent default behavior for game keys', () => {
            const gameKeyEvent = createMockKeyEvent('keydown', ' ', 'Space');
            
            inputManager.handleKeyDown(gameKeyEvent);
            
            expect(gameKeyEvent.preventDefault).toHaveBeenCalled();
            expect(gameKeyEvent.stopPropagation).toHaveBeenCalled();
        });
    });

    describe('Input Buffering System', () => {
        test('should buffer input events with timestamps', () => {
            const keyEvent = createMockKeyEvent('keydown', ' ', 'Space');
            
            inputManager.handleKeyDown(keyEvent);
            
            const buffer = inputManager.getInputBuffer();
            expect(buffer.length).toBe(1);
            expect(buffer[0]).toMatchObject({
                action: 'shoot',
                type: 'keydown',
                timestamp: expect.any(Number),
                key: 'Space'
            });
        });

        test('should maintain buffer size limit', () => {
            const maxBufferSize = 10;
            inputManager.setBufferSize(maxBufferSize);

            // Add more events than buffer size
            for (let i = 0; i < maxBufferSize + 5; i++) {
                const keyEvent = createMockKeyEvent('keydown', ' ', 'Space');
                inputManager.handleKeyDown(keyEvent);
            }

            const buffer = inputManager.getInputBuffer();
            expect(buffer.length).toBe(maxBufferSize);
        });

        test('should clear buffer when requested', () => {
            const keyEvent = createMockKeyEvent('keydown', ' ', 'Space');
            inputManager.handleKeyDown(keyEvent);
            
            expect(inputManager.getInputBuffer().length).toBe(1);
            
            inputManager.clearInputBuffer();
            expect(inputManager.getInputBuffer().length).toBe(0);
        });

        test('should process buffered inputs in order', () => {
            const events = [
                createMockKeyEvent('keydown', 'ArrowLeft', 'ArrowLeft'),
                createMockKeyEvent('keydown', ' ', 'Space'),
                createMockKeyEvent('keyup', 'ArrowLeft', 'ArrowLeft')
            ];

            events.forEach(event => {
                if (event.type === 'keydown') {
                    inputManager.handleKeyDown(event);
                } else {
                    inputManager.handleKeyUp(event);
                }
            });

            const buffer = inputManager.getInputBuffer();
            expect(buffer[0].action).toBe('moveLeft');
            expect(buffer[1].action).toBe('shoot');
        });
    });

    describe('Responsive Controls', () => {
        test('should handle rapid key presses without dropping inputs', () => {
            const rapidEvents = Array.from({ length: 20 }, (_, i) => 
                createMockKeyEvent('keydown', ' ', 'Space', { timeStamp: Date.now() + i })
            );

            rapidEvents.forEach(event => inputManager.handleKeyDown(event));

            // Should handle all events (though some may be filtered as repeats)
            expect(inputManager.getInputBuffer().length).toBeGreaterThan(0);
        });

        test('should debounce rapid identical inputs', () => {
            const debounceTime = 50; // ms
            inputManager.setDebounceTime(debounceTime);

            const event1 = createMockKeyEvent('keydown', ' ', 'Space');
            const event2 = createMockKeyEvent('keydown', ' ', 'Space');

            inputManager.handleKeyDown(event1);
            inputManager.handleKeyDown(event2); // Should be debounced

            expect(inputManager.getInputBuffer().length).toBe(1);
        });

        test('should handle simultaneous key combinations', () => {
            const ctrlEvent = createMockKeyEvent('keydown', 'Control', 'ControlLeft');
            const shiftEvent = createMockKeyEvent('keydown', 'Shift', 'ShiftLeft');
            const keyEvent = createMockKeyEvent('keydown', 'r', 'KeyR', { 
                ctrlKey: true, 
                shiftKey: true 
            });

            inputManager.handleKeyDown(ctrlEvent);
            inputManager.handleKeyDown(shiftEvent);
            inputManager.handleKeyDown(keyEvent);

            expect(inputManager.isKeyPressed('ControlLeft')).toBe(true);
            expect(inputManager.isKeyPressed('ShiftLeft')).toBe(true);
            expect(inputManager.isKeyPressed('KeyR')).toBe(true);
        });

        test('should maintain input responsiveness under load', async () => {
            const startTime = performance.now();
            const inputCount = 1000;

            // Simulate high-frequency input
            for (let i = 0; i < inputCount; i++) {
                const event = createMockKeyEvent('keydown', ' ', 'Space');
                inputManager.handleKeyDown(event);
            }

            const endTime = performance.now();
            const processingTime = endTime - startTime;

            // Should process inputs quickly (less than 100ms for 1000 inputs)
            expect(processingTime).toBeLessThan(100);
        });
    });

    describe('Touch Input Support', () => {
        test('should handle touch events for mobile compatibility', () => {
            const touchEvent = createMockTouchEvent('touchstart', [
                { id: 0, x: 100, y: 300 }
            ]);

            inputManager.handleTouchStart(touchEvent);

            expect(touchEvent.preventDefault).toHaveBeenCalled();
        });

        test('should convert touch positions to canvas coordinates', () => {
            const touchEvent = createMockTouchEvent('touchstart', [
                { id: 0, x: 400, y: 300 }
            ]);

            inputManager.handleTouchStart(touchEvent);

            const touchState = inputManager.getTouchState();
            expect(touchState.touches).toHaveLength(1);
            expect(touchState.touches[0]).toMatchObject({
                id: 0,
                x: expect.any(Number),
                y: expect.any(Number)
            });
        });

        test('should support multi-touch gestures', () => {
            const multiTouchEvent = createMockTouchEvent('touchstart', [
                { id: 0, x: 200, y: 300 },
                { id: 1, x: 600, y: 300 }
            ]);

            inputManager.handleTouchStart(multiTouchEvent);

            const touchState = inputManager.getTouchState();
            expect(touchState.touches).toHaveLength(2);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle invalid key events gracefully', () => {
            const invalidEvent = { type: 'keydown' }; // Missing required properties

            expect(() => inputManager.handleKeyDown(invalidEvent)).not.toThrow();
        });

        test('should handle disabled state correctly', () => {
            inputManager.disable();

            const keyEvent = createMockKeyEvent('keydown', ' ', 'Space');
            inputManager.handleKeyDown(keyEvent);

            expect(inputManager.isActionPressed('shoot')).toBe(false);
            expect(inputManager.getInputBuffer().length).toBe(0);
        });

        test('should clean up event listeners on destroy', () => {
            inputManager.destroy();

            expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
            expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
            expect(global.document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
            expect(global.document.removeEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
        });

        test('should handle focus loss and regain', () => {
            const blurEvent = { type: 'blur' };
            const focusEvent = { type: 'focus' };

            inputManager.handleBlur(blurEvent);
            expect(inputManager.isEnabled()).toBe(false);

            inputManager.handleFocus(focusEvent);
            expect(inputManager.isEnabled()).toBe(true);
        });
    });

    describe('Performance and Memory Management', () => {
        test('should not leak memory with repeated input events', () => {
            const initialBufferSize = inputManager.getInputBuffer().length;

            // Simulate extended gameplay session
            for (let i = 0; i < 10000; i++) {
                const event = createMockKeyEvent('keydown', ' ', 'Space');
                inputManager.handleKeyDown(event);
                
                if (i % 100 === 0) {
                    inputManager.clearInputBuffer();
                }
            }

            // Buffer should not grow indefinitely
            expect(inputManager.getInputBuffer().length).toBeLessThan(100);
        });

        test('should optimize frequent state queries', () => {
            const keyEvent = createMockKeyEvent('keydown', 'ArrowLeft', 'ArrowLeft');
            inputManager.handleKeyDown(keyEvent);

            const startTime = performance.now();
            
            // Perform many state queries
            for (let i = 0; i < 10000; i++) {
                inputManager.isActionPressed('moveLeft');
                inputManager.isKeyPressed('ArrowLeft');
            }

            const endTime = performance.now();
            const queryTime = endTime - startTime;

            // State queries should be fast (less than 10ms for 10k queries)
            expect(queryTime).toBeLessThan(10);
        });
    });

    describe('Integration with Game Engine', () => {
        test('should notify game engine of input events', () => {
            const keyEvent = createMockKeyEvent('keydown', ' ', 'Space');
            
            inputManager.handleKeyDown(keyEvent);
            
            expect(mockGameEngine.handleInput).toHaveBeenCalledWith({
                action: 'shoot',
                type: 'keydown',
                timestamp: expect.any(Number),
                key: 'Space'
            });
        });

        test('should respect game engine state for input processing', () => {
            mockGameEngine.isPaused.mockReturnValue(true);

            const keyEvent = createMockKeyEvent('keydown', 'ArrowLeft', 'ArrowLeft');
            inputManager.handleKeyDown(keyEvent);

            // Should not process movement inputs when paused
            expect(mockGameEngine.handleInput).not.toHaveBeenCalledWith(
                expect.objectContaining({ action: 'moveLeft' })
            );
        });

        test('should handle pause/unpause actions regardless of game state', () => {
            mockGameEngine.isPaused.mockReturnValue(true);

            const pauseEvent = createMockKeyEvent('keydown', 'Escape', 'Escape');
            inputManager.handleKeyDown(pauseEvent);

            // Pause action should always be processed
            expect(mockGameEngine.handleInput).toHaveBeenCalledWith(
                expect.objectContaining({ action: 'pause' })
            );
        });
    });
});

/**
 * Factory function to create InputManager instances for testing
 * Implements dependency injection pattern for better testability
 * 
 * @param {HTMLCanvasElement} canvas - Canvas element for input capture
 * @param {Object} gameEngine - Game engine instance
 * @returns {Object} InputManager instance
 */
function createInputManager(canvas, gameEngine) {
    if (!gameEngine) {
        throw new Error('GameEngine is required');
    }

    const state = {
        enabled: !!canvas,
        keyStates: new Map(),
        actionStates: new Map(),
        inputBuffer: [],
        touchStates: new Map(),
        keyMappings: {
            moveLeft: ['ArrowLeft', 'KeyA'],
            moveRight: ['ArrowRight', 'KeyD'],
            moveUp: ['ArrowUp', 'KeyW'],
            moveDown: ['ArrowDown', 'KeyS'],
            shoot: ['Space'],
            pause: ['Escape', 'KeyP'],
            restart: ['KeyR']
        },
        bufferSize: 50,
        debounceTime: 16, // ~60fps
        lastInputTime: new Map()
    };

    const eventHandlers = {
        keydown: null,
        keyup: null,
        touchstart: null,
        touchend: null,
        touchmove: null,
        blur: null,
        focus: null
    };

    // Input validation utilities
    const validateKeyEvent = (event) => {
        return event && typeof event === 'object' && event.type && event.code;
    };

    const validateTouchEvent = (event) => {
        return event && typeof event === 'object' && event.type && Array.isArray(event.touches);
    };

    // Debouncing utility
    const shouldDebounce = (key) => {
        const now = performance.now();
        const lastTime = state.lastInputTime.get(key) || 0;
        
        if (now - lastTime < state.debounceTime) {
            return true;
        }
        
        state.lastInputTime.set(key, now);
        return false;
    };

    // Buffer management
    const addToBuffer = (inputEvent) => {
        if (state.inputBuffer.length >= state.bufferSize) {
            state.inputBuffer.shift(); // Remove oldest event
        }
        
        state.inputBuffer.push({
            ...inputEvent,
            timestamp: performance.now()
        });
    };

    // Action mapping utilities
    const getActionForKey = (keyCode) => {
        for (const [action, keys] of Object.entries(state.keyMappings)) {
            if (keys.includes(keyCode)) {
                return action;
            }
        }
        return null;
    };

    const updateActionState = (action, pressed) => {
        if (action) {
            state.actionStates.set(action, pressed);
        }
    };

    // Event handler implementations
    const handleKeyDown = (event) => {
        if (!state.enabled || !validateKeyEvent(event)) {
            return;
        }

        // Ignore repeat events
        if (event.repeat) {
            return;
        }

        const keyCode = event.code;
        const action = getActionForKey(keyCode);

        // Prevent default for game keys
        if (action) {
            event.preventDefault();
            event.stopPropagation();
        }

        // Debounce rapid inputs
        if (shouldDebounce(keyCode)) {
            return;
        }

        // Update key state
        state.keyStates.set(keyCode, true);
        
        // Update action state
        updateActionState(action, true);

        // Add to buffer
        if (action) {
            const inputEvent = {
                action,
                type: 'keydown',
                key: keyCode,
                modifiers: {
                    ctrl: event.ctrlKey,
                    shift: event.shiftKey,
                    alt: event.altKey,
                    meta: event.metaKey
                }
            };

            addToBuffer(inputEvent);

            // Notify game engine (respect pause state for non-pause actions)
            if (action === 'pause' || !gameEngine.isPaused()) {
                gameEngine.handleInput(inputEvent);
            }
        }
    };

    const handleKeyUp = (event) => {
        if (!state.enabled || !validateKeyEvent(event)) {
            return;
        }

        const keyCode = event.code;
        const action = getActionForKey(keyCode);

        // Update key state
        state.keyStates.set(keyCode, false);
        
        // Update action state
        updateActionState(action, false);

        // Add to buffer
        if (action) {
            const inputEvent = {
                action,
                type: 'keyup',
                key: keyCode
            };

            addToBuffer(inputEvent);

            // Notify game engine
            if (action === 'pause' || !gameEngine.isPaused()) {
                gameEngine.handleInput(inputEvent);
            }
        }
    };

    const handleTouchStart = (event) => {
        if (!state.enabled || !validateTouchEvent(event)) {
            return;
        }

        event.preventDefault();

        Array.from(event.changedTouches).forEach(touch => {
            const canvasRect = canvas.getBoundingClientRect();
            const touchData = {
                id: touch.identifier,
                x: touch.clientX - canvasRect.left,
                y: touch.clientY - canvasRect.top,
                startTime: performance.now()
            };

            state.touchStates.set(touch.identifier, touchData);
        });
    };

    const handleTouchEnd = (event) => {
        if (!state.enabled || !validateTouchEvent(event)) {
            return;
        }

        event.preventDefault();

        Array.from(event.changedTouches).forEach(touch => {
            state.touchStates.delete(touch.identifier);
        });
    };

    const handleTouchMove = (event) => {
        if (!state.enabled || !validateTouchEvent(event)) {
            return;
        }

        event.preventDefault();

        Array.from(event.changedTouches).forEach(touch => {
            const touchData = state.touchStates.get(touch.identifier);
            if (touchData) {
                const canvasRect = canvas.getBoundingClientRect();
                touchData.x = touch.clientX - canvasRect.left;
                touchData.y = touch.clientY - canvasRect.top;
            }
        });
    };

    const handleBlur = () => {
        state.enabled = false;
        // Clear all active states
        state.keyStates.clear();
        state.actionStates.clear();
        state.touchStates.clear();
    };

    const handleFocus = () => {
        state.enabled = !!canvas;
    };

    // Initialize event listeners
    const initializeEventListeners = () => {
        if (!canvas) return;

        eventHandlers.keydown = handleKeyDown;
        eventHandlers.keyup = handleKeyUp;
        eventHandlers.touchstart = handleTouchStart;
        eventHandlers.touchend = handleTouchEnd;
        eventHandlers.touchmove = handleTouchMove;
        eventHandlers.blur = handleBlur;
        eventHandlers.focus = handleFocus;

        // Canvas events
        canvas.addEventListener('keydown', eventHandlers.keydown);
        canvas.addEventListener('keyup', eventHandlers.keyup);
        canvas.addEventListener('touchstart', eventHandlers.touchstart, { passive: false });
        canvas.addEventListener('touchend', eventHandlers.touchend, { passive: false });
        canvas.addEventListener('touchmove', eventHandlers.touchmove, { passive: false });

        // Document events for global key handling
        document.addEventListener('keydown', eventHandlers.keydown);
        document.addEventListener('keyup', eventHandlers.keyup);

        // Window events for focus management
        window.addEventListener('blur', eventHandlers.blur);
        window.addEventListener('focus', eventHandlers.focus);

        // Make canvas focusable
        canvas.tabIndex = 0;
    };

    // Public API
    const publicAPI = {
        // State queries
        isEnabled: () => state.enabled,
        isKeyPressed: (keyCode) => state.keyStates.get(keyCode) || false,
        isActionPressed: (action) => state.actionStates.get(action) || false,
        
        // Configuration
        getKeyMappings: () => ({ ...state.keyMappings }),
        setKeyMappings: (mappings) => {
            // Validate mappings format
            for (const [action, keys] of Object.entries(mappings)) {
                if (!Array.isArray(keys)) {
                    throw new Error('Key mappings must be arrays');
                }
                if (keys.some(key => !key || typeof key !== 'string')) {
                    throw new Error('Key codes cannot be empty');
                }
            }
            state.keyMappings = { ...mappings };
        },
        
        // Buffer management
        getInputBuffer: () => [...state.inputBuffer],
        clearInputBuffer: () => { state.inputBuffer.length = 0; },
        setBufferSize: (size) => { state.bufferSize = Math.max(1, size); },
        setDebounceTime: (time) => { state.debounceTime = Math.max(0, time); },
        
        // Touch state
        getTouchState: () => ({
            touches: Array.from(state.touchStates.values())
        }),
        
        // Control methods
        enable: () => { state.enabled = !!canvas; },
        disable: () => { state.enabled = false; },
        
        // Event handlers (exposed for testing)
        handleKeyDown,
        handleKeyUp,
        handleTouchStart,
        handleTouchEnd,
        handleTouchMove,
        handleBlur,
        handleFocus,
        
        // Cleanup
        destroy: () => {
            if (!canvas) return;

            // Remove all event listeners
            canvas.removeEventListener('keydown', eventHandlers.keydown);
            canvas.removeEventListener('keyup', eventHandlers.keyup);
            canvas.removeEventListener('touchstart', eventHandlers.touchstart);
            canvas.removeEventListener('touchend', eventHandlers.touchend);
            canvas.removeEventListener('touchmove', eventHandlers.touchmove);

            document.removeEventListener('keydown', eventHandlers.keydown);
            document.removeEventListener('keyup', eventHandlers.keyup);

            window.removeEventListener('blur', eventHandlers.blur);
            window.removeEventListener('focus', eventHandlers.focus);

            // Clear state
            state.keyStates.clear();
            state.actionStates.clear();
            state.touchStates.clear();
            state.inputBuffer.length = 0;
            state.lastInputTime.clear();
        }
    };

    // Initialize
    initializeEventListeners();

    return publicAPI;
}