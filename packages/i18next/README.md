# `@threema/i18next`

i18next tooling shared between apps.

## Svelte plugin for `i18next-cli`

`createSveltePlugin` creates an [`i18next-cli`](https://github.com/i18next/i18next-cli) plugin that
extracts translation keys from `.svelte` components. It passes the contents of all `<script>` blocks
as well as all call expressions and HTML comments of the template verbatim to the extractor.

```ts
import {createSveltePlugin} from '@threema/i18next';
import {defineConfig} from 'i18next-cli';

import svelteConfig from './svelte.config.js';

export default defineConfig({
  plugins: [createSveltePlugin({preprocess: svelteConfig.preprocess})],
  // ...
});
```

The `preprocess` option is only required if components contain markup that the Svelte parser cannot
handle on its own (e.g. SCSS in `<style>` blocks).

Note: Namespaces or key prefixes resolved from scope (e.g. via `useTranslation`) are not supported.
