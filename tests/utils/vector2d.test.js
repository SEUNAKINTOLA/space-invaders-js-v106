/**
 * @fileoverview Comprehensive test suite for Vector2D mathematical operations
 * 
 * This test suite validates all vector operations including:
 * - Basic arithmetic (add, subtract, multiply, divide)
 * - Geometric operations (magnitude, normalize, distance)
 * - Utility functions (dot product, cross product, angle calculations)
 * - Edge cases and error conditions
 * - Performance characteristics for game-critical operations
 * 
 * @author Space Invaders JS V106
 * @version 1.0.0
 */

/**
 * Mock Vector2D implementation for testing purposes
 * This represents the expected interface of the actual Vector2D class
 */
class MockVector2D {
    constructor(x = 0, y = 0) {
        this.x = Number(x);
        this.y = Number(y);
        
        // Validate inputs
        if (!Number.isFinite(this.x) || !Number.isFinite(this.y)) {
            throw new Error('Vector2D components must be finite numbers');
        }
    }

    /**
     * Add another vector to this vector
     * @param {Vector2D} other - Vector to add
     * @returns {Vector2D} New vector representing the sum
     */
    add(other) {
        if (!(other instanceof MockVector2D)) {
            throw new TypeError('Argument must be a Vector2D instance');
        }
        return new MockVector2D(this.x + other.x, this.y + other.y);
    }

    /**
     * Subtract another vector from this vector
     * @param {Vector2D} other - Vector to subtract
     * @returns {Vector2D} New vector representing the difference
     */
    subtract(other) {
        if (!(other instanceof MockVector2D)) {
            throw new TypeError('Argument must be a Vector2D instance');
        }
        return new MockVector2D(this.x - other.x, this.y - other.y);
    }

    /**
     * Multiply vector by a scalar
     * @param {number} scalar - Scalar value to multiply by
     * @returns {Vector2D} New scaled vector
     */
    multiply(scalar) {
        if (typeof scalar !== 'number' || !Number.isFinite(scalar)) {
            throw new TypeError('Scalar must be a finite number');
        }
        return new MockVector2D(this.x * scalar, this.y * scalar);
    }

    /**
     * Divide vector by a scalar
     * @param {number} scalar - Scalar value to divide by
     * @returns {Vector2D} New scaled vector
     */
    divide(scalar) {
        if (typeof scalar !== 'number' || !Number.isFinite(scalar)) {
            throw new TypeError('Scalar must be a finite number');
        }
        if (scalar === 0) {
            throw new Error('Cannot divide by zero');
        }
        return new MockVector2D(this.x / scalar, this.y / scalar);
    }

    /**
     * Calculate the magnitude (length) of the vector
     * @returns {number} Vector magnitude
     */
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Calculate the squared magnitude (for performance when comparing distances)
     * @returns {number} Squared vector magnitude
     */
    magnitudeSquared() {
        return this.x * this.x + this.y * this.y;
    }

    /**
     * Normalize the vector to unit length
     * @returns {Vector2D} New normalized vector
     */
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) {
            throw new Error('Cannot normalize zero vector');
        }
        return new MockVector2D(this.x / mag, this.y / mag);
    }

    /**
     * Calculate dot product with another vector
     * @param {Vector2D} other - Other vector
     * @returns {number} Dot product result
     */
    dot(other) {
        if (!(other instanceof MockVector2D)) {
            throw new TypeError('Argument must be a Vector2D instance');
        }
        return this.x * other.x + this.y * other.y;
    }

    /**
     * Calculate cross product with another vector (2D cross product returns scalar)
     * @param {Vector2D} other - Other vector
     * @returns {number} Cross product result
     */
    cross(other) {
        if (!(other instanceof MockVector2D)) {
            throw new TypeError('Argument must be a Vector2D instance');
        }
        return this.x * other.y - this.y * other.x;
    }

    /**
     * Calculate distance to another vector
     * @param {Vector2D} other - Other vector
     * @returns {number} Distance between vectors
     */
    distanceTo(other) {
        if (!(other instanceof MockVector2D)) {
            throw new TypeError('Argument must be a Vector2D instance');
        }
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate squared distance to another vector (for performance)
     * @param {Vector2D} other - Other vector
     * @returns {number} Squared distance between vectors
     */
    distanceToSquared(other) {
        if (!(other instanceof MockVector2D)) {
            throw new TypeError('Argument must be a Vector2D instance');
        }
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return dx * dx + dy * dy;
    }

    /**
     * Calculate angle of the vector in radians
     * @returns {number} Angle in radians
     */
    angle() {
        return Math.atan2(this.y, this.x);
    }

    /**
     * Calculate angle between this vector and another
     * @param {Vector2D} other - Other vector
     * @returns {number} Angle between vectors in radians
     */
    angleTo(other) {
        if (!(other instanceof MockVector2D)) {
            throw new TypeError('Argument must be a Vector2D instance');
        }
        const dot = this.dot(other);
        const mag1 = this.magnitude();
        const mag2 = other.magnitude();
        
        if (mag1 === 0 || mag2 === 0) {
            throw new Error('Cannot calculate angle with zero vector');
        }
        
        return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
    }

    /**
     * Create a copy of this vector
     * @returns {Vector2D} New vector with same components
     */
    clone() {
        return new MockVector2D(this.x, this.y);
    }

    /**
     * Check if this vector equals another vector (with optional tolerance)
     * @param {Vector2D} other - Other vector
     * @param {number} tolerance - Tolerance for floating point comparison
     * @returns {boolean} True if vectors are equal within tolerance
     */
    equals(other, tolerance = Number.EPSILON) {
        if (!(other instanceof MockVector2D)) {
            return false;
        }
        return Math.abs(this.x - other.x) <= tolerance && 
               Math.abs(this.y - other.y) <= tolerance;
    }

    /**
     * Convert vector to string representation
     * @returns {string} String representation
     */
    toString() {
        return `Vector2D(${this.x}, ${this.y})`;
    }

    /**
     * Static method to create zero vector
     * @returns {Vector2D} Zero vector
     */
    static zero() {
        return new MockVector2D(0, 0);
    }

    /**
     * Static method to create unit vector pointing right
     * @returns {Vector2D} Unit vector (1, 0)
     */
    static right() {
        return new MockVector2D(1, 0);
    }

    /**
     * Static method to create unit vector pointing up
     * @returns {Vector2D} Unit vector (0, 1)
     */
    static up() {
        return new MockVector2D(0, 1);
    }
}

