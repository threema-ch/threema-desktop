import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

/**
 * Size of the Vitest iframe as well as the Playwright window.
 *
 * Note: The two must match. If the page is smaller than the iframe, Vitest scales the iframe down
 * to fit, which means that rendered pixels no longer correspond to CSS pixels.
 */
const VIEWPORT = {width: 1024, height: 768};

export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        browser: {
            enabled: true,
            headless: true,
            instances: [{browser: 'chromium'}],
            provider: playwright({
                contextOptions: {
                    viewport: VIEWPORT,
                },
                launchOptions: {
                    args: [
                        /**
                         * Arguments which give the browser a deterministic set of media devices, so
                         * that tests can enumerate cameras, microphones and speakers without
                         * depending on the machine they run on.
                         *
                         * Note: `device-count` applies to cameras only. The audio devices are a
                         * fixed set of two, each with an additional entry aliasing the system
                         * default. `--use-fake-ui-for-media-stream` bypasses permission dialogs and
                         * directly grants the permission to use the devices.
                         */
                        '--use-fake-device-for-media-stream=device-count=3',
                        '--use-fake-ui-for-media-stream',
                        /**
                         * Allows playback from a page nobody interacted with.
                         */
                        '--autoplay-policy=no-user-gesture-required',

                        /**
                         * Argument which exposes `globalThis.gc`, so that a test can ask for a
                         * garbage collection explicitly.
                         */
                        '--js-flags=--expose-gc',
                    ],
                    executablePath: process.env.CHROMIUM_BIN,
                },
            }),
            viewport: VIEWPORT,
        },
        coverage: {
            exclude: ['src/utils/test/**/*'],
            include: ['src/**/*.ts'],
            // Use `istanbul` for coverage, for compatibility with `apps/desktop`.
            provider: 'istanbul',
            thresholds: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                '100': true,
            },
        },
    },
});
