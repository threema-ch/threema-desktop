## Playwright: Integration / End-to-End Tests

We use [Playwright](https://playwright.dev/) for e2e testing. All tests should be placed in
`src/test/playwright/tests`. To be able to run the tests, you have to build a test bundle first:

```bash
# work-sandbox
npm run dist:test:work-sandbox
```

To run all tests just execute:

```bash
# e2e tests work-sandbox
PW_PASSWORD="CHANGE_ME" npm run test:playwright:work-sandbox
```

### Environment Variables:

|          Name | Description                                      |             Types |
| ------------: | ------------------------------------------------ | ----------------: |
| `PW_HEADLESS` | Run tests in headless mode                       | `true` or `false` |
|   `PW_FLAVOR` | App variant and environment, e.g. "work-sandbox" |   `BUILD_FLAVORS` |
| `PW_PASSWORD` | Encryption password                              |          `string` |

If you're using
[Playwright Test for VSCode](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)
you can setup the required env vars in your `settings.json`:

```json
  "playwright.env": {
    "PW_HEADLESS": false,
    "PW_FLAVOR": "work-sandbox",
    "PW_PASSWORD": "CHANGE_ME"
  }
```
