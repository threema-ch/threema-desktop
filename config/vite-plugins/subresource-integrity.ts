import {createHash, type BinaryLike} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import * as v from '@badrap/valita';
import debug from 'debug';
import type {Plugin, ResolvedConfig} from 'vite';

import type {u53} from '~/common/types';

import {assert, unreachable} from '../../tools/assert';

export interface SubresourceIntegrityPluginOptions {
    /**
     * {@link RegExp} to match script files in the output bundle for fingerprinting. The integrity
     * hashes will be added to the `script-src` CSP rule in `electron-main.cjs`, and (if needed) to
     * the `index.html`.
     *
     * Note:
     * - Scripts that are not matched will not be added to the CSP and will therefore not be allowed
     *   to load at runtime.
     * - Inline content of `<script>` tags found in `index.html` will be fingerpinted automatically.
     */
    readonly scriptRegExp: RegExp;
    /**
     * {@link RegExp} to match stylesheet files in the output bundle for fingerprinting. The
     * integrity hashes will be added to the `style-src` CSP rule in `electron-main.cjs`, and (if
     * needed) to the `index.html`.
     *
     * Note:
     * - Stylesheets that are not matched will not be added to the CSP and will therefore not be
     *   allowed to load at runtime.
     * - Inline content of `<style>` tags found in `index.html` will be fingerpinted automatically.
     */
    readonly stylesheetRegExp: RegExp;
    /**
     * {@link RegExp} to match worker script files in the output bundle to include their URI in the
     * `worker-src` CSP rule. This is technically not SRI, but prevents additional workers from
     * being spawned (from different paths than the pinned ones). Note: "true" SRI (fingerprinting
     * by file hash) is not possible yet for `worker-src` (and maybe never will be), see:
     * https://issues.chromium.org/issues/41475753.
     */
    readonly workerRegExp: RegExp;
}

export function subresourceIntegrityPlugin(options: SubresourceIntegrityPluginOptions): Plugin {
    let config: ResolvedConfig;

    const log = debug('vite-plugin-subresource-integrity');

    return {
        name: 'subresource-integrity',
        enforce: 'post',
        apply: 'build',
        configResolved(resolvedConfig) {
            // Store the resolved config.
            config = resolvedConfig;
        },
        // Hook into `closeBundle` to make sure the transformations happen after all other plugins,
        // including `vite:build-import-analysis` (which is responsible for dynamic imports).
        // Unfortunately, this means that the files in the output bundle have to be read manually.
        closeBundle: {
            sequential: true,
            order: 'post',
            handler() {
                const baseOutDir = path.join(__dirname, '..', config.build.outDir, '..');
                const appOutDir = path.join(baseOutDir, 'app');
                const electronMainOutDir = path.join(baseOutDir, 'electron-main');

                // Transform `index.html`.
                const appEntryPointBundle = readDirToBundle(appOutDir);
                const indexHtmlFile = appEntryPointBundle.find((asset) =>
                    /^index.html$/u.test(asset.filename),
                );
                if (indexHtmlFile === undefined) {
                    throw new Error(
                        formatLogOrError(
                            `File "index.html" could not be found in the output bundle`,
                        ),
                    );
                }
                log(formatLogOrError(`Transforming "index.html"`));
                const transformedIndexHtml = transformIndexHtml(
                    indexHtmlFile.content.toString('utf-8'),
                    appEntryPointBundle,
                    options,
                    log,
                );
                assert(
                    indexHtmlFile.content.toString('utf-8') !== transformedIndexHtml,
                    `Expected content of "index.html" to be different after the transformation`,
                );

                // Transform `electron-main.cjs`.
                const electronMainEntryPointBundle = readDirToBundle(electronMainOutDir);
                const electronMainFile = electronMainEntryPointBundle.find((asset) =>
                    /^electron-main.cjs$/u.test(asset.filename),
                );
                if (electronMainFile === undefined) {
                    throw new Error(
                        formatLogOrError(
                            `File "electron-main.cjs" could not be found in the output bundle`,
                        ),
                    );
                }
                log(formatLogOrError(`Transforming "electron-main.cjs"`));
                const transformedElectronMain = transformElectronMain(
                    electronMainFile.content.toString('utf-8'),
                    transformedIndexHtml,
                    appEntryPointBundle,
                    options,
                    log,
                );
                assert(
                    electronMainFile.content.toString('utf-8') !== transformedElectronMain,
                    `Expected content of "index.html" to be different after the transformation`,
                );

                log(formatLogOrError(`Overriding "index.html" and "electron-main.cjs"`));
                fs.writeFileSync(
                    path.join(appOutDir, indexHtmlFile.filename),
                    transformedIndexHtml,
                    {encoding: 'utf-8'},
                );
                fs.writeFileSync(
                    path.join(electronMainOutDir, electronMainFile.filename),
                    transformedElectronMain,
                    {encoding: 'utf-8'},
                );
                log(formatLogOrError('Successfully completed'));
            },
        },
    };
}

