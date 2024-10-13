# UI Components

We use a structure inspired by [atomic design](https://bradfrost.com/blog/post/atomic-web-design/)
for naming and structuring our UI components.

Our components can be categorized into generic and domain-specific components.

## Component Types

### Generic Components

Generic components should be self-contained and should not depend on any domain-specific code or
types (with a few exceptions, like logging or internationalization).

They mostly define their own prop types and generally use primitive types.

- **Atoms**: The basic building blocks, such as an `Avatar`, a `DateTime`, a `LazyImage`, or a
  `Text` component. Like atoms in nature they're fairly abstract and often not terribly useful on
  their own.

- **Molecules**: Molecules are groups of atoms bonded together and are the smallest fundamental
  units of a compound. Building up to molecules from atoms encourages a "do one thing and do it
  well" mentality. While molecules can be complex, as a rule of thumb they are relatively simple
  combinations of atoms built for reuse.

  Examples: `AudioPlayer` or `KeyValueList`.

- **Organisms**: Organisms are groups of molecules joined together to form a relatively complex,
  distinct section of an interface. Organisms must be self-contained and may be re-usable.

  Note: At this level of abstraction, it is often hard to write generic organisms. In many cases,
  the use of _Partials_ (see below) is easier.

### Domain-Specific Components

These components may make full use of domain-specific logic and types.

Note that viewmodels should be preferred over accessing models and views directly.

- **Higher-Order Components (HOCS)**: HOCS wrap other components and extend them with additional
  functionality. They are similar to the concept of decorators. HOCS usually make use of slots to
  wrap other components.

  Examples: The `OverlayProvider` extends a message component to display its sync state in an
  overlay.

- **Partials**: A part of the application. Similar in size to organisms, but may access
  domain-specific logic and types.

  Examples: The `ChatView` renders an entire conversation message list.

- **Panels**: The content of an entire panel.

  Examples: The `Conversation` fills the main panel and combines the chat view, the compose area and
  the conversation top bar.

## Component Structure

This is the structure of a component, based on the example of a fictional `SearchBar` organism:

```
components/
  organisms/
    search-bar/
      internal/
        search-results-list/
          SearchResultsList.svelte
          props.ts
      SearchBar.svelte
      props.ts
      helpers.ts
      types.ts
```

The props of the component are defined in a file called `props.ts`:

```typescript
export interface SearchBarProps {
  readonly placeholderText: string;
  readonly enabled?: boolean;
}
```

The entry point is the `SearchBar.svelte` file. This file makes use of the props defined above:

```typescript
<script lang="ts">
  import type {SearchBarProps} from './props';

  type $$Props = SearchBarProps;

  export let placeholderText: $$Props['placeholderText'];
  export let enabled: NonNullable<$$Props['enabled']> = true;

  // Constants

  // Local variables

  // Handler functions

  // Helper functions

  // Reactive statements
</script>

<div ...>
  ...
</div>

<style lang="scss">
  @use 'component' as *;

  ...
</style>
```

If some internal parts of the component need to be extracted into separate files, these are added
under the `internal` directory (with the same structure as the root component).

As a rule of thumb, the `.svelte` files should contain as little logic as possible. Complex types
should be extracted to a `types.ts` file. Standalone helper functions should be extracted to a
`helpers.ts` file. If it makes sense, feel free to add additional TypeScript files for structuring
your code.

## Inline Scripts

Keep inline script code in Svelte files at a minimum. If you require to write larger functions, put
them in their own TypeScript file and import them.
