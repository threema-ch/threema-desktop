import debug from 'debug';
import {type Plugin} from 'vite';

import {unreachable} from '~/common/utils/assert';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';

/**
 * IMPORTANT: This and the previous approach did not work! What we need to do
 *            is post-build injection:
 *
 * 1. Start the 'app' build. This will create a 'service-worker' build as a
 *    child build
 * 2. Write a placeholder into the 'service-worker' build and finish it
 * 3. Gather all output files of the 'app' build and finish the 'app' build
 * 4. Replace the placeholder of the resulting 'service-worker' build with
 *    the gathered 'app' output files
 */

const PLACEHOLDER = '__OUTPUT_FILES_PLACEHOLDER__' as const;

export type GatheredOutputFiles = readonly string[];

export function gatherOutputFilesPlugin(): {
    plugin: Plugin;
    outputFiles: Promise<GatheredOutputFiles>;
} {
    const log = debug('vite-plugin-gather-output-files');
    const outputFiles = new ResolvablePromise<GatheredOutputFiles>();
    const plugin: Plugin = {
        name: 'vite-plugin-gather-output-files',

        generateBundle(_, bundle): void {
            // Gather file names
            const files = Object.values(bundle).map((entry) => entry.fileName);
            log(`Gathered ${files.length} output files`);
            outputFiles.resolve(files);
        },

        closeBundle(): void {
            // Reject in case the files have not been gathered at this point
            const message = 'Could not gather files, bundler probably errored';
            log(message);
            outputFiles.reject(new Error(message));
        },
    };
    return {
        plugin,
        outputFiles,
    };
}

export function injectOutputFilesPlugin(
    outputFiles: Promise<GatheredOutputFiles>,
    extensions: string[] = ['js'],
): Plugin {
    const log = debug('vite-plugin-inject-output-files');
    return {
        name: 'vite-plugin-inject-output-files',

        // eslint-disable-next-line @typescript-eslint/ban-types
        resolveImportMeta(prop): string | null {
            if (prop !== 'outputFiles') {
                return null;
            }
            return PLACEHOLDER;
        },

        async generateBundle(_, bundle): Promise<void> {
            const code = JSON.stringify(await outputFiles, undefined, 0);

            function replace<T>(file: string, source: T): T | string {
                if (typeof source !== 'string') {
                    return source;
                }
                let replaced = 0;
                const result = source.replaceAll(PLACEHOLDER, () => {
                    ++replaced;
                    return code;
                });
                if (replaced > 0) {
                    log(`Injected output files into ${file} (${replaced} occurrences)`);
                }
                return result;
            }

            // Inject into relevant sections
            for (const entry of Object.values(bundle)) {
                if (!extensions.some((extension) => entry.fileName.endsWith(extension))) {
                    continue;
                }
                switch (entry.type) {
                    case 'asset':
                        entry.source = replace(entry.fileName, entry.source);
                        break;
                    case 'chunk':
                        entry.code = replace(entry.fileName, entry.code);
                        break;
                    default:
                        unreachable(entry);
                }
            }
        },
    };
}
