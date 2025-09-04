/**
 * Key Bindings System for Space Invaders
 * 
 * Provides a comprehensive keyboard input system with configurable key mappings,
 * input buffering, and responsive controls for player movement and actions.
 * 
 * Key Features:
 * - Configurable key binding system with default mappings
 * - Input buffering for responsive controls
 * - Multiple key support for same action
 * - Key combination support (modifier keys)
 * - Runtime key binding changes
 * - Input validation and sanitization
 * - Performance optimized event handling
 * 
 * Architecture:
 * - Event-driven design for decoupled input handling
 * - Observer pattern for action notifications
 * - Strategy pattern for different input modes
 * - Command pattern for action execution
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025
 */

/**
 * @typedef {Object} KeyBinding
 * @property {string} action - The action name
 * @property {string[]} keys - Array of key codes that trigger this action
 * @property {string[]} [modifiers] - Optional modifier keys (ctrl, shift, alt)
 * @property {boolean} [repeatable] - Whether the action can repeat when key is held
 * @property {number} [cooldown] - Minimum time between action executions (ms)
 */

/**
 * @typedef {Object} InputEvent
 * @property {string} action - The action that was triggered
 * @property {string} key - The key that triggered the action
 * @property {boolean} pressed - Whether the key was pressed (true) or released (false)
 * @property {number} timestamp - When the event occurred
 * @property {Object} modifiers - State of modifier keys
 */

/**
 * @typedef {Object} KeyState
 * @property {boolean} pressed - Whether the key is currently pressed
 * @property {number} pressTime - When the key was first pressed
 * @property {number} lastActionTime - When the last action was executed
 * @property {boolean} repeating - Whether the key is in repeat mode
 */

/**
 * Comprehensive keyboard input system with configurable key bindings
 * and responsive control handling for Space Invaders game.
 */
class KeyBindings {
    /**
     * Default key bindings configuration
     * @type {Object<string, KeyBinding>}
     */
    static DEFAULT_BINDINGS = {
        moveLeft: {
            action: 'moveLeft',
            keys: ['ArrowLeft', 'KeyA'],
            repeatable: true,
            cooldown: 0
        },
        moveRight: {
            action: 'moveRight',
            keys: ['ArrowRight', 'KeyD'],
            repeatable: true,
            cooldown: 0
        },
        moveUp: {
            action: 'moveUp',
            keys: ['ArrowUp', 'KeyW'],
            repeatable: true,
            cooldown: 0
        },
        moveDown: {
            action: 'moveDown',
            keys: ['ArrowDown', 'KeyS'],
            repeatable: true,
            cooldown: 0
        },
        shoot: {
            action: 'shoot',
            keys: ['Space', 'Enter'],
            repeatable: true,
            cooldown: 100
        },
        pause: {
            action: 'pause',
            keys: ['Escape', 'KeyP'],
            repeatable: false,
            cooldown: 500
        },
        restart: {
            action: 'restart',
            keys: ['KeyR'],
            modifiers: ['ctrl'],
            repeatable: false,
            cooldown: 1000
        },
        fullscreen: {
            action: 'fullscreen',
            keys: ['F11', 'KeyF'],
            repeatable: false,
            cooldown: 500
        },
        mute: {
            action: 'mute',
            keys: ['KeyM'],
            repeatable: false,
            cooldown: 300
        },
        debug: {
            action: 'debug',
            keys: ['F12'],
            modifiers: ['shift'],
            repeatable: false,
            cooldown: 500
        }
    };

    /**
     * Input buffer configuration
     * @type {Object}
     */
    static BUFFER_CONFIG = {
        maxSize: 10,
        timeWindow: 100, // ms
        cleanupInterval: 50 // ms
    };

    /**
     * Performance monitoring thresholds
     * @type {Object}
     */
    static PERFORMANCE_THRESHOLDS = {
        maxEventProcessingTime: 5, // ms
        maxBufferSize: 20,
        warningEventRate: 100 // events per second
    };

