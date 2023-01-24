# Mocha: Node Unit Tests

Root: `src/test/mocha/`

Everything that needs access to NodeJS APIs and does not require a UI should be tested by a Mocha
test.

```bash
# Run tests
npm run test:mocha
```

To filter tests, you can pass arguments to mocha:

```bash
npm run test:mocha -- --grep "load stored files"
```

By default, for database tests, an in-memory database is used. If you prefer to use a temporary
database in your temporary directory, which can be inspected when a test fails, set the
`TEST_DATABASE=tempfile` env var before running the tests.

## Task Tests

We provide a `TestHandle` (in `src/test/mocha/common/backend-mocks.ts`) which
mocks a handle and allows testing tasks.

The `TestHandle` expects an ordered list of network expectations, for example:

- Expect a message to be sent to the network
- Expect a message to be reflected
- Expect a message to be read from the network
- Expect a transaction to be started
- ...and so on

> ⚠️ **Warning:** When using expectations in tests, always assert that the expectations have been
> consumed after the test has ended! You can do this by calling the `finish()` method:
>
> ```ts
> it('test something', async function () {
>     const handle = new TestHandle(services, [...]);
>     await task.run(handle);
>     handle.finish();
> });
> ```