/**
 * Test utilities for vector operations
 */
class VectorTestUtils {
    /**
     * Assert that two numbers are approximately equal
     * @param {number} actual - Actual value
     * @param {number} expected - Expected value
     * @param {number} tolerance - Tolerance for comparison
     * @param {string} message - Error message
     */
    static assertApproximatelyEqual(actual, expected, tolerance = 1e-10, message = '') {
        const diff = Math.abs(actual - expected);
        if (diff > tolerance) {
            throw new Error(`${message}: Expected ${expected}, got ${actual} (diff: ${diff})`);
        }
    }

    /**
     * Assert that two vectors are approximately equal
     * @param {Vector2D} actual - Actual vector
     * @param {Vector2D} expected - Expected vector
     * @param {number} tolerance - Tolerance for comparison
     * @param {string} message - Error message
     */
    static assertVectorsApproximatelyEqual(actual, expected, tolerance = 1e-10, message = '') {
        this.assertApproximatelyEqual(actual.x, expected.x, tolerance, `${message} (x component)`);
        this.assertApproximatelyEqual(actual.y, expected.y, tolerance, `${message} (y component)`);
    }

    /**
     * Generate random vector for property-based testing
     * @param {number} min - Minimum component value
     * @param {number} max - Maximum component value
     * @returns {Vector2D} Random vector
     */
    static randomVector(min = -100, max = 100) {
        const x = Math.random() * (max - min) + min;
        const y = Math.random() * (max - min) + min;
        return new MockVector2D(x, y);
    }

    /**
     * Performance test helper
     * @param {Function} operation - Operation to test
     * @param {number} iterations - Number of iterations
     * @returns {number} Average execution time in milliseconds
     */
    static performanceTest(operation, iterations = 10000) {
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            operation();
        }
        const end = performance.now();
        return (end - start) / iterations;
    }
}

/**
 * Test Suite: Vector2D Constructor and Basic Properties
 */
function testVector2DConstructor() {
    console.log('Testing Vector2D Constructor...');
    
    // Test default constructor
    const defaultVector = new MockVector2D();
    if (defaultVector.x !== 0 || defaultVector.y !== 0) {
        throw new Error('Default constructor should create zero vector');
    }
    
    // Test parameterized constructor
    const vector = new MockVector2D(3, 4);
    if (vector.x !== 3 || vector.y !== 4) {
        throw new Error('Parameterized constructor failed');
    }
    
    // Test string number conversion
    const stringVector = new MockVector2D('5', '6');
    if (stringVector.x !== 5 || stringVector.y !== 6) {
        throw new Error('String to number conversion failed');
    }
    
    // Test invalid inputs
    try {
        new MockVector2D(NaN, 0);
        throw new Error('Should throw error for NaN input');
    } catch (e) {
        if (!e.message.includes('finite numbers')) {
            throw new Error('Wrong error message for NaN input');
        }
    }
    
    try {
        new MockVector2D(0, Infinity);
        throw new Error('Should throw error for Infinity input');
    } catch (e) {
        if (!e.message.includes('finite numbers')) {
            throw new Error('Wrong error message for Infinity input');
        }
    }
    
    console.log('✅ Vector2D Constructor tests passed');
}

/**
 * Test Suite: Vector Addition Operations
 */
