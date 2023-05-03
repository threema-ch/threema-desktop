# Internationalization (i18n)

Translations are stored as one `translation.json` file per language in the respective language folder:

```md
.
├── en
│ └── translation.json
├── de
│ └── translation.json
├── ...
│ └── translation.json
.
```

The structure of the translation files is as flat as possible, relying on a depth of 2:

1. Separation by general topic or feature set, such as "messaging", "contacts" etc. Note: all the content of a modal, dialog, or popup will also be grouped into its own "topic" named `"dialog--{name}"`.
2. Key-value pairs in the format `"{modifier}--{name}": "Some translated text..."` holding the actual translations.

## Modifiers

Instead of using only arbitrary names as translation keys, modifiers allow for conveying additional context to translators, which could be necessary to choose the suitable tone, wording, or casing for a specific snippet.

Only the following modifiers (sorted by precedence from highest to lowest) should be used. If more than one applies, use the one with the highest precedence (e.g., use "action" instead of "label"). If none applies, it is probably `prose`.

1. Text that represents a status (which might be shown as a notification, a notice in the UI as long as the state reflects that status).
   1. **"error":** Represents an error state or message.
      - Example: "Passwords do not match"
      - Use cases: Notification toast text, error labels in the UI
   2. **"success":** Represents a success state or message.
      - Example: "Link copied to clipboard"
      - Use cases: Notification toast text
2. **"action":** Words or short text associated with actions or commands, such as buttons or links.
   - Example: "Reconnect"
   - Use cases: Button text, link text, action items in menus
3. **"label":** Short text used as titles, labels and placeholders for input fields, navigation elements, etc.
   - Example: "CSP Device Id"
   - Use cases: Titles, input field labels, navigation elements, table headers
4. **"hint":** Additional text or information associated with another piece of information.
   - Example: "Forgot password?"
   - Use cases: `alt=` text, tooltip text
5. **"markup":** Similar to `prose` (see below), but can contain a set of predefined `slot`s that can be replaced by a predefined component.
6. **"prose":** Miscellaneous text snippets, which are usually longer and form a coherent text.
   - Example: "This tech preview only works in..."
   - Use cases: Explainers, aside text, body text
