/**
 * This is a fork of vite-plugin-commonjs-externals with slight modifications.
 * See: https://github.com/xiaoxiangmoe/vite-plugin-commonjs-externals
 *
 * TODO(DESK-683): Invest the time to clean this up properly
 */

// Note: Not listed as a dependency because this is tied to vite and we take whatever we get here.
// eslint-disable-next-line import/no-extraneous-dependencies
import * as acorn from 'acorn';
import debug from 'debug';
import * as esModuleLexer from 'es-module-lexer';
import type {
    ImportDefaultSpecifier,
    ImportNamespaceSpecifier,
    ImportSpecifier,
    Program,
} from 'estree';
import MagicString from 'magic-string';
import type {TransformResult} from 'rollup';
import type {Plugin} from 'vite';

import type {u53} from '../../src/common/types';
import {assert, unwrap} from '../../src/common/utils/assert';

const log = debug('vite-plugin-cjs-externals');

function transformEsm(
    imports: readonly esModuleLexer.ImportSpecifier[],
    code: string,
    externals: readonly (string | RegExp)[],
): [rewrites: u53, result: TransformResult] {
    const imports2 = imports
        .map((i) => ({
            ...i,
            importStatement: code.substring(i.ss, i.se),
        }))
        .filter(
            ({n, d}) =>
                // Static import
                d === -1 &&
                n !== undefined &&
                externals.some((external) =>
                    // eslint-disable-next-line no-nested-ternary
                    typeof external === 'string'
                        ? external === n
                        : external instanceof RegExp
                        ? external.test(n)
                        : false,
                ),
        );

    if (imports2.length === 0) {
        return [0, null];
    }

    function requireStatement(identifiers: string, module: string): string {
        return `const ${identifiers}=(()=>{const mod = require("${module}");return mod && mod.__esModule ? mod : Object.assign(Object.create(null),mod,{default:mod,[Symbol.toStringTag]:"Module"})})();`;
    }

    let rewrites = 0;
    const magicString = new MagicString(code);
    for (const {importStatement, ss, se} of imports2) {
        const program: Program = acorn.parse(importStatement, {
            ecmaVersion: 'latest',
            sourceType: 'module',
        }) as unknown as Program; // ???
        const node = unwrap(program.body[0]);

        if (node.type !== 'ImportDeclaration') {
            continue;
        }
        const {source, specifiers} = node;

        if (source.value === undefined || typeof source.value !== 'string') {
            continue;
        }
        const module = source.value;

        if (specifiers.length === 0) {
            magicString.overwrite(ss, se, `require('${module}')`);
            ++rewrites;
            continue;
        }

        const importNamespaceSpecifierList = specifiers.filter(
            (x) => x.type === 'ImportNamespaceSpecifier',
        ) as readonly ImportNamespaceSpecifier[];

        const importDefaultSpecifierList = specifiers.filter(
            (x) => x.type === 'ImportDefaultSpecifier',
        ) as readonly ImportDefaultSpecifier[];
        const importSpecifierList = specifiers.filter(
            (x) => x.type === 'ImportSpecifier',
        ) as readonly ImportSpecifier[];

        if (importNamespaceSpecifierList.length > 1) {
            throw new Error(
                `Illegal state of importNamespaceSpecifierList: it can only have zero or one namespace import. \`${importStatement}\``,
            );
        }

        if (importDefaultSpecifierList.length > 1) {
            throw new Error(
                `Illegal state of importDefaultSpecifierList: it can only have zero or one default import. \`${importStatement}\``,
            );
        }

        const localNamesIdentifiers = [
            ...importSpecifierList.map((spec) => `${spec.imported.name}: ${spec.local.name}`),
            ...importDefaultSpecifierList.map((spec) => `default: ${spec.local.name}`),
        ].join(', ');

        if (importNamespaceSpecifierList.length === 0) {
            magicString.overwrite(ss, se, requireStatement(`{${localNamesIdentifiers}}`, module));
            ++rewrites;
            continue;
        }

        const namespaceIdentifier = unwrap(importNamespaceSpecifierList[0]).local.name;
        const namespaceRequireStatement = requireStatement(namespaceIdentifier, module);

        if (localNamesIdentifiers === '') {
            magicString.overwrite(ss, se, namespaceRequireStatement);
            ++rewrites;
            continue;
        }

        magicString.overwrite(
            ss,
            se,
            `${namespaceRequireStatement}const {${localNamesIdentifiers}}=${namespaceIdentifier};`,
        );
        ++rewrites;
    }
    return [
        rewrites,
        {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            code: magicString.toString(),
            map: magicString.generateMap(),
        },
    ];
}

export default function commonjsExternalsPlugin({
    externals,
    extensions = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'],
}: {
    externals: readonly (string | RegExp)[];
    extensions?: readonly string[];
}): Plugin {
    return {
        name: 'commonjs-externals',
        async transform(code, id): Promise<TransformResult> {
            // Vite does some weird transforming when optimizing dependencies and appends version
            // strings as URL parameters at the end, for example:
            // `/[...]/node_modules/.vite/env-paths.js?v=1ddea99e`
            const [filename] = id.split('?', 1);
            assert(filename !== undefined);
            if (!extensions.some((extension) => filename.endsWith(`.${extension}`))) {
                log(`Ignoring due to extension: ${id}`);
                return null;
            }

            await esModuleLexer.init;
            const [imports] = esModuleLexer.parse(code);
            const [rewrites, result] = transformEsm(imports, code, externals);
            if (rewrites === 0) {
                log(`No matching imports to rewrite: ${id}`);
            } else {
                log(`Rewrote ${rewrites} imports: ${id}`);
            }
            return result;
        },
    };
}
