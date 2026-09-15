# Agent Guidance

This document provides guidance for AI agents on how to interact with this repository, which
contains the source code for **Threema Desktop**, a standalone, cross-platform (Windows/macOS/Linux)
desktop messaging application. The app is built with Electron, Svelte 5, and TypeScript.

The repository is structured as a monorepo, with the code of the main Electron app contained in
`apps/desktop`.

Look at the top-level `README.md` for general information about this project, and the `docs/src/`
directory for detailed developer documentation.

## Tech Stack

Monorepo based on pnpm workspaces and Turborepo as the build tool.

- **Language**: TypeScript
- **UI Framework**: Svelte 5 (pure Svelte, NOT SvelteKit!) with runes mode enforced
- **Desktop Shell**: Electron
- **Bundler**: Vite
- **Styling**: SCSS with a custom compile-time-validated theming system
- **Testing**: Mocha (Node unit tests), Karma (DOM unit tests), Playwright (E2E)
- **Linting**: ESLint, Prettier, svelte-check, and TypeScript type checking (strict linting is
  enforced, so always run `pnpm run lint` to run all linters to validate your work)

## Architecture

See:

- Overall repository structure: `docs/src/architecture.md`
- Desktop application architecture: `docs/src/apps/desktop/architecture.md`

### Inter-Thread Communication

There is no direct communication channel between the Electron thread and the backend worker. All
communication must pass through the renderer (UI) thread:

```
Electron thread <--[Electron IPC]--> Renderer thread <--[RPC]--> Backend worker
```

- **Electron <-> Renderer**: Standard Electron IPC (via preload script)
- **Renderer <-> Backend worker**: A heavily modified version of the Comlink library with custom
  transfer logic for stores, model stores, set stores, and proxied objects. See
  `docs/src/apps/desktop/rpc.md` for details.

### Stores

