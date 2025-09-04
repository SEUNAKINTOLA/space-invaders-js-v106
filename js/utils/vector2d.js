* 
 * @author Space Invaders Development Team
 * @version 1.0.0
 * @since 2025-01-27
 */

'use strict';

/**
 * Custom error class for vector-related operations
 */
class Vector2DError extends Error {
    constructor(message, operation = null, vector = null) {
        super(message);
        this.name = 'Vector2DError';
        this.operation = operation;
        this.vector = vector;
        this.timestamp = Date.now();
    }
}

/**
 * 2D Vector class with comprehensive mathematical operations
 * 
 * Represents a 2D vector with x and y components, providing immutable operations
 * for position calculations, movement, and geometric transformations.
 */
class Vector2D {
    /**
     * Creates a new Vector2D instance
     * 
     * @param {number} x - The x component (default: 0)
     * @param {number} y - The y component (default: 0)
     * @throws {Vector2DError} When x or y are not finite numbers
     */
    constructor(x = 0, y = 0) {
        this._validateNumber(x, 'x');
        this._validateNumber(y, 'y');
        
        this._x = x;
        this._y = y;
        
        // Cache frequently calculated values
        this._magnitude = null;
        this._magnitudeSquared = null;
        this._angle = null;
    }

    /**
     * Gets the x component
     * @returns {number} The x component
     */
    get x() {
        return this._x;
    }

    /**
     * Gets the y component
     * @returns {number} The y component
     */
    get y() {
        return this._y;
    }

    /**
     * Gets the magnitude (length) of the vector
     * @returns {number} The magnitude
     */
    get magnitude() {
        if (this._magnitude === null) {
            this._magnitude = Math.sqrt(this._x * this._x + this._y * this._y);
        }
        return this._magnitude;
    }

    /**
     * Gets the squared magnitude (more efficient than magnitude for comparisons)
     * @returns {number} The squared magnitude
     */
    get magnitudeSquared() {
        if (this._magnitudeSquared === null) {
            this._magnitudeSquared = this._x * this._x + this._y * this._y;
        }
        return this._magnitudeSquared;
    }

    /**
     * Gets the angle of the vector in radians
     * @returns {number} The angle in radians
     */
    get angle() {
        if (this._angle === null) {
            this._angle = Math.atan2(this._y, this._x);
        }
        return this._angle;
    }

