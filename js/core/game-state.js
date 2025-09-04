/**
 * Game State Management System
 * 
 * Provides a robust state machine architecture for managing game states with
 * smooth transitions, event handling, and lifecycle management. Supports
 * hierarchical states, state history, and async state operations.
 * 
 * Key Features:
 * - State machine with transition validation
 * - Event-driven state changes
 * - State history and rollback capabilities
 * - Performance monitoring and metrics
 * - Error recovery and graceful degradation
 * 
 * Architecture:
 * - Uses Strategy pattern for state implementations
 * - Observer pattern for state change notifications
 * - Command pattern for state transitions
 * - Memento pattern for state history
 * 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025
 */

/**
 * Base State Interface
 * Defines the contract that all game states must implement
 */
class GameState {
    constructor(name, config = {}) {
        this.name = name;
        this.config = {
            canPause: true,
            canResume: true,
            persistent: false,
            ...config
        };
        this.isActive = false;
        this.isPaused = false;
        this.startTime = null;
        this.pauseTime = null;
        this.totalPausedTime = 0;
    }

    /**
     * Called when entering this state
     * @param {Object} context - State context data
     * @param {GameState} previousState - The previous state
     */
    async enter(context = {}, previousState = null) {
        this.isActive = true;
        this.startTime = performance.now();
        this.onEnter(context, previousState);
    }

    /**
     * Called when exiting this state
     * @param {GameState} nextState - The next state
     */
    async exit(nextState = null) {
        this.isActive = false;
        this.onExit(nextState);
    }

    /**
     * Called every frame while state is active
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    update(deltaTime) {
        if (!this.isActive || this.isPaused) return;
        this.onUpdate(deltaTime);
    }

    /**
     * Called for rendering while state is active
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    render(ctx) {
        if (!this.isActive) return;
        this.onRender(ctx);
    }

    /**
     * Pause the state
     */
    pause() {
        if (!this.config.canPause || this.isPaused) return false;
        this.isPaused = true;
        this.pauseTime = performance.now();
        this.onPause();
        return true;
    }

    /**
     * Resume the state
     */
    resume() {
        if (!this.config.canResume || !this.isPaused) return false;
        this.isPaused = false;
        if (this.pauseTime) {
            this.totalPausedTime += performance.now() - this.pauseTime;
            this.pauseTime = null;
        }
        this.onResume();
        return true;
    }

    /**
     * Get the active time of this state (excluding paused time)
     */
    getActiveTime() {
        if (!this.startTime) return 0;
        const currentTime = performance.now();
        const totalTime = currentTime - this.startTime;
        const pausedTime = this.isPaused ? 
            (currentTime - this.pauseTime) + this.totalPausedTime :
            this.totalPausedTime;
        return totalTime - pausedTime;
    }

    // Override these methods in concrete states
    onEnter(context, previousState) {}
    onExit(nextState) {}
    onUpdate(deltaTime) {}
    onRender(ctx) {}
    onPause() {}
    onResume() {}
}

/**
 * State Transition Definition
 */
class StateTransition {
    constructor(fromState, toState, condition = null, action = null) {
        this.fromState = fromState;
        this.toState = toState;
        this.condition = condition;
        this.action = action;
        this.priority = 0;
    }

    /**
     * Check if this transition can be executed
     * @param {Object} context - Current game context
     * @returns {boolean}
     */
    canTransition(context) {
        if (typeof this.condition === 'function') {
            try {
                return this.condition(context);
            } catch (error) {
                console.error(`Transition condition error: ${error.message}`);
                return false;
            }
        }
        return this.condition !== false;
    }

    /**
     * Execute the transition action
     * @param {Object} context - Current game context
     */
    async execute(context) {
        if (typeof this.action === 'function') {
            try {
                await this.action(context);
            } catch (error) {
                console.error(`Transition action error: ${error.message}`);
            }
        }
    }
}

/**
 * Game State Manager
 * Central controller for managing game states and transitions
 */
class GameStateManager {
    constructor() {
        this.states = new Map();
        this.transitions = new Map();
        this.currentState = null;
        this.previousState = null;
        this.stateHistory = [];
        this.maxHistorySize = 10;
        this.isTransitioning = false;
        this.eventListeners = new Map();
        this.metrics = {
            stateChanges: 0,
            transitionTime: 0,
            errors: 0
        };
        
        // Performance monitoring
        this.performanceMonitor = {
            frameCount: 0,
            lastFrameTime: 0,
            averageFrameTime: 0,
            maxFrameTime: 0
        };

        // Error recovery
        this.errorRecovery = {
            maxRetries: 3,
            retryDelay: 1000,
            fallbackState: null
        };

        this.setupErrorHandling();
    }

