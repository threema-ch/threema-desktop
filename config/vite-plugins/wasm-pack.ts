import debug from 'debug';
import path from 'path';
import {type Plugin, type UserConfig} from 'vite';
import {type TransformResult} from 'vite/node_modules/rollup/dist/rollup.js';

export function wasmPackPlugin(packages: string[]): Plugin {
    const log = debug('vite-plugin-wasm-pack');

    return {
        name: 'vite-plugin-wasm-pack',
        enforce: 'pre',

        config(config: UserConfig): UserConfig {
            // Disable optimisation for the packages since we cannot transform optimised
            // dependencies.
            return {
                ...config,
                optimizeDeps: {
                    ...config.optimizeDeps,
                    exclude: [...(config.optimizeDeps?.exclude ?? []), ...packages],
                },
            };
        },

        transform(code, id): TransformResult {
            if (!packages.some((package_) => id.includes(package_))) {
                return null;
            }

            // Vite does some weird transforming when optimizing dependencies and appends version
            // strings as URL parameters at the end, for example:
            // `/[...]/node_modules/.vite/env-paths.js?v=1ddea99e`
            const [modulePath] = id.split('?', 1);

            // Rewrite the WASM file path to use `new URL`.
            //
            // See Vite docs for details on how it works:
            // https://vitejs.dev/guide/assets.html#new-url-url-import-meta-url
            const wasmFile = path.basename(modulePath).replace('.js', '_bg.wasm');
            let replaced = false;
            code = code.replace(/(?<prefix>input\s*=\s*)[^\n;]+;/u, (_, prefix: string) => {
                replaced = true;
                // DUCT TAPE ALARM! ${'import'} is necessary because Vite rewrites import.* in
                // plugins...
                return `${prefix}new URL('./${wasmFile}', ${'import'}.meta.url).href;`;
            });
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!replaced) {
                throw new Error(`Unable to replace wasm-pack-ed input file reference: ${id}`);
            }
            log('transform', id);
            return {code};
        },
    };
}
