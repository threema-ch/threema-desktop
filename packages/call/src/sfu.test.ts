import {describe, expect, it} from 'vitest';

import {SfuSupportedFeatures} from './sfu.js';

describe('SfuSupportedFeatures', () => {
    it('takes the features from the initialiser', () => {
        // Act
        const features = new SfuSupportedFeatures({base: true, screenShare: true});

        // Assert
        expect(features.base).toBe(true);
        expect(features.screenShare).toBe(true);
    });

    it('offers the most restrictive feature-set', () => {
        // Act
        const features = SfuSupportedFeatures.base();

        // Assert
        expect(features.base).toBe(true);
        expect(features.screenShare).toBe(false);
    });

    // Note: The base feature is always implied, so only the screen share flag can be read off the
    // bitmask.
    it.each([
        {flags: 0n, screenShare: false},
        {flags: 1n, screenShare: true},
        {flags: 2n, screenShare: false},
        {flags: 3n, screenShare: true},
        {flags: 0xffffffffn, screenShare: true},
    ])('decodes the bitmask $flags', ({flags, screenShare}) => {
        // Act
        const features = SfuSupportedFeatures.fromBitmask(flags);

        // Assert
        expect(features.base).toBe(true);
        expect(features.screenShare).toBe(screenShare);
    });
});