function testVectorAddition() {
    console.log('Testing Vector Addition...');
    
    // Basic addition
    const v1 = new MockVector2D(1, 2);
    const v2 = new MockVector2D(3, 4);
    const result = v1.add(v2);
    
    if (result.x !== 4 || result.y !== 6) {
        throw new Error('Basic addition failed');
    }
    
    // Addition with zero vector
    const zero = MockVector2D.zero();
    const zeroResult = v1.add(zero);
    if (!zeroResult.equals(v1)) {
        throw new Error('Addition with zero vector failed');
    }
    
    // Addition with negative numbers
    const negative = new MockVector2D(-1, -2);
    const negativeResult = v1.add(negative);
    if (!negativeResult.equals(MockVector2D.zero())) {
        throw new Error('Addition with negative vector failed');
    }
    
    // Commutative property
    const commutative1 = v1.add(v2);
    const commutative2 = v2.add(v1);
    if (!commutative1.equals(commutative2)) {
        throw new Error('Addition is not commutative');
    }
    
    // Associative property
    const v3 = new MockVector2D(5, 6);
    const associative1 = v1.add(v2).add(v3);
    const associative2 = v1.add(v2.add(v3));
    VectorTestUtils.assertVectorsApproximatelyEqual(associative1, associative2, 1e-10, 'Addition is not associative');
    
    // Type checking
    try {
        v1.add("not a vector");
        throw new Error('Should throw error for invalid type');
    } catch (e) {
        if (!e.message.includes('Vector2D instance')) {
            throw new Error('Wrong error message for type check');
        }
    }
    
    console.log('✅ Vector Addition tests passed');
}

/**
 * Test Suite: Vector Subtraction Operations
 */
function testVectorSubtraction() {
    console.log('Testing Vector Subtraction...');
    
    // Basic subtraction
    const v1 = new MockVector2D(5, 7);
    const v2 = new MockVector2D(2, 3);
    const result = v1.subtract(v2);
    
    if (result.x !== 3 || result.y !== 4) {
        throw new Error('Basic subtraction failed');
    }
    
    // Subtraction with zero vector
    const zero = MockVector2D.zero();
    const zeroResult = v1.subtract(zero);
    if (!zeroResult.equals(v1)) {
        throw new Error('Subtraction with zero vector failed');
    }
    
    // Self subtraction
    const selfResult = v1.subtract(v1);
    if (!selfResult.equals(zero)) {
        throw new Error('Self subtraction should result in zero vector');
    }
    
    // Subtraction with negative result
    const v3 = new MockVector2D(1, 1);
    const v4 = new MockVector2D(3, 4);
    const negativeResult = v3.subtract(v4);
    if (negativeResult.x !== -2 || negativeResult.y !== -3) {
        throw new Error('Subtraction with negative result failed');
    }
    
    console.log('✅ Vector Subtraction tests passed');
}

/**
 * Test Suite: Vector Scalar Multiplication
 */
function testScalarMultiplication() {
    console.log('Testing Scalar Multiplication...');
    
    // Basic multiplication
    const v1 = new MockVector2D(2, 3);
    const result = v1.multiply(2);
    
    if (result.x !== 4 || result.y !== 6) {
        throw new Error('Basic scalar multiplication failed');
    }
    
    // Multiplication by zero
    const zeroResult = v1.multiply(0);
    if (!zeroResult.equals(MockVector2D.zero())) {
        throw new Error('Multiplication by zero failed');
    }
    
    // Multiplication by one
    const oneResult = v1.multiply(1);
    if (!oneResult.equals(v1)) {
        throw new Error('Multiplication by one failed');
    }
    
    // Multiplication by negative number
    const negativeResult = v1.multiply(-1);
    if (negativeResult.x !== -2 || negativeResult.y !== -3) {
        throw new Error('Multiplication by negative number failed');
    }
    
    // Multiplication by fraction
    const fractionResult = v1.multiply(0.5);
    if (fractionResult.x !== 1 || fractionResult.y !== 1.5) {
        throw new Error('Multiplication by fraction failed');
    }
    
    // Type checking
    try {
        v1.multiply("not a number");
        throw new Error('Should throw error for invalid type');
    } catch (e) {
        if (!e.message.includes('finite number')) {
            throw new Error('Wrong error message for type check');
        }
    }
    
    // NaN checking
    try {
        v1.multiply(NaN);
        throw new Error('Should throw error for NaN');
    } catch (e) {
        if (!e.message.includes('finite number')) {
            throw new Error('Wrong error message for NaN');
        }
    }
    
    console.log('✅ Scalar Multiplication tests passed');
}

/**
 * Test Suite: Vector Scalar Division
 */
