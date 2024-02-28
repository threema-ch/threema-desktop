# Emojis

We use the `emojibase-data` dataset and the the `twemoji` webfont to include emoji in our project.
Since `twemoji` is not officially maintained anymore, we switched to the
[community fork of twemoji](https://github.com/jdecked/twemoji/). To upgrade the emojis to a newer
version, the webfont as well as the emoji picker component need to be updated.

## Webfont

The webfont is stored in a so-called `.woff2` file. The updated version is generated as follows:

1. Clone our [twemoji fork](https://git.threema.ch/clients/web/twemoji-colr)
2. Check the [network graph](https://github.com/mozilla/twemoji-colr/network) of the original repo
   for maintained forks (win98se or matrix are good choices).
3. Inspect the commits of the forks, bumping the versions in our own project adequately. Chances are
   that you need to download new `.zip`s from https://github.com/jdecked/twemoji/
4. Extract the `svg` folder and zip it into a folder named `twe-svg.zip` and update the
   `twe-svg.zip.version.txt` file.
5. Follow the instructions of the `README.md` in our twemoji fork.
6. Copy the file `build/Twemoji.woff2` into the Threema Desktop project into
   `src/public/res/fonts/twemoji`.

## Emoji Picker Generator (in Threema Desktop)

1. Bump the version of the [emojibase-data](https://github.com/topics/emojibase-data) package to the
   correct version corresponding to the webfont.
2. Run `npm run emoji-generate`.
