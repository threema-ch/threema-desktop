# Developer Docs

## Prerequisites

To build the docs, you need [mdbook], [mdbook-plantuml] and [PlantUML] on your PATH.

The first two can be installed through cargo:

    $ cargo install mdbook mdbook-plantuml

Make sure that you have `~/.cargo/bin/` on your PATH.

[mdbook]: https://github.com/rust-lang/mdBook
[mdbook-plantuml]: https://github.com/sytsereitsma/mdbook-plantuml
[plantuml]: https://plantuml.com/

## Building

You can build the HTML with `mdbook build`.

To serve the docs on `localhost:3000` and watch for changes, use `mdbook serve`.
