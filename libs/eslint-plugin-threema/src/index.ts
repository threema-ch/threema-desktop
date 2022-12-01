import banStatefulRegexFlags from './ban-stateful-regex-flags';
import banTypedArrayLength from './ban-typed-array-length';
import banTypedArrayEqualityComparison from './ban-typed-array-equality-comparison';
import noTodoCommentsWithoutIssue from './no-todo-comments-without-issue';
import preferInlineTypeImports from './prefer-inline-type-imports';

export = {
    rules: {
        'ban-stateful-regex-flags': banStatefulRegexFlags,
        'ban-typed-array-length': banTypedArrayLength,
        'ban-typed-array-equality-comparison': banTypedArrayEqualityComparison,
        'no-todo-comments-without-issue': noTodoCommentsWithoutIssue,
        'prefer-inline-type-imports': preferInlineTypeImports,
    },
}