/**
 * A single bundle asset, e.g., a `.js` file.
 */
interface Asset {
    /**
     * File name including extension, e.g., `index.html` or `index-12345678.js`.
     */
    readonly filename: string;
    /**
     * File contents.
     */
    readonly content: Buffer;
    /**
     * SHA-512 digest of the file contents.
     */
    readonly digest: string;
}

/**
 * A bundle of {@link Asset}s.
 */
type Bundle = Asset[];

/*
 * Matches attributes of an HTML tag and captures their individual parts in the following groups:
 *  - `key`: The attribute's key, e.g. `href`.
 *  - `quotation_mark`: The type of quotation mark which encloses the value: `"`, `'`, or
 *    `undefined`.
 *  - `quoted_value`: The value of the attribute if it's enclosed in quotes, excluding the quotes
 *    themselves (e.g., `bar` if the attribute is `foo="bar"`). `undefined` otherwise.
 *  - `unquoted_value`: The value of the attribute if it's unquoted (e.g., `bar` if the attribute is
 *    `foo=bar`). `undefined` otherwise.
 */
const TAG_ATTRIBUTE_REGEX =
    // eslint-disable-next-line threema/ban-stateful-regex-flags
    /(?:\s)(?<key>[^\s<>]+?(?=\s|="|='|=))(?:(?=\s)|(?:=(?<quotation_mark>['"])(?<quoted_value>[\s\S]*?)(?=\2))|(?:=(?<unquoted_value>[^\s>]*)))/gmu;

/**
 * Transforms the given file content of `electron-main` to insert integrity hashes and returns the
 * transformed file content as a `string`.
 */
