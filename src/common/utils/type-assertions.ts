/**
 * Helper type to assert that type parameter `A` is assignable to `B`.
 */
export type AssertAssignable<A extends B, B> = A;

// Examples / type tests

/* eslint-disable @typescript-eslint/no-unused-vars */

type TestAssertAssignableValid = AssertAssignable<'hello', string> &
    AssertAssignable<{a: 'hello'}, {a: string}> &
    AssertAssignable<{a: string; b: boolean}, {a: string}>;

// @ts-expect-error: string is not assignable to 'hello'
type TestAssertAssignableInvalid1 = AssertAssignable<string, 'hello'>;

// @ts-expect-error: object is not assignable to string
type TestAssertAssignableInvalid2 = AssertAssignable<object, string>;

/* eslint-enable @typescript-eslint/no-unused-vars */
