# @threema/test-utils

Utilities for (Vitest) tests, shared across packages.

## Rules

- **Use as a `devDependency` only:** Nothing here may end up in a shipped bundle, so a package
  depends on it as a `devDependency` and imports it from test files (or test helpers).
- **Runtime-agnostic:** The package extends `tsconfig.base.json`, i.e. it has neither the DOM nor
  Node's own APIs available, so that the same utility works in a browser test and in a Node test.
  Where a global is needed which the base does not declare, declare it explicitly, similar to what
  `global-timer.ts` (in `@threema/ts-utils`) does.
- **No tests or test coverage:** These utilities exist to serve tests, so we don't test them
  separately.
