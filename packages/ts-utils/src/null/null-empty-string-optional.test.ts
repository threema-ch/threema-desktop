import * as v from '@badrap/valita';
import {describe, expect, it} from 'vitest';

import {nullEmptyStringOptional} from './null-empty-string-optional.js';

describe('nullEmptyStringOptional', () => {
    const schema = v.object({value: nullEmptyStringOptional(v.string())});

    it('passes a present value through', () => {
        // Act
        const result = schema.parse({value: 'hello'});

        // Assert
        expect(result.value).toBe('hello');
    });

    it('maps null to undefined', () => {
        // Act
        const result = schema.parse({value: null});

        // Assert
        expect(result.value).toBeUndefined();
    });

    it('maps an empty string to undefined', () => {
        // Act
        const result = schema.parse({value: ''});

        // Assert
        expect(result.value).toBeUndefined();
    });

    it('treats a missing property as undefined', () => {
        // Act
        const result = schema.parse({});

        // Assert
        expect(result.value).toBeUndefined();
    });

    it('rejects a value of the wrong type', () => {
        // Act / Assert
        expect(() => schema.parse({value: 42})).toThrow();
    });
});
