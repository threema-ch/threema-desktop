import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        coverage: {
            include: ['src/**/*.{js,ts}'],
            exclude: [
                '**/*.d.ts',
                'src/utils/test/**',
                // Note: The vendored Blake2b implementation is excluded from coverage because it
                // contains unused code that is not exposed through our `.d.ts` definition (and it
                // is covered behaviorally by the test vectors in `implementation.test.ts`).
                'src/blake2b/implementation.js',
            ],
            // Use `istanbul` for coverage, for compatibility with `apps/desktop`.
            provider: 'istanbul',
            thresholds: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                '100': true,
            },
        },
    },
});
