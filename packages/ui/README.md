# @threema/ui

Reusable UI components, built with Svelte 5 and Tailwind CSS.

## Rules

The rules below apply to everything in this package. They exist so that components stay composable,
extensible and predictable, and so that a consumer can rely on the same conventions everywhere.

Important: While the rules should be followed as closely as possible, certain situations require
flexibility. Judge yourself on a case-by-case basis.

### Scope

- Components in this package are independent of business logic. They must not import or reference
  domain-specific code, types or services.
- All user-facing text is supplied by the consumer through props. Never hardcode display strings,
  and never localize inside this package.
- Do not use stores. State is expressed with runes, and reactive data is received as plain props.

### File Structure

- Components go into `src/components/`, wrappers which add behaviour to arbitrary content go into
  `src/hocs/`, and general helpers which do not belong to a specific component go into `src/utils/`.
- One directory per component, named in `kebab-case`, containing the component, its stories, its
  tests and, if its tests need one, its fixture: `X.svelte`, `X.stories.svelte`, `X.test.ts` and
  `X.fixture.svelte`. Note: Stories and tests are optional, and should primarily be used for complex
  components with configurable behavior and edge-cases.
- Add an `index.ts` to a component's directory only if it exposes subcomponents. Otherwise, export
  the component from `src/index.ts` directly.
- Every component, along with its `XYZProps` and variants types, is re-exported from `src/index.ts`.
  Additional types exported from components are only re-exported from `src/index.ts` if it's
  necessary to access them from other packages.

### Script Blocks

- Each component has exactly two script blocks: `<script lang="ts" module>` followed by
  `<script lang="ts">`.
- The module block contains all imports, all exported types and all exported variant definitions,
  and nothing else.
- The instance block contains only prop destructuring, local state, derivations and handlers. Keep
  the amount of logic minimal, and extract anything substantial into a `helpers.ts` next to the
  component.
- Logic that can be generalized and is reusable across components should be put into `src/utils/`
  instead of the `helpers.ts` file.
- Do not use a `<style>` block for anything which utility classes can express.

### Props

- The custom props should be defined as
  `type BaseProps = WithElementRef<WithChildren<{...}>, HTMLDivElement>;`. Omit `WithChildren` if
  the component is not supposed to accept children.
- The exported props are then composed out of the `BaseProps` and the inherited props of the
  outermost HTML element:
  `export type XYZProps = BaseProps & WithoutChildren<Omit<HTMLAttributes<HTMLDivElement>, keyof BaseProps>>;`.
- Export the props type as `XYZProps`, and mark every property `readonly`.
- Destructure props with `let`, rename `class` to `className`, declare `ref = $bindable(null)`, and
  collect the remainder in `...restProps`, which is spread onto the root element.
- Sort destructured props and the members of a props type alphabetically.
- Document every prop whose purpose is not evident from its name with a JSDoc comment, and state its
  default value if it has one.
- Reuse the prop types of child components with `Pick<...>` instead of redeclaring properties which
  are only forwarded.
- Name a callback prop `on<event>`, all lowercase, after the event it reports rather than after the
  action the consumer is expected to take.

### Styling

- Use Tailwind utility classes. Colors, fonts and spacing come from the theme tokens; never hardcode
  a color value.
- Every color utility has a `dark:` counterpart, unless the value is deliberately the same in both
  themes.
- Use `tv()` with named slots only for styling which the consumer selects through props. Export the
  definition as `xyzVariants` so consumers can compose with it, and compute the slots with
  `const slots = $derived(xyzVariants({...}));` in the instance block.
- If a component's styling is entirely internal, i.e. not selectable through props, write the
  classes directly onto the elements. Do not add a variant definition only to move classes out of
  the markup.
- The outermost element of a component consumes the `className` last, using `cn()`, so that it can
  override the component's own classes.

### Sizing and Layout

- A component whose content gives it an intrinsic size is sized by that content by default.
- A component whose content has no intrinsic size, i.e. one whose content scales to the space
  available, fills its parent and leaves the choice of size to it.
- Never set an outer margin or a position on the root element. The space between a component and its
  surroundings belongs to the consumer.
- Constrain the size of the root element only where the constraint follows from the component's own
  design. A constraint which depends on the surrounding layout belongs to the consumer.

### Composition

- Expose an extension point as a snippet whenever the consumer needs to provide markup rather than
  data.
- A component which renders content it does not own must not assume that content's element type.
  Render it through a snippet, and pass the attributes it needs to wire up.
- Attach subcomponents to their parent with `Object.assign` in the component's `index.ts`, so that
  they are used as `Parent.Child`.

### Accessibility

- Use the element which matches the semantics of the content, e.g. a list for a list, and a
  `<button>` for something which is clicked. Buttons carry `type="button"` unless they submit a
  form.
- Every interactive element has an accessible name. If that name is user-facing text, it needs to be
  passed in as a prop.
- Hide decorative content, including icon glyphs, from assistive technology with
  `aria-hidden="true"`.
- Express state which has no native equivalent through ARIA attributes.

### Documentation and Tests

- Every component starts with an `@component` doc comment which describes what it does, followed by
  an `@example` block showing typical usage.
- Complex or particularly configurable components should have Stories and Tests.
- Component tests should select elements by role and accessible name, rather than by class or
  position.
- A component which can be tested on its own is rendered directly in its `X.test.ts`. Do not add a
  fixture for it.
- A component which only works as part of a tree, i.e. together with its subcomponents, gets a
  fixture `X.fixture.svelte`, which composes that tree out of plain data so that the tests stay in
  `X.test.ts`. Note: A fixture is test-only, so neither it nor its types are exported from
  `src/index.ts`.
- Comment the intent behind markup and class choices which are not self-evident, not their
  mechanics.
