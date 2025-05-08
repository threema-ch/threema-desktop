import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(() => 'compare-work-and-custom');

/**
 * Warns to check for `BUILD_VARIANT === 'custom'` as well in cases where `BUILD_VARIANT === 'work'`
 * is checked.
 */
export default createRule({
    name: 'compare-work-and-custom',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Please consider also comparing against `custom` build variants',
            recommended: 'recommended'
        },
        schema: [],
        fixable: 'code',
        messages: {
            compareWorkAndCustom: 'Consider comparing `BUILD_VARIANT` `custom` as well'
        }
    },
    defaultOptions: [],
    create(context) {
        return {
            BinaryExpression(esNode: TSESTree.BinaryExpression) {
                if (
                    isPropertyToLiteralComparisonExpression(esNode, "BUILD_VARIANT", "===", "work") ||
                    isPropertyToLiteralComparisonExpression(esNode, "BUILD_VARIANT", "!==", "work")
                ) {
                    const hasAdjacentCustomBuildExpression = findAdjacentExpression(
                        esNode,
                        (otherESNode) => 
                            otherESNode.type === AST_NODE_TYPES.BinaryExpression &&
                            (
                                isPropertyToLiteralComparisonExpression(otherESNode, "BUILD_VARIANT", "===", "custom") ||
                                isPropertyToLiteralComparisonExpression(otherESNode, "BUILD_VARIANT", "!==", "custom")
                            )
                    ) !== undefined;

                    if (!hasAdjacentCustomBuildExpression) {
                        context.report({
                            node: esNode,
                            messageId: 'compareWorkAndCustom' as const,
                        });
                    }
                }
            }
        };
    }
});

function isPropertyToLiteralComparisonExpression(
    esNode: TSESTree.BinaryExpression,
    property: string,
    operator: TSESTree.BinaryExpression['operator'],
    literal: TSESTree.Literal['value']
): boolean {
    if (
        esNode.left.type === AST_NODE_TYPES.MemberExpression &&
        esNode.left.property.type === AST_NODE_TYPES.Identifier &&
        esNode.left.property.name === property &&
        esNode.operator === operator &&
        esNode.right.type === AST_NODE_TYPES.Literal &&
        esNode.right.value === literal
    ) {
        return true;
    }

    return false;
}

/**
 * Walk up / across the tree as long as the expressions are still part of the same
 * `LogicalExpression` which the given `esNode` belongs to, and find the first partial expression
 * which satisfies the given condition.
 *
 * @param esNode The node to start walking from.
 * @param condition The condition to check each adjacent node against.
 * @returns The first matching node, if any.
 */
function findAdjacentExpression(
    esNode: TSESTree.BinaryExpression,
    condition: (otherESNode: TSESTree.Expression) => boolean
): TSESTree.Expression | undefined {
    let current: TSESTree.Node = esNode;
    while (
        current.parent &&
        current.parent.type === AST_NODE_TYPES.LogicalExpression
    ) {
        const otherESNode = current.parent.left === current ? current.parent.right : current.parent.left;

        // If any adjacent node fulfills the given condition, return it.
        if (condition(otherESNode)) {
            return otherESNode;
        }

        current = current.parent;
    };

    return undefined;
}