    /**
     * Validates that a value is a finite number
     * @private
     * @param {*} value - The value to validate
     * @param {string} name - The parameter name for error messages
     * @throws {Vector2DError} When value is not a finite number
     */
    _validateNumber(value, name) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new Vector2DError(
                `${name} must be a finite number, got: ${typeof value} ${value}`,
                'validation',
                this
            );
        }
    }

    /**
     * Validates that another object is a Vector2D instance
     * @private
     * @param {*} other - The object to validate
     * @param {string} operation - The operation name for error messages
     * @throws {Vector2DError} When other is not a Vector2D
     */
    _validateVector(other, operation) {
        if (!(other instanceof Vector2D)) {
            throw new Vector2DError(
                `${operation} requires a Vector2D instance, got: ${typeof other}`,
                operation,
                this
            );
        }
    }

    /**
     * Creates a new vector by adding another vector to this one
     * @param {Vector2D} other - The vector to add
     * @returns {Vector2D} A new vector representing the sum
     * @throws {Vector2DError} When other is not a Vector2D
     */
    add(other) {
        this._validateVector(other, 'add');
        return new Vector2D(this._x + other._x, this._y + other._y);
    }

    /**
     * Creates a new vector by subtracting another vector from this one
     * @param {Vector2D} other - The vector to subtract
     * @returns {Vector2D} A new vector representing the difference
     * @throws {Vector2DError} When other is not a Vector2D
     */
    subtract(other) {
        this._validateVector(other, 'subtract');
        return new Vector2D(this._x - other._x, this._y - other._y);
    }

    /**
     * Creates a new vector by multiplying this vector by a scalar
     * @param {number} scalar - The scalar to multiply by
     * @returns {Vector2D} A new scaled vector
     * @throws {Vector2DError} When scalar is not a finite number
     */
    multiply(scalar) {
        this._validateNumber(scalar, 'scalar');
        return new Vector2D(this._x * scalar, this._y * scalar);
    }

    /**
     * Creates a new vector by dividing this vector by a scalar
     * @param {number} scalar - The scalar to divide by
     * @returns {Vector2D} A new scaled vector
     * @throws {Vector2DError} When scalar is not a finite number or is zero
     */
    divide(scalar) {
        this._validateNumber(scalar, 'scalar');
        if (scalar === 0) {
            throw new Vector2DError(
                'Cannot divide vector by zero',
                'divide',
                this
            );
        }
        return new Vector2D(this._x / scalar, this._y / scalar);
    }

    /**
     * Creates a normalized version of this vector (unit vector)
     * @returns {Vector2D} A new normalized vector
     * @throws {Vector2DError} When vector has zero magnitude
     */
    normalize() {
        const mag = this.magnitude;
        if (mag === 0) {
            throw new Vector2DError(
                'Cannot normalize zero vector',
                'normalize',
                this
            );
        }
        return this.divide(mag);
    }

    /**
     * Calculates the dot product with another vector
     * @param {Vector2D} other - The other vector
     * @returns {number} The dot product
     * @throws {Vector2DError} When other is not a Vector2D
     */
    dot(other) {
        this._validateVector(other, 'dot');
        return this._x * other._x + this._y * other._y;
    }

    /**
     * Calculates the cross product with another vector (2D cross product returns scalar)
     * @param {Vector2D} other - The other vector
     * @returns {number} The cross product (z-component of 3D cross product)
     * @throws {Vector2DError} When other is not a Vector2D
     */
    cross(other) {
        this._validateVector(other, 'cross');
        return this._x * other._y - this._y * other._x;
    }

    /**
     * Calculates the distance to another vector
     * @param {Vector2D} other - The other vector
     * @returns {number} The distance
     * @throws {Vector2DError} When other is not a Vector2D
     */
    distanceTo(other) {
        this._validateVector(other, 'distanceTo');
        const dx = this._x - other._x;
        const dy = this._y - other._y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculates the squared distance to another vector (more efficient for comparisons)
     * @param {Vector2D} other - The other vector
     * @returns {number} The squared distance
     * @throws {Vector2DError} When other is not a Vector2D
     */
    distanceToSquared(other) {
        this._validateVector(other, 'distanceToSquared');
        const dx = this._x - other._x;
        const dy = this._y - other._y;
        return dx * dx + dy * dy;
    }

    /**
     * Creates a vector rotated by the specified angle
     * @param {number} angle - The angle to rotate by (in radians)
     * @returns {Vector2D} A new rotated vector
     * @throws {Vector2DError} When angle is not a finite number
     */
    rotate(angle) {
        this._validateNumber(angle, 'angle');
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2D(
            this._x * cos - this._y * sin,
            this._x * sin + this._y * cos
        );
    }

    /**
     * Creates a vector perpendicular to this one (rotated 90 degrees counter-clockwise)
     * @returns {Vector2D} A new perpendicular vector
     */
    perpendicular() {
        return new Vector2D(-this._y, this._x);
    }

    /**
     * Linearly interpolates between this vector and another
     * @param {Vector2D} other - The target vector
     * @param {number} t - The interpolation factor (0-1)
     * @returns {Vector2D} A new interpolated vector
     * @throws {Vector2DError} When other is not a Vector2D or t is not a finite number
     */
    lerp(other, t) {
        this._validateVector(other, 'lerp');
        this._validateNumber(t, 't');
        
        return new Vector2D(
            this._x + (other._x - this._x) * t,
            this._y + (other._y - this._y) * t
        );
    }

    /**
     * Clamps the vector's magnitude to the specified range
     * @param {number} min - The minimum magnitude
     * @param {number} max - The maximum magnitude
     * @returns {Vector2D} A new clamped vector
     * @throws {Vector2DError} When min/max are not finite numbers or min > max
     */
    clampMagnitude(min, max) {
        this._validateNumber(min, 'min');
        this._validateNumber(max, 'max');
        
        if (min > max) {
            throw new Vector2DError(
                `min (${min}) cannot be greater than max (${max})`,
                'clampMagnitude',
                this
            );
        }

        const mag = this.magnitude;
        if (mag === 0) return this.clone();
        
        if (mag < min) return this.normalize().multiply(min);
        if (mag > max) return this.normalize().multiply(max);
        
        return this.clone();
    }

    /**
     * Creates a copy of this vector
     * @returns {Vector2D} A new vector with the same components
     */
    clone() {
        return new Vector2D(this._x, this._y);
    }

    /**
     * Checks if this vector equals another vector (within epsilon tolerance)
     * @param {Vector2D} other - The other vector
     * @param {number} epsilon - The tolerance for comparison (default: 1e-10)
     * @returns {boolean} True if vectors are equal within tolerance
     * @throws {Vector2DError} When other is not a Vector2D or epsilon is not a finite number
     */
    equals(other, epsilon = 1e-10) {
        this._validateVector(other, 'equals');
        this._validateNumber(epsilon, 'epsilon');
        
        return Math.abs(this._x - other._x) < epsilon && 
               Math.abs(this._y - other._y) < epsilon;
    }

    /**
     * Checks if this vector is a zero vector (within epsilon tolerance)
     * @param {number} epsilon - The tolerance for comparison (default: 1e-10)
     * @returns {boolean} True if vector is zero within tolerance
     * @throws {Vector2DError} When epsilon is not a finite number
     */
    isZero(epsilon = 1e-10) {
        this._validateNumber(epsilon, 'epsilon');
        return this.magnitudeSquared < epsilon * epsilon;
    }

    /**
     * Converts the vector to a plain object
     * @returns {Object} An object with x and y properties
     */
    toObject() {
        return { x: this._x, y: this._y };
    }

    /**
     * Converts the vector to an array
     * @returns {number[]} An array [x, y]
     */
    toArray() {
        return [this._x, this._y];
    }

    /**
     * Returns a string representation of the vector
     * @returns {string} String representation
     */
    toString() {
        return `Vector2D(${this._x}, ${this._y})`;
    }

    /**
     * Returns a JSON representation of the vector
     * @returns {string} JSON string
     */
    toJSON() {
        return JSON.stringify(this.toObject());
    }

    // Static factory methods

    /**
     * Creates a new Vector2D from x and y components
     * @param {number} x - The x component
     * @param {number} y - The y component
     * @returns {Vector2D} A new Vector2D instance
     */
    static from(x, y) {
        return new Vector2D(x, y);
    }

    /**
     * Creates a zero vector
     * @returns {Vector2D} A new zero vector
     */
    static zero() {
        return new Vector2D(0, 0);
    }

    /**
     * Creates a unit vector pointing right
     * @returns {Vector2D} A new unit vector (1, 0)
     */
    static right() {
        return new Vector2D(1, 0);
    }

    /**
     * Creates a unit vector pointing left
     * @returns {Vector2D} A new unit vector (-1, 0)
     */
    static left() {
        return new Vector2D(-1, 0);
    }

    /**
     * Creates a unit vector pointing up
     * @returns {Vector2D} A new unit vector (0, -1)
     */
    static up() {
        return new Vector2D(0, -1);
    }

    /**
     * Creates a unit vector pointing down
     * @returns {Vector2D} A new unit vector (0, 1)
     */
    static down() {
        return new Vector2D(0, 1);
    }

    /**
     * Creates a vector from polar coordinates
     * @param {number} magnitude - The magnitude (radius)
     * @param {number} angle - The angle in radians
     * @returns {Vector2D} A new vector from polar coordinates
     * @throws {Vector2DError} When magnitude or angle are not finite numbers
     */
    static fromPolar(magnitude, angle) {
        if (typeof magnitude !== 'number' || !Number.isFinite(magnitude)) {
            throw new Vector2DError(
                `magnitude must be a finite number, got: ${typeof magnitude} ${magnitude}`,
                'fromPolar'
            );
        }
        if (typeof angle !== 'number' || !Number.isFinite(angle)) {
            throw new Vector2DError(
                `angle must be a finite number, got: ${typeof angle} ${angle}`,
                'fromPolar'
            );
        }
        
        return new Vector2D(
            magnitude * Math.cos(angle),
            magnitude * Math.sin(angle)
        );
    }

    /**
     * Creates a random unit vector
     * @returns {Vector2D} A new random unit vector
     */
    static random() {
        const angle = Math.random() * 2 * Math.PI;
        return Vector2D.fromPolar(1, angle);
    }

    /**
     * Creates a random vector within the specified bounds
     * @param {number} minX - Minimum x value
     * @param {number} maxX - Maximum x value
     * @param {number} minY - Minimum y value
     * @param {number} maxY - Maximum y value
     * @returns {Vector2D} A new random vector within bounds
     * @throws {Vector2DError} When bounds are not finite numbers
     */
    static randomInBounds(minX, maxX, minY, maxY) {
        const validateBound = (value, name) => {
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                throw new Vector2DError(
                    `${name} must be a finite number, got: ${typeof value} ${value}`,
                    'randomInBounds'
                );
            }
        };

        validateBound(minX, 'minX');
        validateBound(maxX, 'maxX');
        validateBound(minY, 'minY');
        validateBound(maxY, 'maxY');

        return new Vector2D(
            minX + Math.random() * (maxX - minX),
            minY + Math.random() * (maxY - minY)
        );
    }
}

