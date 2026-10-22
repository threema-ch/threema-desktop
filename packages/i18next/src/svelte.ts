import type {Plugin} from 'i18next-cli';
import {parse, preprocess, type PreprocessorGroup} from 'svelte/compiler';

/**
 * Options for the plugin created by {@link createSveltePlugin}.
 */
export interface SveltePluginOptions {
    /**
     * Preprocessors to run on each component before parsing it, usually the `preprocess` option of
     * the app's Svelte config.
     *
     * Note: This is required if components contain markup that the Svelte parser cannot handle on
     * its own (e.g. SCSS in `<style>` blocks).
     */
    readonly preprocess?: PreprocessorGroup | PreprocessorGroup[];
}

/**
 * Minimal shape of the nodes of the Svelte AST that are relevant for extraction.
 */
interface Node {
    readonly type: string;
    readonly start: number;
    readonly end: number;
    readonly data: string;
}

function isNode(value: object): value is Node {
    return typeof (value as Partial<Node>).type === 'string';
}

/**
 * Recursively collects the source code of all outermost call expressions and the content of all
 * HTML comments in the given Svelte template (sub-)tree, and appends them to `chunks`.
 */
function collectTemplateCode(value: unknown, code: string, chunks: string[]): void {
    if (typeof value !== 'object' || value === null) {
        return;
    }

    if (isNode(value)) {
        if (value.type === 'CallExpression') {
            // Note: Nested calls are part of the source of the outermost call, so they don't need
            // to be collected separately.
            chunks.push(`${code.slice(value.start, value.end)};`);
            return;
        }
        if (value.type === 'Comment') {
            // Keys in commented-out markup should be kept, so the comment is converted to a JS
            // comment, which i18next-cli also extracts keys from.
            chunks.push(`/* ${value.data.replaceAll('*/', '* /')} */`);
            return;
        }
    }

    for (const child of Object.values(value)) {
        collectTemplateCode(child, code, chunks);
    }
}

/**
 * Creates an i18next-cli plugin which allows extracting translation keys from Svelte components.
 *
 * The plugin turns each `.svelte` file into TypeScript code consisting of the contents of all
 * `<script>` blocks, followed by all call expressions and HTML comments of the template. The code
 * is taken verbatim from the (preprocessed) source, so no AST needs to be printed.
 *
 * Note: The scopes of the template (e.g. `{#each}` or `{#snippet}` blocks) are not preserved, so
 * namespaces or key prefixes resolved from scope (e.g. via `useTranslation`) are not supported.
 */
export function createSveltePlugin(options: SveltePluginOptions = {}): Plugin {
    return {
        name: 'threema-svelte',

        async onLoad(code, path) {
            if (!path.endsWith('.svelte')) {
                return undefined;
            }

            const preprocessed = (
                await preprocess(code, options.preprocess ?? [], {filename: path})
            ).code;
            const ast = parse(preprocessed, {filename: path, modern: true});

            const chunks: string[] = [];
            // Note: The parser omits missing scripts, even though the types claim they are `null`,
            // so both are normalized to `undefined`.
            for (const script of [ast.module ?? undefined, ast.instance ?? undefined]) {
                if (script !== undefined) {
                    // Note: Svelte adds source offsets to all JS nodes, but they are missing in the
                    // `estree` types.
                    const {start, end} = script.content as typeof script.content &
                        Pick<Node, 'start' | 'end'>;
                    chunks.push(preprocessed.slice(start, end));
                }
            }
            collectTemplateCode(ast.fragment, preprocessed, chunks);

            return chunks.join('\n');
        },
    };
}
