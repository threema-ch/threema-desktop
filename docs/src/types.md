# Types

## Instance vs. Object Literal

When a type is declared by the use of `class` and used in another place, e.g. a function, like so:

```ts
class Foo { ... }

declare function doWithFoo(foo: Foo): void;
```

we generally expect an instance of the class even though TypeScript allows to call `doWithFoo` with
an object literal.

On the other hand, if a type is declared by the use of `type` or `interface`, we sometimes expect it
to be an object literal (e.g. in model views) and sometimes use them just as a baseline to implement
a `class` from. The following ruleset can be applied to determine the expectation:

1. Is the implementation right next to the type/interface declaration? Then look at that.
2. Is it used as a view snapshot as part of a model? Then it requires using an object literal.
3. Does it include functions? Then it's most likely a baseline to implement a `class` from.
4. If it's still not clear, ask your colleagues or acquire more context.
