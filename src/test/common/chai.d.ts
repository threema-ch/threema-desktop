declare global {
    namespace Chai {
        /** @inheritdoc */
        export interface Assertion extends LanguageChains, NumericComparison, TypeComparison {
            byteEqual: (value: Uint8Array) => Assertion;
        }

        /** @inheritdoc */
        export interface Assert {
            byteEqual: (value: Uint8Array, msg?: string) => void;
        }
    }

    // Expose `expect`
    const expect: Chai.ExpectStatic;
}

export function chaiByteEqual(chai: unknown): unknown;