    /**
     * Initialize the key bindings system
     * @param {Object} [options={}] - Configuration options
     * @param {Object<string, KeyBinding>} [options.bindings] - Custom key bindings
     * @param {boolean} [options.enableBuffering=true] - Enable input buffering
     * @param {boolean} [options.enableLogging=false] - Enable debug logging
     * @param {HTMLElement} [options.target=document] - Target element for event listeners
     */
    constructor(options = {}) {
        this.bindings = { ...KeyBindings.DEFAULT_BINDINGS, ...options.bindings };
        this.enableBuffering = options.enableBuffering !== false;
        this.enableLogging = options.enableLogging || false;
        this.target = options.target || document;

        // Internal state
        this.keyStates = new Map();
        this.actionListeners = new Map();
        this.inputBuffer = [];
        this.keyToActionMap = new Map();
        this.isActive = false;
        this.performanceMetrics = {
            eventsProcessed: 0,
            averageProcessingTime: 0,
            lastCleanup: Date.now()
        };

        // Bound methods for event listeners
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleVisibilityChange = this.handleVisibilityChange.bind(this);

        // Initialize system
        this.buildKeyMappings();
        this.setupEventListeners();
        this.startBufferCleanup();

        this.log('KeyBindings system initialized', {
            bindingsCount: Object.keys(this.bindings).length,
            bufferingEnabled: this.enableBuffering
        });
    }

    /**
     * Build reverse mapping from keys to actions for efficient lookup
     * @private
     */
    buildKeyMappings() {
        this.keyToActionMap.clear();

        for (const [actionName, binding] of Object.entries(this.bindings)) {
            if (!this.validateBinding(binding)) {
                this.log('Invalid binding detected', { actionName, binding }, 'warn');
                continue;
            }

            for (const key of binding.keys) {
                if (!this.keyToActionMap.has(key)) {
                    this.keyToActionMap.set(key, []);
                }
                this.keyToActionMap.get(key).push(actionName);
            }
        }

        this.log('Key mappings built', {
            totalMappings: this.keyToActionMap.size,
            actions: Object.keys(this.bindings)
        });
    }

    /**
     * Validate a key binding configuration
     * @param {KeyBinding} binding - The binding to validate
     * @returns {boolean} Whether the binding is valid
     * @private
     */
    validateBinding(binding) {
        if (!binding || typeof binding !== 'object') {
            return false;
        }

        if (!binding.action || typeof binding.action !== 'string') {
            return false;
        }

        if (!Array.isArray(binding.keys) || binding.keys.length === 0) {
            return false;
        }

        // Validate key codes
        for (const key of binding.keys) {
            if (typeof key !== 'string' || key.length === 0) {
                return false;
            }
        }

        // Validate modifiers if present
        if (binding.modifiers && !Array.isArray(binding.modifiers)) {
            return false;
        }

        // Validate cooldown if present
        if (binding.cooldown !== undefined && 
            (typeof binding.cooldown !== 'number' || binding.cooldown < 0)) {
            return false;
        }

        return true;
    }

