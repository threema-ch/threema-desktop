# Dependencies

## General Guidelines

Our guidelines for dependencies:

- **Reduce:** Try to avoid dependencies where possible. When adding a new library, is it really
  necessary? Could the used functionality be inlined or reimplemented? The benefit of a library must
  outweigh the additional maintenance cost and security risk.
- **Review:** Does the library look clean and documented? Is it maintained? Are there dozens of open
  pull requests and issues that aren't being handled? Any critical bugs in the issue tracker? Is the
  maintainer well-known? Ideally take a quick look at the source code to see if it's clean or if it
  screams "don't use me". (Note: Just because a library is very popular does not mean that it's
  source code can't be full of horrible things.)

**Normal vs Dev**

A dependency is considered a _normal_ dependency if its source is being imported within the
components, i.e. it is needed at runtime. Otherwise, it is a _dev_ dependency.

**Packed Libraries**

Imports of packed libraries should be avoided. Try to import the source instead.

**Version Pinning**

When adding a library to the `package.json`, decide whether it's a critical / important library,
where every release (including patch releases) should be reviewed quickly (e.g. by going through the
changelog), or whether it's a library where patch releases can be liberally updated.

For important tools and libraries (e.g. `electron`, `vite`, `tweetnacl`) use version pinning in
`package.json` (i.e. no `~` or `^` prefix).

If patch releases for a dependency can be upgraded liberally (e.g. `karma` or `mocha`), use a `~`
prefix to pin only the major and minor version. Avoid the `^` prefix, because not all packages in
the npm ecosystem stick to semantic versioning.

**Maintenance Updates**

When doing maintenance updates, first run `npm update` to update indirect dependencies and unpinned
direct dependencies. Take a quick look at the changes, run the tests, test whether everything still
works. Then commit this with the message `Run npm update`.

Next, go through the available updates reported by `npm outdated` one by one. Bump the library,
review the changelog, ensure that everything still works. Maybe an update introduces a feature that
we can make use of? If it's a small change, this can be included with the version update. Then
commit this update with the commit message `Upgrade <library>: <old-version> → <new-version>`.

Finally, run `npm audit` to ensure that we don't still include any known vulnerabilities.

## Electron Specifics

Due to layers of duct tape in the tools for Electron and the awful status quo of ES modules vs.
`require` with [Electron being stuck between the two][electron-es-modules] for the foreseeable time,
dependencies need to be carefully handled.

**Marking as External**

There is a special `electron.external` field in `package.json`. Only mark packages as external that
use CommonJS. Do not mark packages as external that use ES Modules. If you have to mark a package as
external, you also have to declare the files that need to be copied (see further below).

**Native Modules**

Some packages may require native modules. First of all, **do not use precompiled binaries**! All
binaries should be built as part of the build steps (e.g. via GYP). You will also have to declare at
least the `.node` files to be copied (see next paragraph).

**Declaring Files to be Copied**

As mentioned in the previous two paragraphs, some packages require files to be imported at runtime.
Everything else will be bundled. To declare such files, use the `electron.dist.include` and
`electron.dist.exclude` fields. You should declare the bare minimum required to run all of our code,
so we don't bloat the resulting dist bundle. Often, you will have to add peer dependencies of
CommonJS packages. In such a case, you **must** also document the dependency tree in
`electron.dist.dependencyTree`, so we can keep track of those.

[electron-es-modules]: https://github.com/electron/electron/issues/21457
