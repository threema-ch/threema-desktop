import {createHash} from 'node:crypto';

import debug from 'debug';
import MagicString from 'magic-string';
import {type PreRenderedAsset, type TransformResult} from 'rollup';
import * as rollup from 'rollup';
import {type Plugin, type ResolvedConfig} from 'vite';

import {assert, unwrap} from '../../src/common/utils/assert';

export interface WorkerPlugin extends Plugin {
    readonly synchronizeAsset: (asset: PreRenderedAsset) => string;
}

const TS_IMPORT_META_URL_RE =
    // eslint-disable-next-line threema/ban-stateful-regex-flags
    /new\s+URL\s*\(\s*(?<url>'[^')]+.ts'|"[^")]+.ts"|`[^")]+.ts`)\s*,\s*import\.meta\.url\s*,?\s*\)/gu;
// eslint-disable-next-line threema/ban-stateful-regex-flags
const TS_IMPORT_META_ENV_BUILD_TARGET_RE = /\$\{\s*import\.meta\.env\.BUILD_TARGET\s*\}/gu;

export function tsWorkerPlugin(): WorkerPlugin {
    const log = debug('vite-plugin-ts-worker');
    let config: ResolvedConfig;
    let isDev = true;
    const assets = new Map<string, string>();

    return {
        name: 'vite-plugin-ts-worker',
        enforce: 'pre',

        configResolved(config_): void {
            config = config_;
            isDev = config_.command === 'serve';
        },

        async transform(code, id): Promise<TransformResult> {
            const results = [...code.matchAll(TS_IMPORT_META_URL_RE)];
            if (results.length === 0) {
                return null;
            }
            let source: MagicString | undefined;
            for (const result of results) {
                const {0: match, index} = result;
                let url = result.groups?.url;
                assert(index !== undefined && url !== undefined);

                // "Parse" template string and replace `import.meta.env.BUILD_TARGET` in it.
                //
                // Note: If you haven't noticed, this is super-ugly and brittle. If stuff breaks,
                //       and you wan't to complain, waddle through the pain of parsing the template
                //       literal to an AST and then back to a string. Good luck!
                if (url.startsWith('`')) {
                    const buildTarget = unwrap(config.define)[
                        'import.meta.env.BUILD_TARGET'
                    ] as unknown;
                    assert(typeof buildTarget === 'string');
                    url = url.replaceAll(
                        TS_IMPORT_META_ENV_BUILD_TARGET_RE,
                        buildTarget.slice(1, -1),
                    );
                }

                // Resolve the TS file
                url = url.slice(1, -1);
                log('resolving', url);
                const resolved = await this.resolve(url, id);
                if (resolved === null) {
                    throw Error(`Unable to resolve TS URL: ${url}`);
                }
                log('resolved', url, '->', resolved);
                let rewritten;
                if (isDev) {
                    // In dev mode, the rewritten URL is simply the original URL. Vite will take
                    // care of the rest.
                    rewritten = url;
                } else {
                    // Bundle the file as a new entry
                    const bundle = await rollup.rollup({
                        input: resolved.id,
                        plugins: config.worker.plugins,
                    });
                    try {
                        const {
                            output: [chunk],
                        } = await bundle.generate({
                            format: 'iife',
                            sourcemap: config.build.sourcemap,

                            // Duct-tape level over 9000: Keep asset file names in sync with the
                            // parent builder because for some fucking reason the hashes don't
                            // match...
                            assetFileNames: (asset) => {
                                const hash = createHash('sha256')
                                    .update(asset.source)
                                    .digest('hex')
                                    .slice(0, 8);
                                const fileName = `[name]-${hash}[extname]`;
                                assets.set(unwrap(asset.name), fileName);
                                return fileName;
                            },
                        });
                        rewritten = `__VITE_ASSET__${this.emitFile({
                            type: 'asset',
                            name: chunk.fileName,
                            source: chunk.code,
                        })}__`;
                    } finally {
                        await bundle.close();
                    }
                }

                // Overwrite the URL
                source ??= new MagicString(code);
                source.overwrite(
                    index,
                    index + match.length,
                    `new URL("${rewritten}", self.location)`,
                );
            }
            return source === undefined
                ? null
                : {
                      code: source.toString(),
                  };
        },

        synchronizeAsset(asset) {
            const fileName = assets.get(unwrap(asset.name));
            if (fileName === undefined) {
                return '[name]-[hash][extname]';
            }
            log('synchronized asset', asset.name, '->', fileName);
            return fileName;
        },
    };
}
