import type {TSESTree} from '@typescript-eslint/utils';
import {ESLintUtils} from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(() => 'ban-typed-array-length');

export default createRule({
    name: 'ban-typed-array-length',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Ban the use of TypedArray.length',
            recommended: 'recommended',
        },
        schema: [],
        messages: {
            typedArrayLength:
                'Do not use TypedArray.length, use TypedArray.byteLength instead.',
        },
        fixable: 'code',
    },
    defaultOptions: [],
    create(context) {
        const parserServices = ESLintUtils.getParserServices(context);
        const typeChecker = parserServices.program.getTypeChecker();

        return {
            'MemberExpression[property.name="length"]'(
                esNode: TSESTree.MemberExpression,
            ): void {
                const tsNode = parserServices.esTreeNodeToTSNodeMap.get(
                    esNode.object,
                );
                const type = typeChecker.getTypeAtLocation(tsNode);

                // We don't actually check whether it's a `TypedArray`, just
                // if it has the property `byteLength`.
                if (type.getProperty('byteLength') !== undefined) {
                    context.report({
                        messageId: 'typedArrayLength',
                        node: esNode,
                        fix(fixer) {
                            return fixer.replaceText(esNode.property, 'byteLength');
                        },
                    });
                }
            },
        };
    },
});
