import {ESLintUtils, TSESTree} from '@typescript-eslint/utils';
import {SyntaxKind} from 'typescript';

import {assert} from './utils';

const createRule = ESLintUtils.RuleCreator(() => 'ban-stateful-regex-flags');

export default createRule({
    name: 'prefer-inline-type-imports',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Prefer inline type imports',
            recommended: 'error',
        },
        schema: [],
        messages: {
            noTypeImport: 'Type imports must be inlined',
        },
        fixable: 'code',
    },
    defaultOptions: [],
    create(context) {
        const parserServices = ESLintUtils.getParserServices(context);
        const code = context.getSourceCode();

        return {
            ImportDeclaration: (esNode: TSESTree.ImportDeclaration) => {
                // Ignore any non-type imports
                if (esNode.importKind !== 'type') {
                    return;
                }
                const tsNode = parserServices.esTreeNodeToTSNodeMap.get(esNode);
                const importClause = tsNode.importClause;
                assert(importClause !== undefined, 'Expected import clause')

                // Ignore namespace imports.
                //
                // Example: `import type * as foo from 'foo`
                if (importClause.namedBindings?.kind === SyntaxKind.NamespaceImport) {
                    return;
                }

                // Ignore default imports (those have an explicit name and no named bindings).
                //
                // Example: `import type Foo from 'foo'`
                if (importClause.name !== undefined && importClause.namedBindings === undefined) {
                    return;
                }

                // Complain!
                context.report({
                    messageId: 'noTypeImport',
                    node: esNode,
                    *fix(fixer) {
                        const importKeyword = code.getFirstToken(esNode);
                        assert(importKeyword !== null, 'Expected import keyword');
                        const typePrefix = code.getTokenAfter(importKeyword);
                        assert(typePrefix !== null, 'Expected import keyword type prefix');

                        // Remove the 'type' prefix of the whole import declaration
                        yield fixer.remove(typePrefix);

                        // Convenience: Remove any leftover space due to the removal of the 'type'
                        // prefix.
                        //
                        // Note: This will only yield prettier-conform output if the import format
                        //       was prettier-conform before.
                        if (importKeyword.loc.end.column + 1 === typePrefix.loc.start.column) {
                            const [, end] = importKeyword.range;
                            yield fixer.removeRange([end, end + 1]);
                        }

                        // Add 'type' prefix in front of each import specifier
                        for (const specifier of esNode.specifiers) {
                            yield fixer.insertTextBefore(specifier, 'type ');
                        }
                    },
                });
            },
        };
    },
});
