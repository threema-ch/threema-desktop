import {TSESTree} from '@typescript-eslint/utils';
import {ESLintUtils} from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(() => 'ban-stateful-regex-flags');

// Read this MDN article to understand why global flags are unsafe:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test#using_test_on_a_regex_with_the_global_flag
export default createRule({
    name: 'ban-stateful-regex-flags',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Ban the use of stateful flags for RegExp',
            recommended: 'recommended',
        },
        schema: [],
        messages: {
            statefulRegexFlag:
                "Do not use the stateful 'g' or 'y' flag for RegExp",
        },
        fixable: 'code',
    },
    defaultOptions: [],
    create(context) {
        return {
            'Literal[regex.flags=/g|y/u]'(
                esNode: TSESTree.Literal,
            ): void {
                context.report({
                    messageId: 'statefulRegexFlag',
                    node: esNode,
                })
            },

            'NewExpression[callee.name="RegExp"]'(esNode: TSESTree.NewExpression): void {
                const [, flags] = esNode.arguments;
                if (
                    flags !== undefined &&
                    flags.type === TSESTree.AST_NODE_TYPES.Literal &&
                    typeof flags.value === 'string' &&
                    (flags.value.includes('g') || flags.value.includes('y'))
                ) {
                    context.report({
                        messageId: 'statefulRegexFlag',
                        node: esNode,
                    })
                }
            }
        };
    },
});
