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

Generate the sources for the build tools.

    python generate-tool-sources.py -o generated-tool-sources.json

Generate the flatpak yaml file(s):

    ./generate-manifest.sh

Build the flatpak yaml file into a local repo:

    flatpak-builder --force-clean --repo=repo build ch.threema.threema-desktop.yml

Add the local repo as a source:

    flatpak remote-add threema-local repo --no-gpg-verify

Finally, install the local flatpak:

    flatpak install --reinstall ch.threema.threema-desktop

To run:

    flatpak run ch.threema.threema-desktop

## Flatpak Node Generator

The `flatpak-builder-tools/flatpak_node_generator` directory is vendored unchanged from
https://github.com/flatpak/flatpak-builder-tools/tree/master/node. Do not modify it locally;
contribute fixes upstream instead. The currently vendored commit is noted in
`flatpak-builder-tools/README.md`.
