import {AST_NODE_TYPES, TSESTree, ESLintUtils} from '@typescript-eslint/utils';
import type {ESLintPluginThreemaDocs} from './utils.js';

const createRule = ESLintUtils.RuleCreator<ESLintPluginThreemaDocs>(
    () => 'ban-unextractable-translation-call',
);

/**
 * Returns whether the callee object is a plain member chain the i18next-cli extractor can match,
 * i.e. non-computed member accesses starting with an identifier or `this` (e.g. `this.i18n`).
 */
function isExtractableChain(node: TSESTree.Expression): boolean {
    let current = node;
    while (current.type === AST_NODE_TYPES.MemberExpression) {
        if (current.computed) {
            return false;
        }
        current = current.object;
    }
    return (
        current.type === AST_NODE_TYPES.Identifier || current.type === AST_NODE_TYPES.ThisExpression
    );
}

export default createRule({
    name: 'ban-unextractable-translation-call',
    meta: {
        type: 'problem',
        docs: {
            description:
                'Do not call `.t(...)` on an expression the i18next-cli extractor cannot resolve (e.g. `i18n.get().t(...)`), as the key would be silently missing from the translation files.',
            recommended: 'strict',
        },
        schema: [],
        messages: {
            unextractableTranslationCall:
                'The translation key of this call cannot be extracted by i18next-cli. Use `$i18n.t(...)` in Svelte components, or read `const {t} = i18n.get();` first and call `t(...)`.',
        },
        fixable: undefined,
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(esNode: TSESTree.CallExpression) {
                const callee = esNode.callee;
                if (
                    callee.type !== AST_NODE_TYPES.MemberExpression ||
                    callee.computed ||
                    callee.property.type !== AST_NODE_TYPES.Identifier ||
                    callee.property.name !== 't'
                ) {
                    return;
                }

                // Only consider calls with a literal key to avoid matching unrelated `t` methods.
                const [key] = esNode.arguments;
                const hasLiteralKey =
                    (key?.type === AST_NODE_TYPES.Literal && typeof key.value === 'string') ||
                    key?.type === AST_NODE_TYPES.TemplateLiteral;
                if (!hasLiteralKey) {
                    return;
                }

                if (!isExtractableChain(callee.object)) {
                    context.report({
                        node: esNode,
                        messageId: 'unextractableTranslationCall' as const,
                    });
                }
            },
        };
    },
});
