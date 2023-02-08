# Flatpak Config

This configuration is used to build nightly versions of Threema Desktop from CI.

## Manually building

Make sure that the runtimes are installed:

    flatpak install org.electronjs.Electron2.BaseApp
    flatpak install org.freedesktop.Sdk.Extension.node18

Then, run flatpak-node-generator to convert `package-lock.json` to a
`generated-sources.json `file.

    python3 flatpak-node-generator.py npm --xdg-layout --electron-node-headers ../../package-lock.json

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

To update:

    wget https://raw.githubusercontent.com/flatpak/flatpak-builder-tools/master/node/flatpak-node-generator.py
