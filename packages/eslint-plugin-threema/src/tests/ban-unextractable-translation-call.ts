import test from 'node:test';
import {RuleTester} from '@typescript-eslint/rule-tester';
import rule from '../ban-unextractable-translation-call.js';

RuleTester.afterAll = test.after;
RuleTester.describe = test.describe;
RuleTester.it = test.it;

const ruleTester = new RuleTester();

ruleTester.run('ban-unextractable-translation-call', rule, {
    valid: [
        "t('topic.label--key', 'Default');",
        "i18n.t('topic.label--key', 'Default');",
        "$i18n.t('topic.label--key', 'Default');",
        "this.i18n.t('topic.label--key', 'Default');",
        "const {t} = i18n.get(); t('topic.label--key', 'Default');",
        // Not a translation call, as the first argument is not a literal key.
        'foo().t(bar);',
        'foo().t();',
    ],
    invalid: [
        {
            code: "i18n.get().t('topic.label--key', 'Default');",
            errors: [{messageId: 'unextractableTranslationCall'}],
        },
        {
            code: "i18n.get()?.t('topic.label--key', 'Default');",
            errors: [{messageId: 'unextractableTranslationCall'}],
        },
        {
            code: "getI18n().t('topic.label--key', 'Default');",
            errors: [{messageId: 'unextractableTranslationCall'}],
        },
        {
            code: "i18n['store'].t('topic.label--key', 'Default');",
            errors: [{messageId: 'unextractableTranslationCall'}],
        },
        {
            code: "(i18n as I18n).t('topic.label--key', 'Default');",
            errors: [{messageId: 'unextractableTranslationCall'}],
        },
        {
            code: 'i18n.get().t(`topic.label--key`, "Default");',
            errors: [{messageId: 'unextractableTranslationCall'}],
        },
    ],
});