    /**
     * Register a game state
     * @param {string} name - State name
     * @param {GameState} state - State instance
     */
    registerState(name, state) {
        if (!name || typeof name !== 'string') {
            throw new Error('State name must be a non-empty string');
        }
        
        if (!(state instanceof GameState)) {
            throw new Error('State must be an instance of GameState');
        }

        this.states.set(name, state);
        this.transitions.set(name, []);
        
        this.emit('stateRegistered', { name, state });
    }

    /**
     * Add a state transition
     * @param {string} fromState - Source state name
     * @param {string} toState - Target state name
     * @param {Function|boolean} condition - Transition condition
     * @param {Function} action - Transition action
     */
    addTransition(fromState, toState, condition = true, action = null) {
        if (!this.states.has(fromState)) {
            throw new Error(`Source state '${fromState}' not registered`);
        }
        
        if (!this.states.has(toState)) {
            throw new Error(`Target state '${toState}' not registered`);
        }

        const transition = new StateTransition(fromState, toState, condition, action);
        
        if (!this.transitions.has(fromState)) {
            this.transitions.set(fromState, []);
        }
        
        this.transitions.get(fromState).push(transition);
        
        // Sort transitions by priority
        this.transitions.get(fromState).sort((a, b) => b.priority - a.priority);
    }

    /**
     * Change to a specific state
     * @param {string} stateName - Target state name
     * @param {Object} context - State context data
     * @param {boolean} force - Force transition even if conditions aren't met
     */
    async changeState(stateName, context = {}, force = false) {
        if (this.isTransitioning) {
            console.warn('State transition already in progress');
            return false;
        }

        if (!this.states.has(stateName)) {
            throw new Error(`State '${stateName}' not registered`);
        }

        const targetState = this.states.get(stateName);
        
        // Check if transition is allowed
        if (!force && this.currentState && !this.canTransitionTo(stateName, context)) {
            console.warn(`Transition from '${this.currentState.name}' to '${stateName}' not allowed`);
            return false;
        }

        const transitionStartTime = performance.now();
        this.isTransitioning = true;

        try {
            // Execute transition
            await this.executeTransition(targetState, context);
            
            // Update metrics
            this.metrics.stateChanges++;
            this.metrics.transitionTime = performance.now() - transitionStartTime;
            
            this.emit('stateChanged', {
                from: this.previousState?.name,
                to: this.currentState.name,
                context,
                transitionTime: this.metrics.transitionTime
            });

            return true;
        } catch (error) {
            this.metrics.errors++;
            console.error(`State transition error: ${error.message}`);
            
            // Attempt error recovery
            await this.handleTransitionError(error, stateName, context);
            return false;
        } finally {
            this.isTransitioning = false;
        }
    }

    /**
     * Check if transition to target state is allowed
     * @param {string} targetStateName - Target state name
     * @param {Object} context - Current context
     * @returns {boolean}
     */
    canTransitionTo(targetStateName, context = {}) {
        if (!this.currentState) return true;
        
        const transitions = this.transitions.get(this.currentState.name) || [];
        return transitions.some(transition => 
            transition.toState === targetStateName && 
            transition.canTransition(context)
        );
    }

    /**
     * Execute state transition
     * @private
     */
    async executeTransition(targetState, context) {
        // Find and execute transition action
        if (this.currentState) {
            const transitions = this.transitions.get(this.currentState.name) || [];
            const transition = transitions.find(t => t.toState === targetState.name);
            
            if (transition) {
                await transition.execute(context);
            }
        }

        // Exit current state
        if (this.currentState) {
            await this.currentState.exit(targetState);
            this.addToHistory(this.currentState);
        }

        // Update state references
        this.previousState = this.currentState;
        this.currentState = targetState;

        // Enter new state
        await this.currentState.enter(context, this.previousState);
    }

    /**
     * Update current state
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        const frameStartTime = performance.now();
        
        try {
            if (this.currentState && !this.isTransitioning) {
                this.currentState.update(deltaTime);
            }
            
            // Check for automatic transitions
            this.checkAutomaticTransitions();
            
            // Update performance metrics
            this.updatePerformanceMetrics(frameStartTime);
        } catch (error) {
            console.error(`State update error: ${error.message}`);
            this.handleUpdateError(error);
        }
    }

    /**
     * Render current state
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        try {
            if (this.currentState && !this.isTransitioning) {
                this.currentState.render(ctx);
            }
        } catch (error) {
            console.error(`State render error: ${error.message}`);
            this.handleRenderError(error, ctx);
        }
    }

    /**
     * Pause current state
     */
    pause() {
        if (this.currentState) {
            const success = this.currentState.pause();
            if (success) {
                this.emit('statePaused', { state: this.currentState.name });
            }
            return success;
        }
        return false;
    }

