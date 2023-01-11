# Test Coverage

> ⚠️ _Note: Currently not working!_

In order to create a full code coverage report, you will have to run the full test suite and then
generate the coverage report:

```bash
npm run clean
npm run cypress:web:test
npm run karma:common:test
npm run coverage:report
```

The test suites will place their raw coverage data in `build/test-coverage-data` which will be
picked up and merged by the reporter. The reporter will create a HTML summary in
`build/test-coverage-report`.

Note that the test suites are allowed to run in parallel, if desired.
