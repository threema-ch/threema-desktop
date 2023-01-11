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
