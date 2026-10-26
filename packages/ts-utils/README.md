# @threema/ts-utils

A collection of sugar and utilities for TypeScript, shared across apps and packages.

## Usage

There is no barrel file. Every module is imported directly by its path, i.e. `<directory>/<file>`:

```ts
import {ensureU64} from '@threema/ts-utils/integer/u64';
import {u64ToBytesLe} from '@threema/ts-utils/conversion/u64-to-bytes-le';
```

Because the directory is part of the import path, moving a file is a breaking change for every
consumer. Update all imports in the monorepo when doing so.

## Rules

The rules below apply to everything in this package. They exist so that a utility can be found
without searching, and so that it can be used in any thread, regardless of the platform.

Important: While the rules should be followed as closely as possible, certain situations require
flexibility. Judge yourself on a case-by-case basis.

### Scope

- Utilities in this package are independent of business logic. They must not import or reference
  domain-specific code, types or services.
- Utilities are runtime-agnostic. The package extends `tsconfig.base.json`, i.e. it has neither the
  DOM nor Node's own APIs available. Where a global is needed which the base does not declare,
  declare it explicitly (see `src/timer/global-timer.ts`). DOM utilities belong in `packages/dom`.

### File Structure

- One directory per area, named in `kebab-case` after the type or concept it is about, e.g.
  `integer/`, `byte/` or `promise/`.
- One file per exported function, class or type, named after it in `kebab-case`, e.g.
  `byte-equals.ts` for `byteEquals`. A type and its type guards live together in a file named after
  the type, e.g. `integer/u64.ts` for `u64`, `isU64` and `ensureU64`.
- Every function which converts a value from one type to another goes into `conversion/`, e.g.
  `bytesLeToU64` and `u64ToBytesLe`. Such functions are named `<input>To<output>`, so that the file
  name alone is enough to decide where they belong. Note: Operations on a single type, e.g.
  `byteJoin` or `bytePadPkcs7`, are not conversions and belong in the directory of that type.
- Internal helpers which are only used by other modules of the same directory live next to them,
  e.g. `conversion/hex-lookup-table.ts`.

### Tests

- Tests are co-located as `X.test.ts` and run with Vitest. Test names describe the behaviour.
- Coverage thresholds are 100% over `src/**/*.ts`.

Run the tests with:

    pnpm run test:vitest
