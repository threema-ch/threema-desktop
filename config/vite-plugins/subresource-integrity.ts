import {createHash, type BinaryLike} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import * as v from '@badrap/valita';
import type {
    Plugin,
    IndexHtmlTransformContext,
    IndexHtmlTransformResult,
    ResolvedConfig,
} from 'vite';

import type {u53} from '~/common/types';

import {assert, unreachable} from '../../tools/assert';

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

export function subresourceIntegrityPlugin(): Plugin {
    let config: ResolvedConfig;

    return {
        name: 'subresource-integrity',
        enforce: 'post',
        apply: 'build',
        configResolved(resolvedConfig): void {
            // Store the resolved config.
            config = resolvedConfig;
        },
        transform: {
            order: 'post',
            handler: (code, id) => {
                // Only transform `electron-main.ts` (part of the "electron-main" entry point).
                if (!id.endsWith('electron-main.ts')) {
                    return code;
                }

                const appOutPath = path.join(__dirname, '..', config.build.outDir, '..', 'app');

                // Collect fingerprints for all script tags found in `index.html` (both inline and
                // external) for the Electron renderer's Content-Security-Policy.
                const indexHtml = fs.readFileSync(path.join(appOutPath, 'index.html'), {
                    encoding: 'utf-8',
                });
                const scripts: string[] = [];
                forAllTagsOfType('script', indexHtml, ({attributes}) => {
                    const fingerprint = attributes.find(({key}) => key === 'integrity')?.value;
                    if (fingerprint === undefined) {
                        throw new Error('Script tag without integrity fingerprint found');
                    }

                    scripts.push(fingerprint);
                });

                const stylesheets: string[] = [];
                forAllTagsOfType('link', indexHtml, ({attributes}) => {
                    // Skip non-stylesheet tags.
                    if (
                        !attributes.some(({key, value}) => key === 'rel' && value === 'stylesheet')
                    ) {
                        return;
                    }

                    const fingerprint = attributes.find(({key}) => key === 'integrity')?.value;
                    if (fingerprint === undefined) {
                        throw new Error('Stylesheet link tag without integrity fingerprint found');
                    }

                    stylesheets.push(fingerprint);
                });
                forAllTagsOfType('style', indexHtml, ({attributes}) => {
                    const fingerprint = attributes.find(({key}) => key === 'integrity')?.value;
                    if (fingerprint === undefined) {
                        throw new Error('Inline style tag without integrity fingerprint found');
                    }

                    stylesheets.push(fingerprint);
                });

                // External assets that are not referenced in `index.html`. These haven't been
                // fingerprinted yet, so we need to find the source files in the output
                // directory of the `app` build and generate the digests manually, so we can add
                // them to the CSP as well.
                //
                // Note: These assets currently only include the two worker scripts, because
                // fingerprinting of WASM modules is not yet supported by the CSP API.
                const workers = fs
                    .readdirSync(appOutPath, {withFileTypes: true})
                    .filter((dirent) => {
                        if (!dirent.isFile()) {
                            return false;
                        }

                        const name = path.parse(dirent.name).name;
                        const extension = path.parse(dirent.name).ext;

                        return /^backend-worker-.{8}\.js|media-crypto-worker-.{8}\.js$/u.test(
                            `${name}${extension}`,
                        );
                    })
                    .map<string>((file) => {
                        const contents = fs.readFileSync(path.resolve(appOutPath, file.name));

                        return getDigest('sha512', contents);
                    });

                // Add fingerprints to `electron-main.ts`.
                return code
                    .replace(
                        /("script-src 'self')(.*)/u,
                        `$1 ${scripts.map((digest) => `'${digest}'`).join(' ')}$2`,
                    )
                    .replace(
                        /("style-src 'self')(.*)/u,
                        `$1 ${stylesheets.map((digest) => `'${digest}'`).join(' ')}$2`,
                    )
                    .replace(
                        /("worker-src 'self')(.*)/u,
                        `$1 ${workers.map((digest) => `'${digest}'`).join(' ')}$2`,
                    );
            },
        },
        // The following hook will only run when processing the "app" entry point, because it's the
        // only one with an `index.html`.
        transformIndexHtml: {
            order: 'post',
            handler: (html: string, ctx: IndexHtmlTransformContext): IndexHtmlTransformResult => {
                const bundle = ctx.bundle;
                if (bundle === undefined) {
                    throw new Error(`Vite bundle is undefined`);
                }

                // Transform script tags.
                let transformed = replaceAllTagsOfType('script', html, (match) => {
                    const url = match.attributes.find(({key}) => key === 'src')?.value;

                    // Inline script: calculate fingerprint from content.
                    if (url === undefined) {
                        assert(
                            match.type === 'regular',
                            `Inline script found, but it did not have content: ${match.raw}`,
                        );

                        return `<script integrity="${getDigest('sha512', match.content)}"${match.raw.substring(7)}`;
                    }

                    // External script: load from bundle and calculate fingerprint from file.
                    const assetKey = url.replace('./', '');
                    const bundleItem = bundle[assetKey];
                    if (bundleItem === undefined) {
                        throw new Error(
                            `Script "${assetKey}" not found in bundle! Valid keys: ${Object.keys(bundle).join(', ')}`,
                        );
                    }

                    return `<script integrity="${getDigest('sha512', bundleItem.type === 'chunk' ? bundleItem.code : bundleItem.source)}"${match.raw.substring(7)}`;
                });

                // Transform stylesheet tags.
                transformed = replaceAllTagsOfType('link', transformed, (match) => {
                    // Skip non-stylesheet tags.
                    if (
                        !match.attributes.some(
                            ({key, value}) => key === 'rel' && value === 'stylesheet',
                        )
                    ) {
                        return match.raw;
                    }
                    const url = match.attributes.find(({key}) => key === 'href')?.value;
                    assert(
                        url !== undefined,
                        `External stylesheet link found, but it was missing the "href" attribute: ${match.raw}`,
                    );

                    // External stylesheet: load from bundle and calculate fingerprint from file.
                    const assetKey = url.replace('./', '');
                    const bundleItem = bundle[assetKey];
                    if (bundleItem === undefined) {
                        throw new Error(
                            `Stylesheet "${assetKey}" not found in bundle! Valid keys: ${Object.keys(bundle).join(', ')}`,
                        );
                    }

                    return `<link integrity="${getDigest('sha512', bundleItem.type === 'chunk' ? bundleItem.code : bundleItem.source)}"${match.raw.substring(5)}`;
                });
                transformed = replaceAllTagsOfType('style', transformed, (match) => {
                    // Inline stylesheet: calculate fingerprint from content.
                    assert(
                        match.type === 'regular',
                        `Inline stylesheet found, but it did not have content: ${match.raw}`,
                    );

                    return `<style integrity="${getDigest('sha512', match.content)}"${match.raw.substring(6)}`;
                });

                return transformed;
            },
        },
    };
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
    // eslint-disable-next-line prefer-regex-literals, threema/ban-stateful-regex-flags
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