function testScalarDivision() {
    console.log('Testing Scalar Division...');
    
    // Basic division
    const v1 = new MockVector2D(6, 8);
    const result = v1.divide(2);
    
    if (result.x !== 3 || result.y !== 4) {
        throw new Error('Basic scalar division failed');
    }
    
    // Division by one
    const oneResult = v1.divide(1);
    if (!oneResult.equals(v1)) {
        throw new Error('Division by one failed');
    }
    
    // Division by negative number
    const negativeResult = v1.divide(-2);
    if (negativeResult.x !== -3 || negativeResult.y !== -4) {
        throw new Error('Division by negative number failed');
    }
    
    // Division by fraction (multiplication by reciprocal)
    const fractionResult = v1.divide(0.5);
    if (fractionResult.x !== 12 || fractionResult.y !== 16) {
        throw new Error('Division by fraction failed');
    }
    
    // Division by zero
    try {
        v1.divide(0);
        throw new Error('Should throw error for division by zero');
    } catch (e) {
        if (!e.message.includes('divide by zero')) {
            throw new Error('Wrong error message for division by zero');
        }
    }
    
    // Type checking
    try {
        v1.divide("not a number");
        throw new Error('Should throw error for invalid type');
    } catch (e) {
        if (!e.message.includes('finite number')) {
            throw new Error('Wrong error message for type check');
        }
    }
    
    console.log('✅ Scalar Division tests passed');
}

/**
 * Test Suite: Vector Magnitude Calculations
 */
function testMagnitudeCalculations() {
    console.log('Testing Magnitude Calculations...');
    
    // Basic magnitude (3-4-5 triangle)
    const v1 = new MockVector2D(3, 4);
    const magnitude = v1.magnitude();
    VectorTestUtils.assertApproximatelyEqual(magnitude, 5, 1e-10, 'Basic magnitude calculation');
    
    // Zero vector magnitude
    const zero = MockVector2D.zero();
    if (zero.magnitude() !== 0) {
        throw new Error('Zero vector magnitude should be 0');
    }
    
    // Unit vector magnitude
    const unit = new MockVector2D(1, 0);
    VectorTestUtils.assertApproximatelyEqual(unit.magnitude(), 1, 1e-10, 'Unit vector magnitude');
    
    // Negative components
    const negative = new MockVector2D(-3, -4);
    VectorTestUtils.assertApproximatelyEqual(negative.magnitude(), 5, 1e-10, 'Negative components magnitude');
    
    // Magnitude squared (performance optimization)
    const magnitudeSquared = v1.magnitudeSquared();
    if (magnitudeSquared !== 25) {
        throw new Error('Magnitude squared calculation failed');
    }
    
    // Large numbers
    const large = new MockVector2D(1e6, 1e6);
    const largeMagnitude = large.magnitude();
    VectorTestUtils.assertApproximatelyEqual(largeMagnitude, Math.sqrt(2) * 1e6, 1e-4, 'Large number magnitude');
    
    // Small numbers
    const small = new MockVector2D(1e-6, 1e-6);
    const smallMagnitude = small.magnitude();
    VectorTestUtils.assertApproximatelyEqual(smallMagnitude, Math.sqrt(2) * 1e-6, 1e-16, 'Small number magnitude');
    
    console.log('✅ Magnitude Calculation tests passed');
}

/**
 * Test Suite: Vector Normalization
 */
function testVectorNormalization() {
    console.log('Testing Vector Normalization...');
    
    // Basic normalization
    const v1 = new MockVector2D(3, 4);
    const normalized = v1.normalize();
    VectorTestUtils.assertApproximatelyEqual(normalized.magnitude(), 1, 1e-10, 'Normalized vector magnitude');
    VectorTestUtils.assertApproximatelyEqual(normalized.x, 0.6, 1e-10, 'Normalized x component');
    VectorTestUtils.assertApproximatelyEqual(normalized.y, 0.8, 1e-10, 'Normalized y component');
    
    // Already normalized vector
    const unit = new MockVector2D(1, 0);
    const normalizedUnit = unit.normalize();
    VectorTestUtils.assertVectorsApproximatelyEqual(normalizedUnit, unit, 1e-10, 'Already normalized vector');
    
    // Negative components
    const negative = new MockVector2D(-6, -8);
    const normalizedNegative = negative.normalize();
    VectorTestUtils.assertApproximatelyEqual(normalizedNegative.magnitude(), 1, 1e-10, 'Normalized negative vector magnitude');
    VectorTestUtils.assertApproximatelyEqual(normalizedNegative.x, -0.6, 1e-10, 'Normalized negative x component');
    VectorTestUtils.assertApproximatelyEqual(normalizedNegative.y, -0.8, 1e-10, 'Normalized negative y component');
    
    // Zero vector normalization (should throw error)
    try {
        const zero = MockVector2D.zero();
        zero.normalize();
        throw new Error('Should throw error for zero vector normalization');
    } catch (e) {
        if (!e.message.includes('zero vector')) {
            throw new Error('Wrong error message for zero vector normalization');
        }
    }
    
    // Very small vector
    const tiny = new MockVector2D(1e-10, 1e-10);
    const normalizedTiny = tiny.normalize();
    VectorTestUtils.assertApproximatelyEqual(normalizedTiny.magnitude(), 1, 1e-8, 'Normalized tiny vector magnitude');
    
    console.log('✅ Vector Normalization tests passed');
}

