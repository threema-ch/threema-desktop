import {describe, expect, it} from 'vitest';

import {ValueObject} from './value-object.js';

describe('ValueObject', () => {
    it('exposes the value it was constructed with', () => {
        // Arrange
        const value = new ValueObject(false);

        // Assert
        expect(value.value).toBe(false);
    });

    it('reflects reassignment of the value through the same reference', () => {
        // Arrange
        const value = new ValueObject(false);
        const reference = value;

        // Act
        value.value = true;

        // Assert
        expect(reference.value).toBe(true);
    });
});
