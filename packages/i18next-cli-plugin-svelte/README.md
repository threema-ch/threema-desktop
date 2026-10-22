# `@threema/i18next-cli-plugin-svelte`

An [`i18next-cli`](https://github.com/i18next/i18next-cli) plugin that extracts translation keys
from `.svelte` components. It passes the contents of all `<script>` blocks as well as all call
expressions and HTML comments of the template verbatim to the extractor.

```ts
import {sveltePlugin} from '@threema/i18next-cli-plugin-svelte';
import {defineConfig} from 'i18next-cli';

export default defineConfig({
  plugins: [sveltePlugin()],
  // ...
});
```

The contents of `<style>` blocks are ignored, so components using e.g. SCSS don't need to be
preprocessed.

Note: Namespaces or key prefixes resolved from scope (e.g. via `useTranslation`) are not supported.