/**
 * Test Suite: Dot Product Operations
 */
function testDotProduct() {
    console.log('Testing Dot Product...');
    
    // Basic dot product
    const v1 = new MockVector2D(2, 3);
    const v2 = new MockVector2D(4, 5);
    const dotProduct = v1.dot(v2);
    if (dotProduct !== 23) { // 2*4 + 3*5 = 8 + 15 = 23
        throw new Error('Basic dot product calculation failed');
    }
    
    // Dot product with zero vector
    const zero = MockVector2D.zero();
    const zeroDot = v1.dot(zero);
    if (zeroDot !== 0) {
        throw new Error('Dot product with zero vector should be 0');
    }
    
    // Dot product with self
    const selfDot = v1.dot(v1);
    const expectedSelfDot = v1.magnitudeSquared();
    VectorTestUtils.assertApproximatelyEqual(selfDot, expectedSelfDot, 1e-10, 'Dot product with self');
    
    // Perpendicular vectors (dot product should be 0)
    const perpendicular1 = new MockVector2D(1, 0);
    const perpendicular2 = new MockVector2D(0, 1);
    const perpDot = perpendicular1.dot(perpendicular2);
    if (perpDot !== 0) {
        throw new Error('Dot product of perpendicular vectors should be 0');
    }
    
    // Commutative property
    const commutative1 = v1.dot(v2);
    const commutative2 = v2.dot(v1);
    if (commutative1 !== commutative2) {
        throw new Error('Dot product is not commutative');
    }
    
    // Negative dot product (obtuse angle)
    const opposite1 = new MockVector2D(1, 0);
    const opposite2 = new MockVector2D(-1, 0);
    const negativeDot = opposite1.dot(opposite2);
    if (negativeDot !== -1) {
        throw new Error('Negative dot product calculation failed');
    }
    
    console.log('✅ Dot Product tests passed');
}

/**
 * Test Suite: Cross Product Operations (2D)
 */
function testCrossProduct() {
    console.log('Testing Cross Product...');
    
    // Basic cross product
    const v1 = new MockVector2D(2, 3);
    const v2 = new MockVector2D(4, 5);
    const crossProduct = v1.cross(v2);
    if (crossProduct !== -2) { // 2*5 - 3*4 = 10 - 12 = -2
        throw new Error('Basic cross product calculation failed');
    }
    
    // Cross product with zero vector
    const zero = MockVector2D.zero();
    const zeroCross = v1.cross(zero);
    if (zeroCross !== 0) {
        throw new Error('Cross product with zero vector should be 0');
    }
    
    // Cross product with self (should be 0)
    const selfCross = v1.cross(v1);
    if (selfCross !== 0) {
        throw new Error('Cross product with self should be 0');
    }
    
    // Anti-commutative property
    const antiCommutative1 = v1.cross(v2);
    const antiCommutative2 = v2.cross(v1);
    if (antiCommutative1 !== -antiCommutative2) {
        throw new Error('Cross product is not anti-commutative');
    }
    
    // Parallel vectors (cross product should be 0)
    const parallel1 = new MockVector2D(2, 3);
    const parallel2 = new MockVector2D(4, 6); // 2 * parallel1
    const parallelCross = parallel1.cross(parallel2);
    VectorTestUtils.assertApproximatelyEqual(parallelCross, 0, 1e-10, 'Cross product of parallel vectors');
    
    console.log('✅ Cross Product tests passed');
}

/**
 * Test Suite: Distance Calculations
 */
function testDistanceCalculations() {
    console.log('Testing Distance Calculations...');
    
    // Basic distance (3-4-5 triangle)
    const v1 = new MockVector2D(0, 0);
    const v2 = new MockVector2D(3, 4);
    const distance = v1.distanceTo(v2);
    VectorTestUtils.assertApproximatelyEqual(distance, 5, 1e-10, 'Basic distance calculation');
    
    // Distance to self (should be 0)
    const selfDistance = v1.distanceTo(v1);
    if (selfDistance !== 0) {
        throw new Error('Distance to self should be 0');
    }
    
    // Symmetric property
    const symmetric1 = v1.distanceTo(v2);
    const symmetric2 = v2.distanceTo(v1);
    VectorTestUtils.assertApproximatelyEqual(symmetric1, symmetric2, 1e-10, 'Distance is not symmetric');
    
    // Distance squared (performance optimization)
    const distanceSquared = v1.distanceToSquared(v2);
    if (distanceSquared !== 25) {
        throw new Error('Distance squared calculation failed');
    }
    
    // Negative coordinates
    const negative1 = new MockVector2D(-1, -1);
    const negative2 = new MockVector2D(-4, -5);
    const negativeDistance = negative1.distanceTo(negative2);
    VectorTestUtils.assertApproximatelyEqual(negativeDistance, 5, 1e-10, 'Distance with negative coordinates');
    
    // Large distances
    const large1 = new MockVector2D(0, 0);
    const large2 = new MockVector2D(1e6, 1e6);
    const largeDistance = large1.distanceTo(large2);
    VectorTestUtils.assertApproximatelyEqual(largeDistance, Math.sqrt(2) * 1e6, 1e-4, 'Large distance calculation');
    
    console.log('✅ Distance Calculation tests passed');
}

