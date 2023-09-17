/**
 * This is a modified version of Vite's exported client.d.ts and importMeta.d.ts
 * and must be kept in sync.
 *
 * When updating, diff with:
 *
 * - https://github.com/vitejs/vite/blob/main/packages/vite/client.d.ts
 * - https://github.com/vitejs/vite/blob/main/packages/vite/types/importMeta.d.ts
 */

/* eslint-disable jsdoc/no-bad-blocks */
/* eslint-disable
   capitalized-comments,
   spaced-comment,
   @typescript-eslint/consistent-indexed-object-style,
   @typescript-eslint/consistent-type-definitions,
   @typescript-eslint/prefer-function-type,
   @typescript-eslint/triple-slash-reference,
   import/no-default-export,
*/
/// <reference path="../vite-client.d.ts" />

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
declare module '*.module.sss' {
    const classes: CSSModuleClasses;
    export default classes;
}

// CSS
declare module '*.css' {}
declare module '*.scss' {}
declare module '*.sass' {}
declare module '*.less' {}
declare module '*.styl' {}
declare module '*.stylus' {}
declare module '*.pcss' {}
declare module '*.sss' {}

// wasm?init
declare module '*.wasm?init' {
    const initWasm: (options?: WebAssembly.Imports) => Promise<WebAssembly.Instance>;
    export default initWasm;
}
