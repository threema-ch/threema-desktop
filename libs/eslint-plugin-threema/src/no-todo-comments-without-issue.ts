import {TSESTree} from '@typescript-eslint/utils';
import {ESLintUtils} from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(() => 'no-todo-comments-without-issue');

export default createRule({
    name: 'no-todo-comments-without-issue',
    meta: {
        type: 'suggestion',
        docs: {
            description: "Ban TODO comments that are not linked to an issue.",
            recommended: 'warn',
        },
        schema: [],
        messages: {
            unexpectedTodoComment:
                "Link TODO comments to an issue, e.g. `// TODO(ISSUE-123): Fix this old junk`",
        },
        fixable: undefined,
    },
    defaultOptions: [],
    create(context) {
        const sourceCode = context.getSourceCode();
        const singleLineRegexp = /^\/*\s*TODO(?!\([^\)]+\)).*/u;
        const multiLineRegexp = /^[\/*\s]*TODO(?!\([^)]+\)).*/u;

        /**
         * Check whether the comment contains a unreferenced todo statement at the beginning of a comment line.
         * 
         * @param node Comment node
         * @returns boolean 
         */
        function containsUnreferencedTodo(node: TSESTree.Comment): boolean {
            const regeExp = node.type === TSESTree.AST_TOKEN_TYPES.Line ? singleLineRegexp : multiLineRegexp;
            return node.value.match(regeExp) !== null;
        }

        return {
            Program() {
                sourceCode
                .getAllComments()
                .filter(containsUnreferencedTodo)
                .forEach(node => {
                    context.report({
                        node,
                        messageId: 'unexpectedTodoComment',
                    });
                });
            }
        };
    },
});