function transformElectronMain(
    content: string,
    transformedIndexHtmlContent: string,
    appEntryPointBundle: Bundle,
    config: Pick<
        SubresourceIntegrityPluginOptions,
        'scriptRegExp' | 'stylesheetRegExp' | 'workerRegExp'
    >,
    log: debug.Debugger,
): string {
    const {scripts, stylesheets, workers} = filterWhitelistedAssets(appEntryPointBundle, config);

    // Collect fingerprints for all scripts and stylesheets found in `index.html` and:
    // - Add hashes for inline scripts to the CSP.
    // - Verify hashes for external scripts to match the ones of the whitelisted scripts.
    const inlineScriptDigests: string[] = [];
    const inlineStylesheetDigests: string[] = [];
    forAllTagsOfType('script', transformedIndexHtmlContent, (match) => {
        const url = match.attributes.find(({key}) => key === 'src')?.value;
        const fingerprint = match.attributes.find(({key}) => key === 'integrity')?.value;

        // Inline script or `importmap`: add hash.
        if (
            url === undefined ||
            match.attributes.some(({key, value}) => key === 'type' && value === 'importmap')
        ) {
            if (fingerprint === undefined) {
                throw new Error('Script tag without integrity fingerprint found');
            }

            inlineScriptDigests.push(fingerprint);
            return;
        }

        // External script: validate hash against whitelist.
        if (!scripts.some((asset) => asset.digest === fingerprint)) {
            throw new Error(
                'Fingerprint found in "index.html" for non-whitelisted external script',
            );
        }
    });
    forAllTagsOfType('link', transformedIndexHtmlContent, ({attributes}) => {
        // Skip non-stylesheet tags.
        if (!attributes.some(({key, value}) => key === 'rel' && value === 'stylesheet')) {
            return;
        }

        // External stylesheet: validate hash against whitelist.
        const fingerprint = attributes.find(({key}) => key === 'integrity')?.value;
        if (fingerprint === undefined) {
            throw new Error('Stylesheet link tag without integrity fingerprint found');
        }
        if (!stylesheets.some((asset) => asset.digest === fingerprint)) {
            throw new Error(
                'Fingerprint found in "index.html" for non-whitelisted external stylesheet',
            );
        }
    });
    forAllTagsOfType('style', transformedIndexHtmlContent, ({attributes}) => {
        // Inline stylesheet: add hash.
        const fingerprint = attributes.find(({key}) => key === 'integrity')?.value;
        if (fingerprint === undefined) {
            throw new Error('Inline style tag without integrity fingerprint found');
        }

        inlineStylesheetDigests.push(fingerprint);
    });

    // Add fingerprints to `electron-main.ts`.
    return (
        content
            .replace(
                /("script-src)(.*)/u,
                `$1 ${[...scripts, ...inlineScriptDigests]
                    .map((scriptOrDigest) => {
                        if (typeof scriptOrDigest === 'string') {
                            return `'${scriptOrDigest}'`;
                        }

                        log(
                            formatLogOrError(
                                `Adding script "${scriptOrDigest.filename}" to "script-src" with digest: ${scriptOrDigest.digest}`,
                            ),
                        );

                        return `'${scriptOrDigest.digest}'`;
                    })
                    .join(' ')}$2`,
            )
            .replace(
                /("style-src)(.*)/u,
                `$1 ${[...stylesheets, ...inlineStylesheetDigests]
                    .map((stylesheetOrDigest) => {
                        if (typeof stylesheetOrDigest === 'string') {
                            return `'${stylesheetOrDigest}'`;
                        }

                        log(
                            formatLogOrError(
                                `Adding stylesheet "${stylesheetOrDigest.filename}" to "style-src" with digest: ${stylesheetOrDigest.digest}`,
                            ),
                        );

                        return `'${stylesheetOrDigest.digest}'`;
                    })
                    .join(' ')}$2`,
            )
            // URIs of scripts used to spawn workers.
            .replace(
                /("worker-src)(.*)/u,
                `$1 ${workers
                    .map(({filename}) => {
                        const uri = `threemadesktop://app/${filename}`;

                        log(
                            formatLogOrError(
                                `Adding worker "${filename}" to "worker-src" with URI: ${uri}`,
                            ),
                        );

                        return uri;
                    })
                    .join(' ')}$2`,
            )
    );
}

/**
 * Transforms the given file content of `index.html` to insert integrity hashes and returns the
 * transformed file content as a `string`.
 */
function transformIndexHtml(
    html: string,
    appEntryPointBundle: Bundle,
    config: Pick<
        SubresourceIntegrityPluginOptions,
        'scriptRegExp' | 'stylesheetRegExp' | 'workerRegExp'
    >,
    log: debug.Debugger,
): string {
    const {scripts, stylesheets} = filterWhitelistedAssets(appEntryPointBundle, config);

    // Transform script tags.
    let transformed = replaceAllTagsOfType('script', html, (match) => {
        const url = match.attributes.find(({key}) => key === 'src')?.value;

        // Inline script: calculate fingerprint from content.
        if (url === undefined) {
            assert(
                match.type === 'regular',
                `Inline script found, but it did not have content: ${match.raw}`,
            );
            const digest = getDigest('sha512', normalizeEol(match.content));

            log(formatLogOrError(`Adding digest for inline script in "index.html": ${digest}`));

            return `<script integrity="${digest}"${match.raw.substring(7)}`;
        }

        // External script: get fingerprint from bundle asset.
        const assetKey = url.replace('./', '');
        const script = scripts.find((asset) => asset.filename === assetKey);
        if (script === undefined) {
            throw new Error(
                `Script "${assetKey}" not found in whitelisted assets! If this is a new file, make sure to whitelist it in the plugin options. Whitelisted scripts: ${scripts.map((asset) => asset.filename).join(', ')}`,
            );
        }
        log(
            formatLogOrError(
                `Adding digest for external script "${script.filename}" in "index.html": ${script.digest}`,
            ),
        );

        return `<script integrity="${script.digest}"${match.raw.substring(7)}`;
    });

    // Transform stylesheet tags.
    transformed = replaceAllTagsOfType('link', transformed, (match) => {
        // Skip non-stylesheet tags.
        if (!match.attributes.some(({key, value}) => key === 'rel' && value === 'stylesheet')) {
            return match.raw;
        }
        const url = match.attributes.find(({key}) => key === 'href')?.value;
        assert(
            url !== undefined,
            `External stylesheet link found, but it was missing the "href" attribute: ${match.raw}`,
        );

        // External stylesheet: get fingerprint from bundle asset.
        const assetKey = url.replace('./', '');
        const stylesheet = stylesheets.find((asset) => asset.filename === assetKey);
        if (stylesheet === undefined) {
            throw new Error(
                `Stylesheet "${assetKey}" not found in whitelisted assets! If this is a new file, make sure to whitelist it in the plugin options. Whitelisted stylesheets: ${stylesheets.map((asset) => asset.filename).join(', ')}`,
            );
        }
        log(
            formatLogOrError(
                `Adding digest for external stylesheet "${stylesheet.filename}" in "index.html": ${stylesheet.digest}`,
            ),
        );

        return `<link integrity="${stylesheet.digest}"${match.raw.substring(5)}`;
    });
    transformed = replaceAllTagsOfType('style', transformed, (match) => {
        // Inline stylesheet: calculate fingerprint from content.
        assert(
            match.type === 'regular',
            `Inline stylesheet found, but it did not have content: ${match.raw}`,
        );
        const digest = getDigest('sha512', normalizeEol(match.content));

        log(formatLogOrError(`Adding digest for inline style in "index.html": ${digest}`));

        return `<style integrity="${digest}"${match.raw.substring(6)}`;
    });

    // Insert `importmap` before the first module script. This allows the scripts to be loaded as
    // dynamic modules, if needed. See: [Subresource Integrity support for ES modules, using
    // importmaps](https://chromium-review.googlesource.com/c/chromium/src/+/5441822/21..32).
    const importMap = `{ "integrity": { ${scripts.map((asset) => `"./${asset.filename}": "${asset.digest}"`).join(', ')} } }`;
    transformed = transformed.replace(
        /(.*)(<script.*type="module".*>)(.*)/u,
        `$1<script type="importmap" integrity="${getDigest('sha512', normalizeEol(importMap))}">${importMap}</script>\n$1$2$3`,
    );

    return transformed;
}

function formatLogOrError(message: string): string {
    return `[SRI]: ${message}`;
}

/**
 * Filters the given `appEntryPointBundle` and returns only the assets which are whitelisted in the
 * given plugin options.
 */
function filterWhitelistedAssets(
    appEntryPointBundle: Bundle,
    config: Pick<
        SubresourceIntegrityPluginOptions,
        'scriptRegExp' | 'stylesheetRegExp' | 'workerRegExp'
    >,
): {
    readonly scripts: Asset[];
    readonly stylesheets: Asset[];
    readonly workers: Asset[];
} {
    return {
        scripts: appEntryPointBundle.filter((asset) => config.scriptRegExp.test(asset.filename)),
        stylesheets: appEntryPointBundle.filter((asset) =>
            config.stylesheetRegExp.test(asset.filename),
        ),
        workers: appEntryPointBundle.filter((asset) => config.workerRegExp.test(asset.filename)),
    };
}

/**
 * Read the files in the given `dirPath` and return it as a {@link Bundle}. Note: This doesn't
 * traverse child directories, so the returned `Bundle` will only contain files one level deep.
 */
function readDirToBundle(dirPath: string): Bundle {
    return fs.readdirSync(dirPath, {withFileTypes: true}).flatMap<Asset>((dirent) => {
        if (!dirent.isFile()) {
            return [];
        }

        const filename = dirent.name;
        const content = fs.readFileSync(path.resolve(dirPath, dirent.name));

        return [
            {
                filename,
                content,
                digest: getDigest('sha512', new Uint8Array(content)),
            },
        ];
    });
}

/*
 * Returns a {@link RegExp} that matches HTML tags of the given type and captures their individual
 * parts in the following groups:
 *  - `opening_tag`: The tag's opening statement, including attributes, up until (but excluding) its
 *    terminator.
 *  - `opening_tag_self_terminator`: `/>` if the tag is self-closing, else `undefined`.
 *  - `opening_tag_terminator`: `undefined` if the tag is self-closing, else `>`.
 *  - `content`: Everything between the opening- and closing tag, including newlines, etc.
 *  - `closing_tag`: The tag's closing statement, which is always `</foo>` (or `undefined` for
 *    self-closing and void tags).
 */
function getTagRegexForType(type: string): RegExp {
    // eslint-disable-next-line threema/ban-stateful-regex-flags
    return new RegExp(
        `(?<opening_tag><${type}[\\s\\S]*?(?=\\w?(?:>|\\/>|<\\/${type}>)))(?:(?<opening_tag_self_terminator>\\w?\\/>)|(?:(?<opening_tag_terminator>>)(?:(?=\\s+<[^/])|(?<content>[\\s\\S]*?)(?<closing_tag><\\/\\w?${type}>))))`,
        'gmu',
    );
}

/**
 * Finds all tags of {@link type} in the given {@link html}, and calls {@link callback} for each
 * match.
 *
 * @param html The HTML source to transform.
 * @param callback The function to run for each match.
 */
function forAllTagsOfType<const T extends string>(
    type: T,
    html: string,
    callback: (
        match: ReturnType<ReturnType<typeof getTagMatchValidatorForType<T>>['parse']>,
    ) => void,
): void {
    const tagMatchValidator = getTagMatchValidatorForType(type);

    for (const match of html.matchAll(getTagRegexForType(type))) {
        const groups = match.groups;
        if (groups === undefined) {
            throw new Error('Tag match was found, but no groups were captured');
        }

        let tagMatchType: ReturnType<(typeof tagMatchValidator)['parse']>['type'] | undefined =
            undefined;
        if (
            groups.opening_tag_self_terminator === undefined &&
            groups.opening_tag_terminator === '>' &&
            groups.closing_tag !== undefined
        ) {
            tagMatchType = 'regular';
        }
        if (groups.opening_tag_self_terminator === '/>' && groups.closing_tag === undefined) {
            tagMatchType = 'self-closing';
        }
        if (groups.opening_tag_terminator === '>' && groups.closing_tag === undefined) {
            tagMatchType = 'void';
        }
        assert(tagMatchType !== undefined, `Unable to determine type of tag match "${match[0]}"`);

        switch (tagMatchType) {
            case 'regular': {
                const openingTag = `${groups.opening_tag}${groups.opening_tag_terminator}`;

                callback(
                    tagMatchValidator.parse(
                        {
                            type: tagMatchType,
                            openingTag,
                            content: groups.content,
                            closingTag: groups.closing_tag,
                            raw: match[0],
                            attributes: getAttributeMatches(openingTag),
                            startIndex: match.index,
                            endIndex: match.index + match[0].length - 1,
                        },
                        {mode: 'strict'},
                    ),
                );
                break;
            }

            case 'self-closing':
            case 'void':
                callback(
                    tagMatchValidator.parse(
                        {
                            type: tagMatchType,
                            raw: match[0],
                            attributes: getAttributeMatches(match[0]),
                            startIndex: match.index,
                            endIndex: match.index + match[0].length - 1,
                        },
                        {mode: 'strict'},
                    ),
                );
                break;

            default:
                unreachable(tagMatchType, `Unexpected tag match type "${tagMatchType}"`);
        }
    }
}

/**
 * Finds all tags of {@link type} in the given {@link html}, and replaces them using the given
 * {@link replacer} function.
 *
 * @param html The HTML source to transform.
 * @param replacer A function that returns the replacement text.
 * @returns The transformed HTML.
 */
function replaceAllTagsOfType<const T extends string>(
    type: T,
    html: string,
    replacer: (
        match: ReturnType<ReturnType<typeof getTagMatchValidatorForType<T>>['parse']>,
    ) => string,
): string {
    let transformed = html;
    let shift: u53 = 0;
    forAllTagsOfType(type, html, (match) => {
        const replacement = replacer(match);

        transformed = `${transformed.substring(0, match.startIndex + shift)}${replacement}${transformed.substring(match.endIndex + shift + 1)}`;
        shift += replacement.length - match.raw.length;
    });

    return transformed;
}

/**
 * Returns the attributes of the given HTML tag as an array. Warning: {@link tag} should be an
 * opening tag, not a full tag pair with inner content.
 *
 * @example
 * ```ts
 * const tag = `<a href="https://example.com" data-foo=true>`;
 *
 * const attributes = getAttributeMatches(tag); // [{ key: 'href', value: 'https://example.com', quotationMark: '"' }, { key: 'data-foo', value: 'true' }]
 * ```
 */
function getAttributeMatches(tag: string): readonly {
    readonly key?: string;
    readonly quotationMark?: string;
    readonly value?: string;
}[] {
    return [...tag.matchAll(TAG_ATTRIBUTE_REGEX)].map((match) => {
        if (match.groups === undefined) {
            throw new Error('Attribute match was found, but no groups were captured');
        }

        return {
            key: match.groups.key,
            quotationMark: match.groups.quotation_mark,
            value: match.groups.quoted_value ?? match.groups.unquoted_value,
        };
    });
}

/**
 * Returns the given text with all CRLF line endings replaced by `\n`, if any. Else, returns the
 * text unchanged. This is useful if the build platform is Windows, as the integrity hashes would be
 * incorrect otherwise.
 *
 * @param text Text to replace line endings in.
 */
function normalizeEol(text: string): string {
    // eslint-disable-next-line threema/ban-stateful-regex-flags
    return text.replaceAll(/\r\n/gmu, '\n');
}

/**
 * Returns the base64-encoded digest of the given source text.
 *
 * @param algorithm The hashing algorithm to use, e.g. `"sha512"`.
 * @param source The source text to hash.
 */
function getDigest(algorithm: string, source: BinaryLike): string {
    return `${algorithm}-${createHash(algorithm).update(source).digest('base64')}`;
}

/**
 * Returns a `@badrap/valita` validator for parsed tags of the given {@link type}.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getTagMatchValidatorForType<const T extends string>(type: T) {
    const sharedProperties = {
        attributes: v.array(
            v.object({
                key: v.string(),
                quotationMark: v.union(v.literal('"'), v.literal("'")).optional(),
                value: v.string().optional(),
            }),
        ),
        startIndex: v.number(),
        endIndex: v.number(),
    };

    return v.union(
        v.object({
            ...sharedProperties,
            type: v.literal('regular'),
            /**
             * The opening tag of the matched tag, e.g., `<script ...>`.
             */
            openingTag: v.string().assert((value) => isOpeningTagOfType(type, value)),
            /**
             * The entire content between the opening and closing tag, including newlines. Note: This might
             * be an empty string.
             */
            content: v.string(),
            /**
             * The closing tag of the matched tag, e.g., `</script>`.
             */
            closingTag: v.string().assert((value) => isClosingTagOfType(type, value)),
            raw: v.string().assert((value) => isTagOfType(type, value)),
        }),
        v.object({
            ...sharedProperties,
            type: v.literal('self-closing'),
            raw: v.string().assert((value) => isSelfClosingTagOfType(type, value)),
        }),
        // See: https://developer.mozilla.org/en-US/docs/Glossary/Void_element.
        v.object({
            ...sharedProperties,
            type: v.literal('void'),
            raw: v.string().assert((value) => isOpeningTagOfType(type, value)),
        }),
    );
}

function isOpeningTagOfType<const T extends string>(
    type: T,
    value: string,
): value is `<${T}${string}>` {
    return (
        !isSelfClosingTagOfType(type, value) &&
        isFullMatch(value, new RegExp(`<${type}[\\s\\S]*>`, 'mu'))
    );
}

function isClosingTagOfType<const T extends string>(type: T, value: string): value is `</${T}>` {
    return isFullMatch(value, new RegExp(`<\\/${type}>`, 'u'));
}

function isSelfClosingTagOfType<const T extends string>(
    type: T,
    value: string,
): value is `<${T}${string}/>` {
    return isFullMatch(value, new RegExp(`<${type}[\\s\\S]*\\/>`, 'mu'));
}

function isTagOfType<const T extends string>(
    type: T,
    value: string,
): value is `<${T}${string}>${string}</${T}>` {
    return (
        !isSelfClosingTagOfType(type, value) &&
        isFullMatch(value, new RegExp(`<${type}[\\s\\S]*>[\\s\\S]*<\\/${type}>`, 'mu'))
    );
}

/**
 * Returns `true` if the given {@link regex} matches the given {@link value} fully from start to
 * end, `false` otherwise.
 */
function isFullMatch(value: string, regex: RegExp): boolean {
    return value.match(regex)?.[0].length === value.length;
}
