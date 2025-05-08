import banStatefulRegexFlags from './ban-stateful-regex-flags';
import banTypedArrayLength from './ban-typed-array-length';
import banTypedArrayEqualityComparison from './ban-typed-array-equality-comparison';
import noTodoCommentsWithoutIssue from './no-todo-comments-without-issue';
import banDirectElectronAccess from './ban-direct-electron-access';
import compareWorkAndCustom from './compare-work-and-custom';


export const rules = {
    'ban-stateful-regex-flags': banStatefulRegexFlags,
    'ban-typed-array-length': banTypedArrayLength,
    'ban-typed-array-equality-comparison': banTypedArrayEqualityComparison,
    'no-todo-comments-without-issue': noTodoCommentsWithoutIssue,
    'ban-direct-electron-access': banDirectElectronAccess,
    'compare-work-and-custom': compareWorkAndCustom,

};