    /**
     * Resume current state
     */
    resume() {
        if (this.currentState) {
            const success = this.currentState.resume();
            if (success) {
                this.emit('stateResumed', { state: this.currentState.name });
            }
            return success;
        }
        return false;
    }

    /**
     * Go back to previous state
     */
    async goBack(context = {}) {
        if (this.stateHistory.length === 0) {
            console.warn('No previous state in history');
            return false;
        }

        const previousState = this.stateHistory.pop();
        return await this.changeState(previousState.name, context, true);
    }

    /**
     * Get current state information
     */
    getCurrentStateInfo() {
        if (!this.currentState) return null;
        
        return {
            name: this.currentState.name,
            isActive: this.currentState.isActive,
            isPaused: this.currentState.isPaused,
            activeTime: this.currentState.getActiveTime(),
            config: { ...this.currentState.config }
        };
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            performance: { ...this.performanceMonitor },
            currentState: this.currentState?.name,
            historySize: this.stateHistory.length,
            registeredStates: this.states.size
        };
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback
     */
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Emit event to listeners
     * @private
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event listener error: ${error.message}`);
                }
            });
        }
    }

    /**
     * Check for automatic state transitions
     * @private
     */
    checkAutomaticTransitions() {
        if (!this.currentState || this.isTransitioning) return;
        
        const transitions = this.transitions.get(this.currentState.name) || [];
        
        for (const transition of transitions) {
            if (transition.canTransition({})) {
                this.changeState(transition.toState, {}, false);
                break;
            }
        }
    }

    /**
     * Add state to history
     * @private
     */
    addToHistory(state) {
        this.stateHistory.push({
            name: state.name,
            timestamp: Date.now(),
            activeTime: state.getActiveTime()
        });

        // Limit history size
        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
        }
    }

    /**
     * Update performance metrics
     * @private
     */
    updatePerformanceMetrics(frameStartTime) {
        const frameTime = performance.now() - frameStartTime;
        
        this.performanceMonitor.frameCount++;
        this.performanceMonitor.lastFrameTime = frameTime;
        
        // Calculate rolling average
        const alpha = 0.1; // Smoothing factor
        this.performanceMonitor.averageFrameTime = 
            this.performanceMonitor.averageFrameTime * (1 - alpha) + frameTime * alpha;
        
        // Track maximum frame time
        if (frameTime > this.performanceMonitor.maxFrameTime) {
            this.performanceMonitor.maxFrameTime = frameTime;
        }
    }

    /**
     * Setup error handling
     * @private
     */
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error in state manager:', event.error);
            this.handleGlobalError(event.error);
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection in state manager:', event.reason);
            this.handleGlobalError(event.reason);
        });
    }

    /**
     * Handle transition errors
     * @private
     */
    async handleTransitionError(error, targetStateName, context) {
        this.emit('transitionError', { error, targetState: targetStateName, context });
        
        // Attempt fallback to safe state
        if (this.errorRecovery.fallbackState && 
            this.states.has(this.errorRecovery.fallbackState)) {
            try {
                await this.changeState(this.errorRecovery.fallbackState, {}, true);
            } catch (fallbackError) {
                console.error('Fallback state transition failed:', fallbackError);
            }
        }
    }

    /**
     * Handle update errors
     * @private
     */
    handleUpdateError(error) {
        this.emit('updateError', { error, state: this.currentState?.name });
        
        // Pause current state to prevent further errors
        if (this.currentState && this.currentState.config.canPause) {
            this.currentState.pause();
        }
    }

    /**
     * Handle render errors
     * @private
     */
    handleRenderError(error, ctx) {
        this.emit('renderError', { error, state: this.currentState?.name });
        
        // Clear canvas to prevent visual artifacts
        if (ctx && ctx.canvas) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    }

    /**
     * Handle global errors
     * @private
     */
    handleGlobalError(error) {
        this.metrics.errors++;
        this.emit('globalError', { error });
        
        // Emergency state recovery
        if (this.currentState && this.currentState.config.canPause) {
            this.currentState.pause();
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Exit current state
        if (this.currentState) {
            this.currentState.exit();
        }

        // Clear all references
        this.states.clear();
        this.transitions.clear();
        this.eventListeners.clear();
        this.stateHistory.length = 0;
        
        this.currentState = null;
        this.previousState = null;
        this.isTransitioning = false;
    }
}

// Export classes for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameState, StateTransition, GameStateManager };
} else if (typeof window !== 'undefined') {
    window.GameState = GameState;
    window.StateTransition = StateTransition;
    window.GameStateManager = GameStateManager;
}