
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(() => 'no-direct-electron-access');

export default createRule({
    name: 'no-direct-electron-access',
    meta: {
        type: 'problem',
        docs: {
            description: 'Do not access electron directly but use the service instead.',
            recommended: 'strict'
        },
        schema: [],
        messages: {
            directElectronAccess: 'Use the corresponding service to access the bridged functions of the electron main thread.'
        },
        fixable: undefined
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(esNode: TSESTree.CallExpression) {
                if (esNode.callee.type === AST_NODE_TYPES.MemberExpression &&
                    esNode.callee.object.type === AST_NODE_TYPES.MemberExpression &&
                    esNode.callee.object.object.type === AST_NODE_TYPES.Identifier &&
                    esNode.callee.object.object.name === 'window' &&
                    esNode.callee.object.property.type === AST_NODE_TYPES.Identifier &&
                    esNode.callee.object.property.name === 'app') {
                    context.report({
                        node: esNode,
                        messageId: "directElectronAccess" as const,
                    });
                }
            }
        }

    }
})