// Object pool for performance optimization
class Vector2DPool {
    constructor(initialSize = 100) {
        this._pool = [];
        this._size = 0;
        
        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            this._pool.push(new Vector2D());
        }
        this._size = initialSize;
    }

    /**
     * Gets a vector from the pool or creates a new one
     * @param {number} x - The x component
     * @param {number} y - The y component
     * @returns {Vector2D} A vector instance
     */
    get(x = 0, y = 0) {
        let vector;
        if (this._size > 0) {
            vector = this._pool[--this._size];
            vector._x = x;
            vector._y = y;
            vector._magnitude = null;
            vector._magnitudeSquared = null;
            vector._angle = null;
        } else {
            vector = new Vector2D(x, y);
        }
        return vector;
    }

    /**
     * Returns a vector to the pool
     * @param {Vector2D} vector - The vector to return
     */
    release(vector) {
        if (vector instanceof Vector2D && this._size < this._pool.length) {
            this._pool[this._size++] = vector;
        }
    }

    /**
     * Gets the current pool size
     * @returns {number} The number of available vectors in the pool
     */
    get availableCount() {
        return this._size;
    }
}

// Global pool instance
const globalPool = new Vector2DPool();

/**
 * Utility functions for common vector operations
 */
const VectorUtils = {
    /**
     * Calculates the angle between two vectors
     * @param {Vector2D} a - First vector
     * @param {Vector2D} b - Second vector
     * @returns {number} The angle between vectors in radians
     */
    angleBetween(a, b) {
        if (!(a instanceof Vector2D) || !(b instanceof Vector2D)) {
            throw new Vector2DError(
                'angleBetween requires two Vector2D instances',
                'angleBetween'
            );
        }
        
        const dot = a.dot(b);
        const magProduct = a.magnitude * b.magnitude;
        
        if (magProduct === 0) {
            throw new Vector2DError(
                'Cannot calculate angle with zero vector',
                'angleBetween'
            );
        }
        
        return Math.acos(Math.max(-1, Math.min(1, dot / magProduct)));
    },

    /**
     * Reflects a vector off a surface with the given normal
     * @param {Vector2D} vector - The incident vector
     * @param {Vector2D} normal - The surface normal (should be normalized)
     * @returns {Vector2D} The reflected vector
     */
    reflect(vector, normal) {
        if (!(vector instanceof Vector2D) || !(normal instanceof Vector2D)) {
            throw new Vector2DError(
                'reflect requires two Vector2D instances',
                'reflect'
            );
        }
        
        const dot = vector.dot(normal);
        return vector.subtract(normal.multiply(2 * dot));
    },

    /**
     * Projects vector a onto vector b
     * @param {Vector2D} a - The vector to project
     * @param {Vector2D} b - The vector to project onto
     * @returns {Vector2D} The projected vector
     */
    project(a, b) {
        if (!(a instanceof Vector2D) || !(b instanceof Vector2D)) {
            throw new Vector2DError(
                'project requires two Vector2D instances',
                'project'
            );
        }
        
        const bMagSquared = b.magnitudeSquared;
        if (bMagSquared === 0) {
            throw new Vector2DError(
                'Cannot project onto zero vector',
                'project'
            );
        }
        
        const scalar = a.dot(b) / bMagSquared;
        return b.multiply(scalar);
    },

    /**
     * Gets a vector from the global pool
     * @param {number} x - The x component
     * @param {number} y - The y component
     * @returns {Vector2D} A pooled vector instance
     */
    getPooled(x = 0, y = 0) {
        return globalPool.get(x, y);
    },

    /**
     * Returns a vector to the global pool
     * @param {Vector2D} vector - The vector to return
     */
    releasePooled(vector) {
        globalPool.release(vector);
    }
};

// Export the classes and utilities
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        Vector2D,
        Vector2DError,
        Vector2DPool,
        VectorUtils
    };
} else if (typeof window !== 'undefined') {
    // Browser environment
    window.Vector2D = Vector2D;
    window.Vector2DError = Vector2DError;
    window.Vector2DPool = Vector2DPool;
    window.VectorUtils = VectorUtils;
}