    /**
     * Setup keyboard event listeners
     * @private
     */
    setupEventListeners() {
        this.target.addEventListener('keydown', this.handleKeyDown, { passive: false });
        this.target.addEventListener('keyup', this.handleKeyUp, { passive: false });
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        // Prevent context menu on right-click to avoid interfering with game controls
        this.target.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });

        this.isActive = true;
        this.log('Event listeners setup complete');
    }

    /**
     * Handle keydown events
     * @param {KeyboardEvent} event - The keyboard event
     * @private
     */
    handleKeyDown(event) {
        if (!this.isActive) return;

        const startTime = performance.now();
        const key = event.code;
        const modifiers = this.getModifierState(event);

        try {
            // Update key state
            this.updateKeyState(key, true, modifiers);

            // Find matching actions
            const actions = this.getActionsForKey(key, modifiers);

            // Process each action
            for (const actionName of actions) {
                const binding = this.bindings[actionName];
                if (this.shouldExecuteAction(actionName, binding)) {
                    this.executeAction(actionName, key, true, modifiers);
                    
                    // Prevent default browser behavior for game keys
                    if (this.shouldPreventDefault(key)) {
                        event.preventDefault();
                    }
                }
            }

            // Add to input buffer if enabled
            if (this.enableBuffering && actions.length > 0) {
                this.addToBuffer(actions[0], key, true, modifiers);
            }

        } catch (error) {
            this.log('Error processing keydown event', { key, error: error.message }, 'error');
        } finally {
            this.updatePerformanceMetrics(performance.now() - startTime);
        }
    }

    /**
     * Handle keyup events
     * @param {KeyboardEvent} event - The keyboard event
     * @private
     */
    handleKeyUp(event) {
        if (!this.isActive) return;

        const startTime = performance.now();
        const key = event.code;
        const modifiers = this.getModifierState(event);

        try {
            // Update key state
            this.updateKeyState(key, false, modifiers);

            // Find matching actions
            const actions = this.getActionsForKey(key, modifiers);

            // Process each action
            for (const actionName of actions) {
                this.executeAction(actionName, key, false, modifiers);
            }

            // Add to input buffer if enabled
            if (this.enableBuffering && actions.length > 0) {
                this.addToBuffer(actions[0], key, false, modifiers);
            }

        } catch (error) {
            this.log('Error processing keyup event', { key, error: error.message }, 'error');
        } finally {
            this.updatePerformanceMetrics(performance.now() - startTime);
        }
    }

    /**
     * Handle visibility change events to pause input when tab is not active
     * @private
     */
    handleVisibilityChange() {
        if (document.hidden) {
            this.clearAllKeyStates();
            this.log('Tab hidden - clearing all key states');
        }
    }

    /**
     * Get current modifier key state
     * @param {KeyboardEvent} event - The keyboard event
     * @returns {Object} Modifier state object
     * @private
     */
    getModifierState(event) {
        return {
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
            meta: event.metaKey
        };
    }

    /**
     * Update the state of a specific key
     * @param {string} key - The key code
     * @param {boolean} pressed - Whether the key is pressed
     * @param {Object} modifiers - Current modifier state
     * @private
     */
    updateKeyState(key, pressed, modifiers) {
        if (!this.keyStates.has(key)) {
            this.keyStates.set(key, {
                pressed: false,
                pressTime: 0,
                lastActionTime: 0,
                repeating: false
            });
        }

        const state = this.keyStates.get(key);
        const now = Date.now();

        if (pressed && !state.pressed) {
            // Key just pressed
            state.pressed = true;
            state.pressTime = now;
            state.repeating = false;
        } else if (!pressed && state.pressed) {
            // Key just released
            state.pressed = false;
            state.repeating = false;
        }
    }

    /**
     * Get actions that should be triggered for a given key and modifier combination
     * @param {string} key - The key code
     * @param {Object} modifiers - Current modifier state
     * @returns {string[]} Array of action names
     * @private
     */
    getActionsForKey(key, modifiers) {
        const potentialActions = this.keyToActionMap.get(key) || [];
        const matchingActions = [];

        for (const actionName of potentialActions) {
            const binding = this.bindings[actionName];
            if (this.modifiersMatch(binding.modifiers, modifiers)) {
                matchingActions.push(actionName);
            }
        }

        return matchingActions;
    }

    /**
     * Check if modifier requirements match current modifier state
     * @param {string[]} [requiredModifiers] - Required modifier keys
     * @param {Object} currentModifiers - Current modifier state
     * @returns {boolean} Whether modifiers match
     * @private
     */
    modifiersMatch(requiredModifiers, currentModifiers) {
        if (!requiredModifiers || requiredModifiers.length === 0) {
            // No modifiers required - check that none are pressed
            return !currentModifiers.ctrl && !currentModifiers.shift && 
                   !currentModifiers.alt && !currentModifiers.meta;
        }

        // Check each required modifier
        for (const modifier of requiredModifiers) {
            if (!currentModifiers[modifier]) {
                return false;
            }
        }

        // Check that no unrequired modifiers are pressed
        const allowedModifiers = new Set(requiredModifiers);
        for (const [modifier, pressed] of Object.entries(currentModifiers)) {
            if (pressed && !allowedModifiers.has(modifier)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Determine if an action should be executed based on timing and repeat settings
     * @param {string} actionName - The action name
     * @param {KeyBinding} binding - The key binding configuration
     * @returns {boolean} Whether the action should execute
     * @private
     */
    shouldExecuteAction(actionName, binding) {
        const key = binding.keys[0]; // Use first key for state lookup
        const state = this.keyStates.get(key);
        
        if (!state || !state.pressed) {
            return false;
        }

        const now = Date.now();

        // Check cooldown
        if (binding.cooldown && (now - state.lastActionTime) < binding.cooldown) {
            return false;
        }

        // Check if action is repeatable
        if (!binding.repeatable && state.repeating) {
            return false;
        }

        return true;
    }

    /**
     * Execute an action and notify listeners
     * @param {string} actionName - The action to execute
     * @param {string} key - The key that triggered the action
     * @param {boolean} pressed - Whether this is a press or release event
     * @param {Object} modifiers - Current modifier state
     * @private
     */
    executeAction(actionName, key, pressed, modifiers) {
        const now = Date.now();
        const binding = this.bindings[actionName];

        // Update action timing
        const state = this.keyStates.get(key);
        if (state && pressed) {
            state.lastActionTime = now;
            state.repeating = true;
        }

        // Create input event
        const inputEvent = {
            action: actionName,
            key: key,
            pressed: pressed,
            timestamp: now,
            modifiers: { ...modifiers }
        };

        // Notify listeners
        this.notifyListeners(actionName, inputEvent);

        this.log('Action executed', {
            action: actionName,
            key: key,
            pressed: pressed
        });
    }

    /**
     * Notify all listeners for a specific action
     * @param {string} actionName - The action name
     * @param {InputEvent} inputEvent - The input event data
     * @private
     */
    notifyListeners(actionName, inputEvent) {
        const listeners = this.actionListeners.get(actionName) || [];
        
        for (const listener of listeners) {
            try {
                listener(inputEvent);
            } catch (error) {
                this.log('Error in action listener', {
                    action: actionName,
                    error: error.message
                }, 'error');
            }
        }
    }

    /**
     * Add input event to buffer for processing
     * @param {string} actionName - The action name
     * @param {string} key - The key code
     * @param {boolean} pressed - Whether key was pressed
     * @param {Object} modifiers - Modifier state
     * @private
     */
    addToBuffer(actionName, key, pressed, modifiers) {
        const event = {
            action: actionName,
            key: key,
            pressed: pressed,
            timestamp: Date.now(),
            modifiers: { ...modifiers }
        };

        this.inputBuffer.push(event);

        // Limit buffer size
        if (this.inputBuffer.length > KeyBindings.BUFFER_CONFIG.maxSize) {
            this.inputBuffer.shift();
        }
    }

    /**
     * Determine if default browser behavior should be prevented for a key
     * @param {string} key - The key code
     * @returns {boolean} Whether to prevent default
     * @private
     */
    shouldPreventDefault(key) {
        const gameKeys = [
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'Space', 'Enter', 'Escape'
        ];
        return gameKeys.includes(key);
    }

    /**
     * Start periodic cleanup of input buffer
     * @private
     */
    startBufferCleanup() {
        setInterval(() => {
            this.cleanupBuffer();
            this.performanceMetrics.lastCleanup = Date.now();
        }, KeyBindings.BUFFER_CONFIG.cleanupInterval);
    }

    /**
     * Clean up old entries from input buffer
     * @private
     */
    cleanupBuffer() {
        const now = Date.now();
        const timeWindow = KeyBindings.BUFFER_CONFIG.timeWindow;

        this.inputBuffer = this.inputBuffer.filter(event => 
            (now - event.timestamp) <= timeWindow
        );
    }

    /**
     * Update performance metrics
     * @param {number} processingTime - Time taken to process event (ms)
     * @private
     */
    updatePerformanceMetrics(processingTime) {
        this.performanceMetrics.eventsProcessed++;
        
        // Update average processing time
        const count = this.performanceMetrics.eventsProcessed;
        const currentAvg = this.performanceMetrics.averageProcessingTime;
        this.performanceMetrics.averageProcessingTime = 
            (currentAvg * (count - 1) + processingTime) / count;

        // Check performance thresholds
        if (processingTime > KeyBindings.PERFORMANCE_THRESHOLDS.maxEventProcessingTime) {
            this.log('Slow event processing detected', {
                processingTime: processingTime,
                threshold: KeyBindings.PERFORMANCE_THRESHOLDS.maxEventProcessingTime
            }, 'warn');
        }
    }

    /**
     * Clear all key states (useful when losing focus)
     * @private
     */
    clearAllKeyStates() {
        for (const state of this.keyStates.values()) {
            state.pressed = false;
            state.repeating = false;
        }
    }

    /**
     * Register a listener for a specific action
     * @param {string} actionName - The action to listen for
     * @param {Function} callback - The callback function to execute
     * @throws {Error} If actionName is invalid or callback is not a function
     */
    on(actionName, callback) {
        if (typeof actionName !== 'string' || actionName.length === 0) {
            throw new Error('Action name must be a non-empty string');
        }

        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        if (!this.actionListeners.has(actionName)) {
            this.actionListeners.set(actionName, []);
        }

        this.actionListeners.get(actionName).push(callback);

        this.log('Action listener registered', { action: actionName });
    }

    /**
     * Remove a listener for a specific action
     * @param {string} actionName - The action to stop listening for
     * @param {Function} [callback] - The specific callback to remove (removes all if not specified)
     */
    off(actionName, callback) {
        if (!this.actionListeners.has(actionName)) {
            return;
        }

        const listeners = this.actionListeners.get(actionName);

        if (callback) {
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        } else {
            listeners.length = 0;
        }

        if (listeners.length === 0) {
            this.actionListeners.delete(actionName);
        }

        this.log('Action listener removed', { action: actionName });
    }

    /**
     * Check if a key is currently pressed
     * @param {string} key - The key code to check
     * @returns {boolean} Whether the key is pressed
     */
    isKeyPressed(key) {
        const state = this.keyStates.get(key);
        return state ? state.pressed : false;
    }

    /**
     * Check if an action is currently active (any of its keys are pressed)
     * @param {string} actionName - The action to check
     * @returns {boolean} Whether the action is active
     */
    isActionActive(actionName) {
        const binding = this.bindings[actionName];
        if (!binding) {
            return false;
        }

        return binding.keys.some(key => this.isKeyPressed(key));
    }

    /**
     * Get the current input buffer
     * @returns {InputEvent[]} Copy of the current input buffer
     */
    getInputBuffer() {
        return [...this.inputBuffer];
    }

    /**
     * Clear the input buffer
     */
    clearInputBuffer() {
        this.inputBuffer.length = 0;
        this.log('Input buffer cleared');
    }

    /**
     * Update key bindings at runtime
     * @param {string} actionName - The action to update
     * @param {KeyBinding} binding - The new binding configuration
     * @throws {Error} If binding is invalid
     */
    updateBinding(actionName, binding) {
        if (!this.validateBinding(binding)) {
            throw new Error(`Invalid binding configuration for action: ${actionName}`);
        }

        this.bindings[actionName] = { ...binding };
        this.buildKeyMappings();

        this.log('Key binding updated', { action: actionName, binding });
    }

    /**
     * Remove a key binding
     * @param {string} actionName - The action to remove
     */
    removeBinding(actionName) {
        if (this.bindings[actionName]) {
            delete this.bindings[actionName];
            this.buildKeyMappings();
            this.log('Key binding removed', { action: actionName });
        }
    }

    /**
     * Get all current key bindings
     * @returns {Object<string, KeyBinding>} Copy of all bindings
     */
    getBindings() {
        return JSON.parse(JSON.stringify(this.bindings));
    }

    /**
     * Reset all bindings to defaults
     */
    resetToDefaults() {
        this.bindings = { ...KeyBindings.DEFAULT_BINDINGS };
        this.buildKeyMappings();
        this.log('Key bindings reset to defaults');
    }

    /**
     * Get performance metrics
     * @returns {Object} Current performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            bufferSize: this.inputBuffer.length,
            activeKeys: Array.from(this.keyStates.entries())
                .filter(([, state]) => state.pressed)
                .map(([key]) => key)
        };
    }

    /**
     * Enable or disable the key bindings system
     * @param {boolean} active - Whether the system should be active
     */
    setActive(active) {
        this.isActive = Boolean(active);
        
        if (!this.isActive) {
            this.clearAllKeyStates();
            this.clearInputBuffer();
        }

        this.log('Key bindings system activity changed', { active: this.isActive });
    }

    /**
     * Cleanup and remove all event listeners
     */
    destroy() {
        this.target.removeEventListener('keydown', this.handleKeyDown);
        this.target.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);

        this.clearAllKeyStates();
        this.clearInputBuffer();
        this.actionListeners.clear();
        this.keyStates.clear();
        this.keyToActionMap.clear();

        this.isActive = false;

        this.log('Key bindings system destroyed');
    }

    /**
     * Log messages with optional level
     * @param {string} message - The message to log
     * @param {Object} [data] - Additional data to log
     * @param {string} [level='info'] - Log level (info, warn, error)
     * @private
     */
    log(message, data = {}, level = 'info') {
        if (!this.enableLogging) return;

        const logData = {
            timestamp: new Date().toISOString(),
            component: 'KeyBindings',
            message,
            ...data
        };

        switch (level) {
            case 'warn':
                console.warn('[KeyBindings]', message, logData);
                break;
            case 'error':
                console.error('[KeyBindings]', message, logData);
                break;
            default:
                console.log('[KeyBindings]', message, logData);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyBindings;
} else if (typeof window !== 'undefined') {
    window.KeyBindings = KeyBindings;
}