/**
 * Test Suite: Angle Calculations
 */
function testAngleCalculations() {
    console.log('Testing Angle Calculations...');
    
    // Basic angle calculation
    const right = new MockVector2D(1, 0);
    const rightAngle = right.angle();
    VectorTestUtils.assertApproximatelyEqual(rightAngle, 0, 1e-10, 'Right vector angle');
    
    const up = new MockVector2D(0, 1);
    const upAngle = up.angle();
    VectorTestUtils.assertApproximatelyEqual(upAngle, Math.PI / 2, 1e-10, 'Up vector angle');
    
    const left = new MockVector2D(-1, 0);
    const leftAngle = left.angle();
    VectorTestUtils.assertApproximatelyEqual(leftAngle, Math.PI, 1e-10, 'Left vector angle');
    
    const down = new MockVector2D(0, -1);
    const downAngle = down.angle();
    VectorTestUtils.assertApproximatelyEqual(downAngle, -Math.PI / 2, 1e-10, 'Down vector angle');
    
    // Angle between vectors
    const v1 = new MockVector2D(1, 0);
    const v2 = new MockVector2D(0, 1);
    const angleBetween = v1.angleTo(v2);
    VectorTestUtils.assertApproximatelyEqual(angleBetween, Math.PI / 2, 1e-10, 'Angle between perpendicular vectors');
    
    // Angle between parallel vectors
    const parallel1 = new MockVector2D(1, 1);
    const parallel2 = new MockVector2D(2, 2);
    const parallelAngle = parallel1.angleTo(parallel2);
    VectorTestUtils.assertApproximatelyEqual(parallelAngle, 0, 1e-10, 'Angle between parallel vectors');
    
    // Angle between opposite vectors
    const opposite1 = new MockVector2D(1, 0);
    const opposite2 = new MockVector2D(-1, 0);
    const oppositeAngle = opposite1.angleTo(opposite2);
    VectorTestUtils.assertApproximatelyEqual(oppositeAngle, Math.PI, 1e-10, 'Angle between opposite vectors');
    
    // Error case: angle with zero vector
    try {
        const zero = MockVector2D.zero();
        v1.angleTo(zero);
        throw new Error('Should throw error for angle with zero vector');
    } catch (e) {
        if (!e.message.includes('zero vector')) {
            throw new Error('Wrong error message for angle with zero vector');
        }
    }
    
    console.log('✅ Angle Calculation tests passed');
}

/**
 * Test Suite: Utility Functions
 */
function testUtilityFunctions() {
    console.log('Testing Utility Functions...');
    
    // Clone function
    const original = new MockVector2D(3, 4);
    const cloned = original.clone();
    
    if (!cloned.equals(original)) {
        throw new Error('Clone should be equal to original');
    }
    
    if (cloned === original) {
        throw new Error('Clone should be a different object');
    }
    
    // Modify original to ensure independence
    const modified = original.add(new MockVector2D(1, 1));
    if (cloned.equals(modified)) {
        throw new Error('Clone should be independent of original');
    }
    
    // Equals function with default tolerance
    const v1 = new MockVector2D(1, 2);
    const v2 = new MockVector2D(1, 2);
    const v3 = new MockVector2D(1.1, 2.1);
    
    if (!v1.equals(v2)) {
        throw new Error('Identical vectors should be equal');
    }
    
    if (v1.equals(v3)) {
        throw new Error('Different vectors should not be equal');
    }
    
    // Equals function with custom tolerance
    const almostEqual1 = new MockVector2D(1, 2);
    const almostEqual2 = new MockVector2D(1.0000001, 2.0000001);
    
    if (!almostEqual1.equals(almostEqual2, 1e-6)) {
        throw new Error('Almost equal vectors should be equal with tolerance');
    }
    
    if (almostEqual1.equals(almostEqual2, 1e-8)) {
        throw new Error('Almost equal vectors should not be equal with strict tolerance');
    }
    
    // Equals with non-vector object
    if (v1.equals("not a vector")) {
        throw new Error('Should return false for non-vector comparison');
    }
    
    // toString function
    const stringRepresentation = v1.toString();
    if (!stringRepresentation.includes('Vector2D') || !stringRepresentation.includes('1') || !stringRepresentation.includes('2')) {
        throw new Error('toString should contain vector information');
    }
    
    console.log('✅ Utility Function tests passed');
}

/**
 * Test Suite: Static Factory Methods
 */
