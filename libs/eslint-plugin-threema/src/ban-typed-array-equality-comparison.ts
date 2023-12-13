import {TSESTree} from '@typescript-eslint/utils';
import {ESLintUtils} from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(() => 'ban-typed-array-length');

const SUGGESTION = 'Do not compare arrays with \'{OPERATOR}\', use ~/common/utils/byte/byteEquals';

/**
 * If you're comparing two typed arrays with '===', you're probably not doing what you think you're
 * doing.
 */
export default createRule({
    name: 'ban-typed-array-equality-comparison',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Ban the comparison of two typed arrays with ===',
            recommended: 'recommended',
        },
        schema: [],
        messages: {
            typedArrayEqualityComparisonDoubleEquals: SUGGESTION.replace('{OPERATOR}', '=='),
            typedArrayEqualityComparisonTripleEquals:SUGGESTION.replace('{OPERATOR}', '==='),
            typedArrayEqualityComparisonDoubleNequals: SUGGESTION.replace('{OPERATOR}', '!='),
            typedArrayEqualityComparisonTripleNequals:SUGGESTION.replace('{OPERATOR}', '!=='),
        },
    },
    defaultOptions: [],
    create(context) {
        const parserServices = ESLintUtils.getParserServices(context);
        const typeChecker = parserServices.program.getTypeChecker();
        return {
            'BinaryExpression'(
                esNode: TSESTree.BinaryExpression,
            ): void {
                // Determine suggestion message based on operator
                let messageId;
                switch (esNode.operator) {
                    case '==':
                        messageId = 'typedArrayEqualityComparisonDoubleEquals' as const;
                        break;
                    case '===':
                        messageId = 'typedArrayEqualityComparisonTripleEquals' as const;
                        break;
                    case '!=':
                        messageId = 'typedArrayEqualityComparisonDoubleNequals' as const;
                        break;
                    case '!==':
                        messageId = 'typedArrayEqualityComparisonTripleNequals' as const;
                        break;
                    default:
                        // Not an operator we care about, return
                        return;
                }

                /**
                 * Helper function to detect whether a node is array-like.
                 */
                function isTypedArrayLike(key: TSESTree.Expression | TSESTree.PrivateIdentifier) {
                    // We don't actually check whether it's a `TypedArray`, just
                    // if it has the property `byteLength`.
                    const node = parserServices.esTreeNodeToTSNodeMap.get(key);
                    const type = typeChecker.getTypeAtLocation(node);
                    return type.getProperty('byteLength') !== undefined;
                }

                if (isTypedArrayLike(esNode.left) || isTypedArrayLike(esNode.right)) {
                    context.report({
                        messageId,
                        node: esNode,
                    });
                }
            },
        };
    },
});
