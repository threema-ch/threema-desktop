# Architecture

This file documents some aspects of the structure and architecture of the Threema desktop project.
It is by no means complete, but should help with understanding and extending the codebase.

## Overview

In the [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model/),
there are three different process types:

- The `main` process. This is where a window is created and where the Electron application is
  initialized. This process has access to all NodeJS APIs, but not to the DOM. In Threema Desktop,
  the entry point is located at `src/electron/electron-main.ts`.
- The `preload` script. This script runs in the browser process, but – in contrast to the renderer
  process – can communicate with the main process.
- The `renderer` process. This process loads the target webapplication and has access to the DOM and
  the application's APIs. It does not have access to the NodeJS APIs. In Threema Desktop, the entry
  point is the `src/index.html` file. In development mode, a local development web server is used,
  while in release mode, the file is accessed directly through a `file://` URL.

The entry point of the web application itself is located at `src/app/app.ts`. It loads all necessary
services and also instantiates the backend worker.

The backend worker contains all the main business logic used in Threema Desktop. It is the "core" of
the application. The entry point can be found at `src/worker/backend/electron/backend.worker.ts`.

## Directory Structure

All source code is in the `src` directory:

- `src/app` is the application that runs in the renderer process. It allows access to the DOM and a
  subset of the Electron API.
- `src/electron/electron-main` is the entrypoint for Electron. It allows full access to the Electron
  API.
- `src/common` is common code that can be imported by any of the other code bases.
- `src/common/dom` is common code that uses parts of the DOM API and can be imported by any other
  code base that provides the required subset of the DOM API. Note however that anything that can be
  done without the DOM should be in `src/common` instead.
- `src/common/node` is common code that uses the Node API and can be imported by any other code base
  that provides a Node environment. Note however that anything that can be done without the Node API
  should be in `src/common` instead.
- `src/worker/backend` is the entrypoint of the backend worker that will be started by the
  application. It does all the heavy lifting such as crypto, network connections and access to the
  database. It allows access to the WebWorker API (which is a subset of the DOM).
- `src/worker/backend/electron` is the entrypoint for the electron build variant. Code in this
  directory should be as short as possible (glue code).

Only source files matching `entry.*.ts` or `entry.ts` are valid entry points. This ensures that no
functions are being invoked implicitly when including sources for unit testing since any
`*.loader.ts` files will be excluded from testing. These files should therefore be as minimal as
possible (i.e. include and call only).