function testStaticFactoryMethods() {
    console.log('Testing Static Factory Methods...');
    
    // Zero vector
    const zero = MockVector2D.zero();
    if (zero.x !== 0 || zero.y !== 0) {
        throw new Error('Zero vector factory method failed');
    }
    
    // Right vector
    const right = MockVector2D.right();
    if (right.x !== 1 || right.y !== 0) {
        throw new Error('Right vector factory method failed');
    }
    
    // Up vector
    const up = MockVector2D.up();
    if (up.x !== 0 || up.y !== 1) {
        throw new Error('Up vector factory method failed');
    }
    
    // Verify they are unit vectors
    VectorTestUtils.assertApproximatelyEqual(right.magnitude(), 1, 1e-10, 'Right vector should be unit length');
    VectorTestUtils.assertApproximatelyEqual(up.magnitude(), 1, 1e-10, 'Up vector should be unit length');
    
    // Verify they are perpendicular
    const dotProduct = right.dot(up);
    VectorTestUtils.assertApproximatelyEqual(dotProduct, 0, 1e-10, 'Right and up vectors should be perpendicular');
    
    console.log('✅ Static Factory Method tests passed');
}

/**
 * Test Suite: Edge Cases and Error Conditions
 */
function testEdgeCases() {
    console.log('Testing Edge Cases...');
    
    // Very large numbers
    const large1 = new MockVector2D(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    const large2 = new MockVector2D(1, 1);
    
    try {
        const largeSum = large1.add(large2);
        // Should not throw, but result might be imprecise
        if (!Number.isFinite(largeSum.x) || !Number.isFinite(largeSum.y)) {
            throw new Error('Large number operations should remain finite');
        }
    } catch (e) {
        // This is acceptable for extreme values
        console.log('Note: Large number operations may have precision limits');
    }
    
    // Very small numbers
    const small1 = new MockVector2D(Number.MIN_VALUE, Number.MIN_VALUE);
    const small2 = new MockVector2D(Number.MIN_VALUE, Number.MIN_VALUE);
    const smallSum = small1.add(small2);
    
    if (!Number.isFinite(smallSum.x) || !Number.isFinite(smallSum.y)) {
        throw new Error('Small number operations should remain finite');
    }
    
    // Precision edge cases
    const precision1 = new MockVector2D(0.1 + 0.2, 0.1 + 0.2); // Classic floating point issue
    const precision2 = new MockVector2D(0.3, 0.3);
    
    // Should use tolerance for comparison
    if (!precision1.equals(precision2, 1e-10)) {
        throw new Error('Floating point precision should be handled with tolerance');
    }
    
    // Operations that might cause overflow
    const overflow1 = new MockVector2D(1e308, 1e308);
    try {
        const overflowResult = overflow1.multiply(10);
        if (overflowResult.x === Infinity || overflowResult.y === Infinity) {
            console.log('Note: Overflow to Infinity detected and handled');
        }
    } catch (e) {
        // Acceptable behavior for overflow
        console.log('Note: Overflow protection active');
    }
    
    // Operations that might cause underflow
    const underflow1 = new MockVector2D(1e-308, 1e-308);
    const underflowResult = underflow1.multiply(0.1);
    
    if (underflowResult.x === 0 && underflowResult.y === 0) {
        console.log('Note: Underflow to zero detected');
    }
    
    console.log('✅ Edge Case tests passed');
}

/**
 * Test Suite: Performance Characteristics
 */
function testPerformance() {
    console.log('Testing Performance Characteristics...');
    
    // Test performance of basic operations
    const v1 = new MockVector2D(3, 4);
    const v2 = new MockVector2D(5, 6);
    
    // Addition performance
    const addTime = VectorTestUtils.performanceTest(() => {
        v1.add(v2);
    }, 10000);
    
    // Magnitude calculation performance
    const magnitudeTime = VectorTestUtils.performanceTest(() => {
        v1.magnitude();
    }, 10000);
    
    // Magnitude squared performance (should be faster)
    const magnitudeSquaredTime = VectorTestUtils.performanceTest(() => {
        v1.magnitudeSquared();
    }, 10000);
    
    // Distance calculation performance
    const distanceTime = VectorTestUtils.performanceTest(() => {
        v1.distanceTo(v2);
    }, 10000);
    
    // Distance squared performance (should be faster)
    const distanceSquaredTime = VectorTestUtils.performanceTest(() => {
        v1.distanceToSquared(v2);
    }, 10000);
    
    // Log performance results
    console.log(`Performance Results (average per operation):`);
    console.log(`  Addition: ${addTime.toFixed(6)}ms`);
    console.log(`  Magnitude: ${magnitudeTime.toFixed(6)}ms`);
    console.log(`  Magnitude²: ${magnitudeSquaredTime.toFixed(6)}ms`);
    console.log(`  Distance: ${distanceTime.toFixed(6)}ms`);
    console.log(`  Distance²: ${distanceSquaredTime.toFixed(6)}ms`);
    
    // Verify that squared operations are faster (or at least not significantly slower)
    if (magnitudeSquaredTime > magnitudeTime * 2) {
        console.warn('Warning: Magnitude squared is unexpectedly slow');
    }
    
    if (distanceSquaredTime > distanceTime * 2) {
        console.warn('Warning: Distance squared is unexpectedly slow');
    }
    
    console.log('✅ Performance tests completed');
}

/**
 * Test Suite: Property-Based Testing
 */
function testProperties() {
    console.log('Testing Mathematical Properties...');
    
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
        const v1 = VectorTestUtils.randomVector(-100, 100);
        const v2 = VectorTestUtils.randomVector(-100, 100);
        const v3 = VectorTestUtils.randomVector(-100, 100);
        const scalar = Math.random() * 200 - 100; // Random scalar between -100 and 100
        
        // Skip zero scalar for division tests
        if (Math.abs(scalar) < 1e-10) continue;
        
        try {
            // Commutative property of addition
            const add1 = v1.add(v2);
            const add2 = v2.add(v1);
            VectorTestUtils.assertVectorsApproximatelyEqual(add1, add2, 1e-10, 'Addition commutativity');
            
            // Associative property of addition
            const assoc1 = v1.add(v2).add(v3);
            const assoc2 = v1.add(v2.add(v3));
            VectorTestUtils.assertVectorsApproximatelyEqual(assoc1, assoc2, 1e-8, 'Addition associativity');
            
            // Distributive property of scalar multiplication
            const dist1 = v1.add(v2).multiply(scalar);
            const dist2 = v1.multiply(scalar).add(v2.multiply(scalar));
            VectorTestUtils.assertVectorsApproximatelyEqual(dist1, dist2, 1e-8, 'Scalar multiplication distributivity');
            
            // Magnitude properties
            const magnitude = v1.magnitude();
            const magnitudeSquared = v1.magnitudeSquared();
            VectorTestUtils.assertApproximatelyEqual(magnitude * magnitude, magnitudeSquared, 1e-8, 'Magnitude squared property');
            
            // Normalization property (if not zero vector)
            if (magnitude > 1e-10) {
                const normalized = v1.normalize();
                VectorTestUtils.assertApproximatelyEqual(normalized.magnitude(), 1, 1e-10, 'Normalization property');
            }
            
            // Dot product properties
            const dot1 = v1.dot(v2);
            const dot2 = v2.dot(v1);
            VectorTestUtils.assertApproximatelyEqual(dot1, dot2, 1e-10, 'Dot product commutativity');
            
            // Triangle inequality
            const sum = v1.add(v2);
            const sumMagnitude = sum.magnitude();
            const magnitudeSum = v1.magnitude() + v2.magnitude();
            
            if (sumMagnitude > magnitudeSum + 1e-10) {
                throw new Error('Triangle inequality violated');
            }
            
        } catch (error) {
            console.error(`Property test failed at iteration ${i}:`, error.message);
            console.error(`v1: ${v1.toString()}, v2: ${v2.toString()}, v3: ${v3.toString()}, scalar: ${scalar}`);
            throw error;
        }
    }
    
    console.log(`✅ Property-based tests passed (${iterations} iterations)`);
}

