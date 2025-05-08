# Updating libthreema

Whenever an update of libthreema is necessary, you need to move the the source files into our repo
and build it there. For this, we created a script that you can call as such:

```
npm run libthreema:include <path-to-libthreema> <optional-commit-like>
```

Note: `<path-to-libthreema>` needs to be the _relative path_ to the location where the `libthreema`
repo was cloned to locally (relative to the project root of `threema-desktop`).

This script roughly does the following:

1. Check out the specified commit-like, if any
2. Copy the content of libthreema to its designated position
3. Build the wasm file
4. Run cleanup scripts for libthreema and threema-protocols

After that, you can commit the changes with a commit: `Upgrade libthreema: x.y.z → x.y.z`. **Make
sure that the cleanup scripts were correctly run before you push the changes**.

We always recommend building libthreema like this because it uses a container. If you want to
manually build libthreema from the source files in the `desktop-client` repo, you can run
`npm run libthreema:build`. See the README for additional dependencies needed in that case.
