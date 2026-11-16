# Flatpak Config

This configuration is used to build nightly versions of Threema Desktop from CI.

## Manually building

Make sure that the runtimes are installed:

    flatpak install --user org.electronjs.Electron2.BaseApp

(Note: Unless you build as root, the runtimes (in particular the base app) must come from the
per-user installation.)

Then, run flatpak builder tools to convert `pnpm-lock.yaml` and `Cargo.lock` to a
`generated-*-sources.json `file.

    python -m flatpak-builder-tools.flatpak_node_generator pnpm --electron-node-headers --no-playwright-browsers --pnpm-store-version v11 -o generated-pnpm-sources.json ../../../../pnpm-lock.yaml
    python -m flatpak-builder-tools.flatpak-cargo-generator -o generated-cargo-sources.json ../../src/rust/launcher/Cargo.lock
    python -m flatpak-builder-tools.flatpak-cargo-generator -o generated-libthreema-cargo-sources.json ../../../../packages/libthreema-wasm/libs/libthreema/Cargo.lock

Generate the sources for the build tools.

    python generate-tool-sources.py -o generated-tool-sources.json

Generate the flatpak manifest (as well as the metainfo and desktop files) from
`manifest-template.yml` and the templates in `../metadata/`. This is done by the packaging script
(`packaging/main.ts`), which runs all of the steps above and builds the Flatpak:

    # In `apps/desktop`, after building the app
    TURBO_BUILD_ENVIRONMENT=sandbox TURBO_BUILD_VARIANT=consumer pnpm run package

Build the flatpak yaml file into a local repo:

    flatpak-builder --force-clean --repo=repo build ch.threema.threema-desktop.yml

Add the local repo as a source:

    flatpak remote-add threema-local repo --no-gpg-verify

Finally, install the local flatpak:

    flatpak install --reinstall ch.threema.threema-desktop

To run:

    flatpak run ch.threema.threema-desktop

## Metainfo and Desktop Files

The metainfo and desktop files are not part of the manifest sources. They are generated during the
Flatpak build from the templates in `../metadata/` by the `flatpak-metadata` subcommand of the
packaging script, which works offline:

    pnpm --filter ./apps/desktop run generate:flatpak-metadata <flavor> <out-dir>

This way, the generated manifest for Flathub only references the project source, and the metadata
always matches the tagged release.

There is one metainfo template per build variant
(`ch.threema.threema-desktop.<variant>.metainfo.xml`, where custom builds use the `work` template),
so that each variant can have its own summary and description. The release history is shared by all
variants and lives in `ch.threema.threema-desktop.releases.xml`. The metainfo templates reference it
with `<releases type="external" />`, and it is installed to
`share/metainfo/releases/<app-id>.releases.xml`, where AppStream picks it up. New releases go into
the releases file.

## Flathub

To generate the files required for a Flathub submission for all flavors published on Flathub, run
from the repository root:

    pnpm run generate:desktop:flathub

The files are written to `flathub/<flavor>/`. The manifests fetch the project source from GitHub at
the tag of the current version (`v<version>` from `apps/desktop/package.json`), so the tag must
already have been pushed to GitHub. The source generators need the Python packages `aiohttp`,
`tomlkit` and `yaml`.

### Screenshots

Flavors without a `screenshots/<flavor>/` directory fall back to the screenshots of `consumer-live`,
which must therefore always exist.

## Flatpak Node Generator

The `flatpak-builder-tools/flatpak_node_generator` directory is vendored unchanged from
https://github.com/flatpak/flatpak-builder-tools/tree/master/node. Do not modify it locally;
contribute fixes upstream instead. The currently vendored commit is noted in
`flatpak-builder-tools/README.md`.