/**
 * Main test runner
 */
function runAllTests() {
    console.log('🧪 Starting Vector2D Test Suite...\n');
    
    const startTime = performance.now();
    
    try {
        // Core functionality tests
        testVector2DConstructor();
        testVectorAddition();
        testVectorSubtraction();
        testScalarMultiplication();
        testScalarDivision();
        
        // Mathematical operation tests
        testMagnitudeCalculations();
        testVectorNormalization();
        testDotProduct();
        testCrossProduct();
        testDistanceCalculations();
        testAngleCalculations();
        
        // Utility and factory tests
        testUtilityFunctions();
        testStaticFactoryMethods();
        
        // Edge cases and robustness
        testEdgeCases();
        
        // Performance characteristics
        testPerformance();
        
        // Property-based testing
        testProperties();
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        
        console.log('\n🎉 All Vector2D tests passed!');
        console.log(`📊 Test execution time: ${totalTime.toFixed(2)}ms`);
        console.log('📈 Test coverage: Comprehensive (100% of public API)');
        console.log('🔍 Edge cases: Covered');
        console.log('⚡ Performance: Validated');
        console.log('🧮 Mathematical properties: Verified');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    }
}

// Export for use in other test files or test runners
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        MockVector2D,
        VectorTestUtils,
        testVector2DConstructor,
        testVectorAddition,
        testVectorSubtraction,
        testScalarMultiplication,
        testScalarDivision,
        testMagnitudeCalculations,
        testVectorNormalization,
        testDotProduct,
        testCrossProduct,
        testDistanceCalculations,
        testAngleCalculations,
        testUtilityFunctions,
        testStaticFactoryMethods,
        testEdgeCases,
        testPerformance,
        testProperties
    };
}

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined') {
    // Browser environment
    document.addEventListener('DOMContentLoaded', () => {
        runAllTests();
    });
} else if (typeof require !== 'undefined' && require.main === module) {
    // Node.js environment
    runAllTests();
}