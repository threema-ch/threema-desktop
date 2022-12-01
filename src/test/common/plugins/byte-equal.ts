function compareByteArrays(actual: Uint8Array, expected: Uint8Array): boolean {
    return (
        actual.byteLength === expected.byteLength &&
        actual.every((value, index) => value === expected[index])
    );
}

/**
 * Deep compare of Uint8Arrays.
 */
export default function (chai: Chai.ChaiStatic): void {
    chai.Assertion.addMethod('byteEqual', function (expected: Uint8Array) {
        this.assert(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            compareByteArrays(this._obj, expected),
            'expected #{this} to equal #{exp}',
            'expected #{this} to not equal #{exp}',
            this._obj,
        );
    });
}
