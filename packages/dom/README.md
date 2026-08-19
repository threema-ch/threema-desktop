# @threema/dom

Reusable utilities for working with the DOM and the browser's own APIs.

## Rules

The rules below apply to everything in this package. They exist so that its utilities stay
predictable, testable and independent of the app which uses them.

Important: While the rules should be followed as closely as possible, certain situations require
flexibility. Judge yourself on a case-by-case basis.

### Scope

- Utilities in this package are independent of business logic. They must not import or reference
  domain-specific code, types or services.
- Utilities are framework-agnostic. The package is plain TypeScript, so that every app can use it
  regardless of how it renders.
- No user-facing text. Anything a user reads belongs to the consumer, which is also the reason why
  utilities take no translated strings.
- Prefer the platform's own vocabulary, unless it is misleading. Where a platform name describes the
  mechanism rather than the thing, e.g. `'audioinput'` for a microphone, use our own and say so in a
  doc comment.

### File Structure

- One directory per area, named in `kebab-case`, with an `index.ts` which re-exports the area's
  public API by name. `src/index.ts` re-exports those barrels.
- Prefer one file per exported function or class, named after it in `kebab-case`. A type and its
  type guards live together in a file named after the type, and so do an area's errors.
- Prefer a plain function. Reach for a class when something has a lifetime to manage, e.g.
  `LocalDevices` and the sources it owns.
- Tests are co-located as `X.test.ts`. Helpers which only tests use go into `src/utils/test/`, which
  is excluded from coverage.

### Failures

- Utilities do not log. Logging would mean passing a logger into every call, only to report
  something the consumer is told about anyway.
- An operation which can fail returns its failure instead of throwing it, so that the failure is
  part of the signature and the consumer decides whether to display it, report it or ignore it.
- Errors derive from a base class per area, e.g. `MediaDeviceError`, so that a consumer of several
  operations can narrow all of their failures at once. Every error sets its own `name`, because
  class names do not survive minification.
- Throwing is reserved for programming errors, e.g. the `ensure*` guard of a newtype.

### Documentation and Tests

- Every exported function, type and class has a doc comment describing what it does. Document what
  the platform does, not only what the code does: smoothing over browser behaviour is why this
  package exists, and that behaviour is what a reader cannot look up in the code.
- Tests run in a real browser (Chromium, through Vitest's browser mode), because the platform's own
  behaviour is what most of these utilities depend on. Test names describe the behaviour, and cases
  are written as `// Arrange`, `// Act`, `// Assert`.
- Coverage thresholds are 100% over `src/**/*.ts`. Prefer a total function with a documented
  fallback over an unreachable `default` branch, so that the threshold stays meaningful instead of
  becoming something to work around.
- Where the platform cannot be made to produce a case, replace the platform API for the duration of
  a test (see `src/utils/test/fake-media-devices.ts`). Where it can, let it: the browser is launched
  with a deterministic set of media devices, configured in `vitest.config.ts`.
