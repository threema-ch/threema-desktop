import {createHash} from 'node:crypto';

import type {Plugin, IndexHtmlTransformContext, IndexHtmlTransformResult} from 'vite';

// See: https://github.com/yoyo930021/vite-plugin-sri3/blob/27f93ca063b3b130bd8516aeb3b9a680e369c4ea/src/index.ts.
/* eslint-disable threema/ban-stateful-regex-flags */
const EXTERNAL_CSS_RE =
    /<link[^<>]*['"]*rel['"]*=['"]*stylesheet['"]*[^<>]+['"]*href['"]*=['"]([^^ '"]+)['"][^<>]*>/gu;
const EXTERNAL_SCRIPT_RE = /<script[^<>]*['"]*src['"]*=['"]*([^ '"]+)['"]*[^<>]*><\/script>/gu;
/* eslint-enable threema/ban-stateful-regex-flags */

export function subresourceIntegrityPlugin(): Plugin {
    return {
        name: 'subresource-integrity',
        enforce: 'post',
        apply: 'build',
        transformIndexHtml: {
            order: 'post',
            handler: (html: string, ctx: IndexHtmlTransformContext): IndexHtmlTransformResult => {
                if (ctx.bundle === undefined) {
                    throw new Error(`Vite bundle is undefined`);
                }

                let transformed = html;

                // Add integrity to `script` tags.
                transformed = replaceAssetTags(
                    'script',
                    transformed,
                    ctx.bundle,
                    (match, url, bundleItem) => {
                        const fingerprint = getDigest(
                            'sha512',
                            bundleItem.type === 'chunk' ? bundleItem.code : bundleItem.source,
                        );

                        return `<script integrity="${fingerprint}" ${match.substring(8)}`;
                    },
                );

                // Add integrity to CSS stylesheet imports.
                transformed = replaceAssetTags(
                    'stylesheet',
                    transformed,
                    ctx.bundle,
                    (match, url, bundleItem) => {
                        const fingerprint = getDigest(
                            'sha512',
                            bundleItem.type === 'chunk' ? bundleItem.code : bundleItem.source,
                        );

                        return `<link integrity="${fingerprint}" ${match.substring(6)}`;
                    },
                );

                return transformed;
            },
        },
    };
}

/**
 * Returns the given {@link html} source with the tags of the given {@link type} replaced according
 * to the given {@link transform} function.
 *
 * @param type The type of tags to replace: `"script"` for `<script>` tags, `"stylesheet"` for
 *   `<link rel="stylesheet">` tags.
 * @param html Source HTML to parse and replace tags in.
 * @param bundle Vite {@link OutputBundle}.
 * @param transform Transform function that returns the new code to replace the matched tag with.
 * @returns The transformed HTML.
 */
function replaceAssetTags(
    type: 'script' | 'stylesheet',
    html: string,
    bundle: NonNullable<IndexHtmlTransformContext['bundle']>,
    transform: (
        /**
         * HTML markup of the matched tag.
         */
        match: string,
        /**
         * Matched asset url that is part of the tag, for convenience.
         */
        url: string,
        /**
         * The asset from {@link OutputBundle} which belongs to `url`.
         */
        bundleItem: NonNullable<IndexHtmlTransformContext['bundle']>[string],
    ) => string,
): string {
    return html.replaceAll(
        type === 'script' ? EXTERNAL_SCRIPT_RE : EXTERNAL_CSS_RE,
        (match, url: string, ...args) => {
            const assetKey = url.replace('./', '');
            const bundleItem = bundle[assetKey];
            if (bundleItem === undefined) {
                throw new Error(
                    `Asset "${assetKey}" not found in bundle! Valid keys: ${Object.keys(bundle).join(', ')}`,
                );
            }

            return transform(match, url, bundleItem);
        },
    );
}

/**
 * Returns the base64-encoded digest of the given source text.
 *
 * @param algorithm The hashing algorithm to use, e.g. `"sha512"`.
 * @param source The source text to hash.
 */
function getDigest(algorithm: string, source: string | Uint8Array): string {
    return `${algorithm}-${createHash(algorithm).update(source).digest('base64')}`;
}
