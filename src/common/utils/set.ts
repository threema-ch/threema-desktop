/**
 * Returns the type of the set item.
 */
export type SetValue<TSet extends ReadonlySet<unknown>> =
    TSet extends ReadonlySet<infer TSetValue> ? TSetValue : never;
