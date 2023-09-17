import type {resources} from '~/app/ui/i18n';

// This is a slightly modified version of i18next module to set our defaults in the type. The
// changes here do only affect the type, and updating the i18next configuration to behave
// accordantly is required.

declare module 'i18next' {
    interface CustomTypeOptions {
        // `t` function can return `null`, this behavior is set by default. To change it, we set
        // `returnNull` type to `false`.
        //
        //  Source: https://www.i18next.com/overview/typescript#argument-of-type-defaulttfuncreturn-is-not-assignable-to-parameter-of-type-xyz
        readonly returnNull: false;
        readonly resources: (typeof resources)['en'];
    }
}
