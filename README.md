# Threema for Desktop

A standalone Threema client for the desktop and the web.

## Table of Contents

- [Building](#building)
  - [Requirements](#requirements)
  - [Install Dependencies](#install-dependencies)
  - [Build](#build)
  - [Package](#package)
- [Development](#development)
  - [NodeJS](#nodejs)
  - [Code Structure / Architecture](#code-structure-architecture)
  - [Svelte Inline Scripts](#svelte-inline-scripts)
  - [Svelte Components](#svelte-components)
  - [Use `undefined` over `null`](#use-undefined-over-null)
  - [JSDoc Rules](#jsdoc-rules)
  - [Pre-Commit](#pre-commit)
- [License](#license)

## Building

### Requirements

- NodeJS / npm
- Python3 (for [`node-gyp`])
- C compiler toolchain (e.g. `build-essential` on Debian or `base-devel` on Arch)

It is highly recommended to use a Linux- or macOS-based system for building and developing Threema
Desktop! Building on Windows 10+ should mostly work, but not everything may work as smoothly and we
cannot provide any support.

#### macOS

On macOS you might need to manually install and configure the C compiler toolchain in order to use
[`node-gyp`]. Usually that can be done by installing the required "Command Line Tools" with the
command `xcode-select --install`. Alternatively, you can install [Xcode] (note that it might take
more than 1h between download and installation!) and then select a "Command Line Tools" version in
Preferences > Locations. For a detailed guide and diagnostics, please refer to the ["Installation
notes for macOS"][node-gyp_macos_catalina] from the `node-gyp` project itself.

[`node-gyp`]: https://github.com/nodejs/node-gyp
[xcode]: https://apps.apple.com/us/app/xcode/id497799835?mt=12
[node-gyp_macos_catalina]:
  https://github.com/nodejs/node-gyp/blob/master/macOS_Catalina.md#installing-node-gyp-using-the-xcode-command-line-tools-via-xcode-select---install

#### Windows

When building on Windows, it is important to clone the repository with [symlink
support][win-symlinks]. For this, you first need to [enable Developer Mode][win-devmode]. Then, run
the following command to [enable git support for symlinks globally][win-git-symlinks]:

    git config --global core.symlinks true

Afterwards clone the repository as usual. (Alternatively, clone with
`git clone -c core.symlinks=true ...` if you don't want to enable this option globally.)

[win-symlinks]: https://blogs.windows.com/windowsdeveloper/2016/12/02/symlinks-windows-10/
[win-devmode]:
  https://learn.microsoft.com/en-us/windows/apps/get-started/enable-your-device-for-development
[win-git-symlinks]: https://github.com/git-for-windows/git/wiki/Symbolic-Links

### Install Dependencies

First, make sure that you're using the correct NodeJS version (check out the `.nvmrc` file). If you
have [nvm] installed, you can simply type `nvm use`.

Next, install dependencies:

    npm install

Note that this requires a C compiler toolchain due to native dependencies, as mentioned above.

[nvm]: https://github.com/nvm-sh/nvm

### Build

To build Threema Desktop, run:

    npm run package binary consumer-sandbox

Now you can find the application bundle at `build/out/`.

Note: To launch Threema directly without unpacking, you can find the uncompressed directory
(containing the `ThreemaDesktop` binary) in `build/tmp/`.

### Package

To create a distribution package target, run:

    npm run package <target> [params]

Possible targets:

- `source`: A source archive (.tar.gz and .7z)
- `binary`: An archive containing a raw binary build for the current architecture
- `dmg`: An unsigned macOS DMG
- `dmgSigned`: A signed macOS DMG
- `msix`: An unsigned Windows MSIX package
- `msixSigned`: A signed Windows MSIX package
- `flatpak`: A Linux Flatpak in a local repository

## Development

Below we'll provide a couple of hints and rules for working on this project.

More developer docs can be found at <https://clients.pages.threema.dev/web/threema-desktop-web/>.

### Dev Container

You are highly encouraged to use the provided [VS Code Dev Container][vscode-devcontainer]
considering that any `npm` dependency can run arbitrary code and we have a ton of development
dependencies. Note that this currently requires Visual Studio Code (not Code OSS) and the
proprietary [`ms-vscode-remote.remote-containers`][remote-containers-extension] extension.

    > Dev Containers: Reopen in Container

You will have to rebuild the Dev Container every time the Node version of `.nvmrc` changes.

    > Dev Containers: Rebuild Container

It is also possible to use the native shell to run `npm` and `node` commands inside of the
container. You'll need `jq` and a compatible shell, then run:

    source ./.devcontainer/env.sh
    node --version

Limitations:

- Needs X11 compatibility to run `npm run dev:*`. It may run slower and may not support all UI
  features (e.g. drag & drop). To use the native UI, it is recommended to make a `npm run dist:*`
  build and run that locally but only when needed.
- Cannot run `npm run test:karma`. Let this be run by the CI after pushing a branch.

### Development Outside Dev Container

The project provides an `.nvmrc` file in case the default NodeJS installation on your device is
being rejected by `npm install`.

    nvm use
    nvm install

[nvm]: https://github.com/nvm-sh/nvm

### Svelte Inline Scripts

Keep inline script code in Svelte files at a minimum. If you require to write larger functions, put
them in their own TypeScript file and import them.

### Svelte Components

Svelte components are always to be imported as-is from source, so preferably **not**
packed/minified.

**Important:** All Svelte components are built with the `immutable` option by default. If properties
within objects or arrays are mutated, the object/array needs to be cloned shallowly in order to
trigger an update! Note that local stores do not need to cloned because the backend does not do any
diffing. Remote stores only need to clone the object if the data has not already been structurally
cloned as part of the `postMessage` dispatching (e.g. delta updates).

### Use `undefined` Over `null`

JavaScript has two very similar types for very similar things: `undefined` and `null`. In
TypeScript, optionality of a field in an object and optionality of an argument in a function is
expressed by `?` which evaluates to _something or `undefined`_. Absence of an object field or an
argument however cannot be expressed with `null` since a type that may be _something or `null`_ must
always be declared and may not be absent. Thus, there is simply no good reason to use `null` for
anything unless it's required by another API.

### JSDoc Rules

**General**

- Always provide a description for exported items
- Only document non-obvious `@param`, `@returns` and `@yields` (e.g. a function that causes
  otherwise surprising side effects to parameters).
- Use `/** @inheritdoc */` when implementing interfaces instead of repeating yourself.
- Always provide a type hint for `@throws` (e.g. `@throws {FooError} ...`), **including on
  constructors, private methods and functions**.
- Use `{@link Foo}` when referring to other items
- Don't use any other tags

**Thrown Errors**

Always document thrown errors via JSDoc. More importantly however, document the whole error chain.
This means if function `A` can throw `AError` and function `B` calls `A`, then function `B` either
needs to document that it can throw `AError` or it needs to `try`/`catch` the potential `AError`.
However, errors that are extremely unlikely to occur do not need to be documented (e.g. assertions).
This means that if you're introducing a new error to a function, check all usages and update the
JSDoc of the whole call chain (or `catch`).

### Pre-Commit

Use `npm run lint:fix` to format the code before committing a change.

If you want to check the formatting automatically when committing changes, add `.git-pre-commit.sh`
as a pre-commit hook:

```bash
ln -s $PWD/.git-pre-commit.sh .git/hooks/pre-commit
```

## License

Threema for Desktop is currently proprietary software. The source code will be published in the near
future under the AGPL license.

If you have questions about the use of self-compiled apps or the license in general, feel free to
[contact us](mailto:opensource@threema.ch). We are publishing the source code in good faith, with
transparency being the main goal. By having users pay for the development of the app, we can ensure
that our goals sustainably align with the goals of our users: Great privacy and security, no ads, no
collection of user data!
