# Styles & Theming

The fundamental design tokens in Threema Desktop are implemented as themes, so they can be
overridden based on the current app flavor or user preferences.

## Theme Variables

Usually, CSS variables would be defined and used as follows:

```css
:root {
  --card-bg-color: black;
}

.card {
  background-color: var(--card-bg-color);
  color: var(--card-text-color);
}
```

While this is perfectly fine, it's not always obvious if a variable is actually defined, because CSS
variables are not validated. In the example above, even though it would "compile" without issues,
`color` wouldn't have any effect on styling, as `--card-text-color` is not defined.

This issue is amplified in projects that use a centralized theme, because variables might be removed
from the theme even if they are still in use.

In Threema Desktop, variables are validated at compile time by the SCSS compiler. This is archieved
by a custom SCSS function named `var`, which overrides the normal CSS `var` accessor and ensures
that the variable name exists. Therefore, a variable is only valid if it's defined in one of the
following ways:

1. It exists in the theme config (see below), or
2. It is registered as a temporary variable (see section "Temporary Variables" below), or
3. It is accompanied by a default value when used directly, e.g., `color: var(--foo-color, #123456);`.

Theme variables are global and can be used throughout the application. If a certain variable is
bound to some state in a single component, use temporary variables instead (see section "Temporary
Variables" for more information).

### Adding a new theme variable

#### 1. Add it to `src/sass/_config.scss`

`src/sass/_config.scss` contains all configured variables of the application. To add a new variable,
it needs to be added to a section (`app`, `individual-components`, `message-components`, or
`compound-components`) under `css-vars` in the aforementioned file. Which section is appropriate for
a given variable depends on the specific use case. From a functional perspective it does not matter
which section the variable is added to, as they are only used for categorization (to allow for a
better overview).

As an example, if we want to make the background color of incoming messages themable, we could add a
new variable named `--mc-message-background-color-incoming` to the `message-components` section:

```diff
// src/sass/_config.scss

$config: config-merge(components.$config, (
  css-vars: (
    // ... other sections
    message-components: (
      // ... other variables
+     --mc-message-background-color-incoming,
    ),
    // ... other sections
  )
));
```

#### 2. Add it to the theme

Before the new variable can be used, it has to be added to the theme in `src/sass/_theme.scss`. For
the variable in the aforementioned example, this would be done as follows:

```diff
// src/sass/_theme.scss

@function -message-components-theme($theme, $branding) {
  $t: -g($theme, app);
  $b: $branding;
  $mc: -g($theme, message-components);

  // prettier-ignore
  @return (
    // ... other variables
+   --mc-message-background-color-incoming: -g($mc, message-background-color-incoming),
    // ... other variables
  );
}
```

The `-g(...)` util is used to extract the value of a given key (in this case
`message-background-color-incoming`) from a given map (in this case `$mc`). As `$mc` is an alias for
the `message-components` section of the passed-in `$theme`, `--mc-message-background-color-incoming`
will now correspond to the value defined under
`message-components.message-background-color-incoming` in each theme.

Note: It would be perfectly fine to directly assign some value (e.g., `#000000`) to the variable in
`_theme.scss`, instead of using the `-g(...)` helper, if the value is the same in both light and
dark themes.

#### 3. Assign a value

Lastly, the key that was mapped to the new variable (using the `-g(...)` util) needs to actually be
defined. In the previous example, it would need to be added to each theme
(`src/sass/theme/_dark.scss` and `src/sass/theme/_light.scss`, respectively).

> ⚠️ If the `-g(...)` helper is used to extract values from the light and dark themes, the value has
> to actually be defined in both themes, or the application will not compile.

In the example, the value would be added as follows:

```diff
// src/sass/theme/_dark.scss

@function generate-dark-theme($branding) {
  // see https://github.com/prettier/prettier/issues/15369:
  // prettier-ignore
  @return (
    // ... other sections
    message-components: (
      // ... other values
+     message-background-color-incoming: rgba(255, 255, 255, 0.12),
      // ... other values
    )
  );
}
```

```diff
// src/sass/theme/_light.scss

@function generate-dark-theme($branding) {
  // see https://github.com/prettier/prettier/issues/15369:
  // prettier-ignore
  @return (
    // ... other sections
    message-components: (
      // ... other values
+     message-background-color-incoming: rgba(0, 0, 0, 0.12),
      // ... other values
    )
  );
}
```

## Temporary Variables

If a variable doesn't need to be global and/or themable, e.g. for local, component-scoped variables,
it still needs to be defined in a way for the compile-time existence checks to succeed.

To define a local variable in a Svelte component, the `def-var(...)` util can be used to register
it. As an example, a css variable `--cc-t-background-color` could be defined and used as follows:

```svelte
<style lang="scss">
  @use 'component' as *;

  $-temp-vars: (--cc-t-background-color);

  .some-element {
    @include def-var($-temp-vars, --cc-t-background-color, #000000);

    background-color: var($-temp-vars, --cc-t-background-color);

    // ... other styles
  }
</style>
```

Note:

- The SCSS map `$-temp-vars` is named arbitrarily and is only used to be able to reference the
  defined temporary variable(s) from multiple places in the code.
- `def-var(...)` is used to assign a value to one of the variables (in this case
  `--cc-t-background-color`) in the `$-temp-vars` map.
- `var(...)` can be used to use one of the map's variables.
