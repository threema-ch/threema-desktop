# Models

## Model / Store / View Guidelines

All properties of inits and views should be `readonly`. If you need to make some property
temporarily mutable, e.g. when creating an init and needing to overwrite specific properties, use
`Mutable<SomeView, 'foo'>` for those specific properties. If this is too tedious because your code
changes a lot of properties before passing them down, use `Mutable<SomeView>`. Note that it is never
safe to cast `SomeView` retrieved from a model store to `Mutable<SomeView, ...>`.

> ⚠️ A note on `Model` usage: For the time being, `Model.view` is updated every time a `ModelStore`
> is being updated. This can be surprising in async code when accessing `.view`. Thus, it should be
> avoided to forward `Model` instances to other functions. You should either forward the
> `ModelStore` **or** the view snapshot of the `Model`!
