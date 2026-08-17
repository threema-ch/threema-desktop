import * as v from '@badrap/valita';
import {describe, expect, it} from 'vitest';

import {instanceOf} from './instance-of.js';

describe('instanceOf', () => {
    it('accepts an instance of the expected type', () => {
        // Arrange
        const schema = instanceOf(Uint8Array);
        const value = Uint8Array.of(1, 2, 3);

        // Act
        const result = schema.parse(value);

        // Assert
        expect(result).toBe(value);
    });

    it('accepts an instance of a subclass of the expected type', () => {
        // Arrange
        class Base {
            public readonly kind: string = 'base';
        }
        class Derived extends Base {
            public override readonly kind = 'derived';
        }
        const schema = instanceOf(Base);
        const value = new Derived();

        // Act
        const result = schema.parse(value);

        // Assert
        expect(result).toBe(value);
    });

    it('rejects a value that is not an instance of the expected type', () => {
        // Arrange
        const schema = instanceOf(Date);

        // Act / Assert
        expect(() => schema.parse('not-a-date')).toThrow('expected an instance of Date');
    });

    it('names an anonymous type in the error message', () => {
        // Arrange
        class Anonymous {
            public readonly marker: boolean = true;
        }
        Object.defineProperty(Anonymous, 'name', {value: ''});
        const schema = instanceOf(Anonymous);

        // Act / Assert
        expect(() => schema.parse({})).toThrow('expected an instance of an anonymous type');
    });

    it('can be combined with further assertions', () => {
        // Arrange
        const schema = v.object({
            fourBytes: instanceOf(Uint8Array).assert((array) => array.byteLength === 4),
        });

        // Act / Assert
        expect(schema.parse({fourBytes: Uint8Array.of(1, 2, 3, 4)}).fourBytes).toEqual(
            Uint8Array.of(1, 2, 3, 4),
        );
        expect(() => schema.parse({fourBytes: Uint8Array.of(1, 2, 3)})).toThrow();
    });
});