The project uses custom implementations of stores (not Svelte's built-in stores), which fulfill the
Svelte store contract but add additional capabilities:

- `ReadableStore` / `WritableStore`: Basic queryable stores.
- `DerivedStore`: Lazy derivation from other stores.
- `SetStore` / `DerivedSetStore`: Optimized set stores with delta updates.
- `ModelStore`: Stores representing data models, with a `view` (data) and `controller` (mutations).

This allows stores to be used in the backend worker as well. Stores can be transferred over the RPC
boundary between the backend worker and renderer thread. See `docs/src/apps/desktop/stores.md` for
details.

## Monorepo Structure

Read `docs/src/architecture.md` for more information about important rules related to the monorepo
structure.

```
├── apps/
│   ├── conferencing/                      # Threema Conferencing (Svelte single-page web app)
│   └── desktop/                           # The main Electron app (Threema Desktop)
├── docs/                                  # Developer documentation (mdbook)
├── packages/                              # Shared packages
│   ├── branding/                          # Threema brand assets and design tokens
│   ├── call/                              # Platform-neutral call logic and primitives
│   ├── crypto/                            # Platform-neutral crypto primitives (keys, boxes, NaCl backend)
│   ├── dom/                               # Browser/DOM utilities
│   ├── domain/                            # Threema domain logic and types (e.g. Threema ID)
│   ├── electron/                          # Electron-specific utilities (@threema/electron-utils)
│   ├── eslint-config/                     # Shared ESLint configuration
│   ├── eslint-plugin-threema/             # Custom ESLint rules
│   ├── libthreema-wasm/                   # Threema protocol implementation written in Rust
│   ├── protocol/                          # Generated Threema protocol bindings and enums
│   ├── safe-enums/                        # Generator for safe enums (from a package's enum schema)
│   ├── ts-config/                         # Shared TypeScript configuration
│   ├── ts-utils/                          # Shared TypeScript utilities
│   ├── ui/                                # Reusable UI components (Svelte 5, Tailwind CSS)
│   ├── vite-plugin-commonjs-externals/
│   ├── vite-plugin-subresource-integrity/ # Custom SRI plugin for Vite
│   ├── webrtc/                            # Generic WebRTC primitives and utilities
│   └── workers/                           # Worker utilities (@threema/worker-utils)
├── scripts/                               # Helper scripts used during development
└── turbo.jsonc                            # Top-level Turborepo configuration
```

### Desktop App Source Structure (`apps/desktop/src/`)

```
src/
├── app/                       # Renderer thread (UI)
│   ├── app.ts                 # Application entry point
|   ├── routing/               # Application router
│   ├── ui/
│   │   ├── components/        # UI components (atomic design, `docs/src/ui-components.md`)
│   │   │   ├── atoms/
│   │   │   ├── molecules/
│   │   │   ├── organisms/
│   │   │   ├── hocs/
│   │   │   └── partials/
│   │   └── ...                # Other components which have not been added to the atomic design structure in `components` yet
│   └── ...
├── common/                    # Shared code
│   ├── dom/                   # Shared code that uses DOM APIs
│   ├── node/                  # Shared code that uses Node APIs
│   ├── crypto/                # Cryptography utilities
│   ├── db/                    # Database layer (used in the backend worker)
│   ├── model/                 # Data models (used in the backend worker)
│   ├── network/               # Network protocol code (protobuf, structbuf)
│   ├── viewmodel/             # View models (used in the backend worker)
│   └── ...
├── electron/                  # Electron main process
│   └── electron-main.ts       # Electron entry point
├── worker/
│   └── backend/               # Backend worker
│       └── electron/          # Electron-specific worker glue code
├── sass/                      # Global SCSS styles and theming
├── translations/              # i18n translation files (generated by `pnpm run generate:desktop:translations`)
├── test/                      # Test suites
│   ├── mocha/                 # Node unit tests
│   ├── karma/                 # DOM unit tests
│   └── playwright/            # End-to-end tests
├── rust/                      # Rust source for launcher/helper binaries
└── migrations/                # Database migrations
```

**Important**:

- Code in `src/common/` should not use DOM or Node APIs, as those belong in `src/common/dom/` and
  `src/common/node/` respectively.
- Some modules in `src/common/` should not be imported from just anywhere. For example,
  `src/common/model` is only intended to be used in the backend worker. So, `src/common` does not
  imply where code can be imported from, but only which APIs it uses. Using `import type` to import
  from `src/common` is generally fine, though.

## UI Component Architecture

Components follow an [atomic design](https://bradfrost.com/blog/post/atomic-web-design/) structure.
Read more in `docs/src/ui-components.md`.

Note: Only UI components at the root-level of a component tree (e.g. the `ConversationView.svelte`
partial) should access viewmodels to load data directly, and then pass parts of that data to
subcomponents.

## Helpful Commands

All commands are run from the repository root unless stated otherwise.

### Setup

```bash
pnpm install # Install all dependencies
```

### Build

```bash
pnpm run build:desktop:consumer-sandbox # Build desktop app for the current platform (consumer, sandbox)
pnpm run build:packages                 # Build all packages
```

### Development

```bash
pnpm run dev:desktop:consumer-sandbox # Start dev mode with hot reload (consumer, sandbox)
```

Note: Development commands do not terminate and are not suitable for agentic work. Prefer
`pnpm run build:desktop:<flavor>` or `pnpm run lint`. Even better, write a Playwright test and run
it using `pnpm run test:desktop:playwright:consumer-sandbox`.

### Linting & Validation

```bash
pnpm run lint              # Run all linters (eslint, prettier, svelte-check, tsc)
pnpm run lint:fix          # Auto-fix lint issues where possible
pnpm run lint:prettier:fix # Format all files with Prettier
```

Note: Other individual lint commands are also available, e.g. `pnpm run lint:eslint`.

### Testing

```bash
pnpm run test:desktop:mocha # Run mocha tests
pnpm run test:desktop:karma # Run karma tests
pnpm run test:desktop:playwright:consumer-sandbox # E2E tests
```

## Code Style & Conventions

### General

- **Strict TypeScript**: The project uses strict TypeScript throughout. Define interfaces and types
  explicitly.
- **`undefined` over `null`**: Always prefer `undefined`. Only use `null` when required by an
  external API.
- **Naming**:
  - `camelCase` for variables and functions.
  - `PascalCase` for components, classes, types, and interfaces.
  - `kebab-case` for file and directory names.
- **Imports**: In the desktop app, use imports relative to the base paths defined in
  `apps/desktop/src/tsconfig.base.json`, e.g. `import {D2mPayloadTypeUtils} from '~/common/enum';`.
- **Entry points**: Only files matching `entry.*.ts` or `entry.ts` are valid entry points. This
  ensures no side effects when importing for unit testing.

### Svelte 5

This project uses **Svelte 5 with runes mode enforced**. Note: This is NOT SvelteKit; there is no
file-based routing, no server-side rendering, no `+page.svelte` conventions. It is a pure Svelte 5
SPA bundled with Vite, running inside Electron.

Svelte 5 docs: https://svelte.dev/docs/svelte/overview.

Key Svelte 5 patterns used:

- `$props()` for component props (destructured from a typed props interface).
- `$state()` for reactive local state.
- `$derived()` for computed values.
- `$effect()` for side effects.

Always use Svelte 5 rune equivalents:

- Use `$props()` instead of `export let`.
- Declare reactive state as `let value = $state(...)` in Svelte 5, instead of the more implicit
  `let value = ...` from Svelte 4.
- Use runes-based reactivity (`$derived`/`$effect`) instead of `$:` reactive statements.
- Svelte Stores (`writable`/`readable` from `svelte/store`) are still supported, but always prefer
  `$state()` when defining local reactive state in components instead.

Rules for external code used in `.svelte` files:

- When defining stores outside of `.svelte` files (e.g. in plain `.ts` files), always use our own
  store implementation instead of `writable`/`readable` from `svelte/store`.
- Always use plain `.ts` files when writing code outside of a `.svelte` component, and avoid
  `.svelte.ts`.

When confused about Svelte 4 vs 5 syntax, consult the
[Svelte 5 migrationguide](https://svelte.dev/docs/svelte/v5-migration-guide).

### Styling (SCSS)

- Theme variables are validated at compile time by a custom SCSS `var()` override.
- New theme variables must be added to `src/sass/_config.scss`, `src/sass/_theme.scss`, and both
  `src/sass/theme/_dark.scss` and `src/sass/theme/_light.scss`.
- Component-scoped temporary variables use the `def-var()` / `var()` utils with a `$-temp-vars` map.
- See `docs/src/apps/desktop/styles.md` for the full theming guide.

### Internationalization (i18n)

Translations are stored as per-language JSON files in `src/translations/`.

Workflow:

1. Use `$i18n.t('topic.modifier--name', 'Default English text')` to add translatable text in a
   component.
2. Run `pnpm run generate:desktop:translations` to add the new text to the translation files. This
   will regenerate all translation JSON files and add the new key.
3. Note that text is not translated automatically, so the newly added text needs to be translated
   manually in all non-English translation JSON files.

When updating existing text of a specific key, e.g. `topic.modifier--name`, look for all usages in
code, and update both the default text in the code, as well as the translations in the translation
JSON files. Usually, only one of the usages in the code needs a default text, so reusing text of an
existing key using e.g. `$i18n.t('topic.modifier--name')` is fine.

Note: See `docs/src/internationalization.md` for modifier conventions.

### Cryptography

See `docs/src/cryptography.md`.

### Dependencies

Do not add additional dependencies without explicit consent by the user. See
`docs/src/dependencies.md` for the full dependency policy.

## Generated Code

Some code is generated and should NOT be modified manually (usually stated at the top of the file):

- `src/common/enum/index.ts`: Generated from `src/enum/schema.ts` via
  `pnpm run generate:desktop:safe-enums`.
- `packages/protocol/src/enum/index.ts`: Generated from `packages/protocol/src/enum/schema.ts` via
  `pnpm run generate:protocol:safe-enums`. Exposed as `@threema/protocol/enum` and holds the enums
  whose values are defined by the Threema protocol or appear on the wire.
- `packages/protocol/src/protobuf/`, `packages/protocol/src/structbuf/`: Generated from the
  `threema-protocols` repository via `pnpm run update:protocol`.

Generating code should usually be done manually by the user. Always ask first before running any
`pnpm run generate:*` scripts.

## Documentation

Detailed developer documentation is available in `docs/src/`. See an overview of the available pages
in `docs/src/SUMMARY.md`.

### CONTEXT.md files (`context-docs` branch)

A separate `context-docs` branch holds `CONTEXT.md` files capturing domain language and
architectural context for the `/grill-with-docs` skill (and similar agent workflows). These files
live on their own branch and are not merged into the main working branch.

Discover and read them without switching branches:

```bash
# List all CONTEXT.md files on the branch
git ls-tree -r --name-only origin/context-docs | grep CONTEXT.md

# Read a specific one
git show origin/context-docs:<path>
```

## Development Tips

- Always run `pnpm run lint` before considering your work done. The project has strict linting rules
  that are enforced in CI.
- Run `pnpm run test:desktop:mocha` to verify that Node-based unit tests pass after your changes.
- Keep `.svelte` files lean. Extract logic into `.ts` files and import them.
- Models cannot be accessed from the UI directly. Data must be passed from models to viewmodels, and
  from there to the frontend to be displayed in the UI.
- When working on UI components, check `src/app/ui/components/` for existing atoms, molecules, and
  organisms that you can reuse before creating new ones.
- Treat `pnpm run dev:desktop:*` commands as off-limits for autonomous use, as they launch Electron
  and will hang the session.
