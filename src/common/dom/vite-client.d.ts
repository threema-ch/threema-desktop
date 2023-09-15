/**
 * This is a slightly modified version of vite's exported client.d.ts
 * (https://github.com/vitejs/vite/blob/main/packages/vite/client.d.ts) and
 * should be kept in sync.
 */

// eslint-disable-next-line jsdoc/no-bad-blocks
/* eslint-disable
   capitalized-comments,
   spaced-comment,
   @typescript-eslint/consistent-indexed-object-style,
   @typescript-eslint/consistent-type-definitions,
   @typescript-eslint/prefer-function-type,
   @typescript-eslint/triple-slash-reference,
*/
/// <reference path="../vite-client.d.ts" />

// Built-in asset types
// see `src/constants.ts`

// CSS modules
type CSSModuleClasses = {readonly [key: string]: string};

declare module '*.module.css' {
    const classes: CSSModuleClasses;
    export default classes;
}
declare module '*.module.scss' {
    const classes: CSSModuleClasses;
    export default classes;
}
declare module '*.module.sass' {
    const classes: CSSModuleClasses;
    export default classes;
}
declare module '*.module.less' {
    const classes: CSSModuleClasses;
    export default classes;
}
declare module '*.module.styl' {
    const classes: CSSModuleClasses;
    export default classes;
}
declare module '*.module.stylus' {
    const classes: CSSModuleClasses;
    export default classes;
}
declare module '*.module.pcss' {
    const classes: CSSModuleClasses;
    export default classes;
}

// CSS
declare module '*.css' {
    const css: string;
    export default css;
}
declare module '*.scss' {
    const css: string;
    export default css;
}
declare module '*.sass' {
    const css: string;
    export default css;
}
declare module '*.less' {
    const css: string;
    export default css;
}
declare module '*.styl' {
    const css: string;
    export default css;
}
declare module '*.stylus' {
    const css: string;
    export default css;
}
declare module '*.pcss' {
    const css: string;
    export default css;
}

// other
declare module '*.wasm' {
    const initWasm: (options: WebAssembly.Imports) => Promise<WebAssembly.Exports>;
    export default initWasm;
}
// eslint-disable-next-line jsdoc/no-bad-blocks
/* eslint-enable
   capitalized-comments,
   @typescript-eslint/consistent-type-definitions,
   @typescript-eslint/triple-slash-reference
*/

/**
 * Custom extensions provided by our own plugins.
 */

declare module '*?wrkr' {
    export const url: string;
    export const create: {
        (): Worker;
    };
}
