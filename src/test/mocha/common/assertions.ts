import {
    type CspPayloadType,
    type D2mPayloadType,
    CspPayloadTypeUtils,
    D2mPayloadTypeUtils,
} from '~/common/enum';
import {assert} from '~/common/utils/assert';

/**
 * Assert that the `actual` D2M payload type matches `expected` and generate a nice assertion
 * message.
 */
export function assertD2mPayloadType<TExpected extends D2mPayloadType>(
    actual: D2mPayloadType,
    expected: TExpected,
): asserts actual is TExpected {
    assert(
        actual === expected,
        `Expected write with D2M payload type ${D2mPayloadTypeUtils.nameOf(
            expected,
        )}, but found ${D2mPayloadTypeUtils.nameOf(actual)}`,
    );
}

/**
 * Assert that the `actual` CSP payload type matches `expected` and generate a nice assertion
 * message.
 */
export function assertCspPayloadType<TExpected extends CspPayloadType>(
    actual: CspPayloadType,
    expected: TExpected,
): asserts actual is TExpected {
    assert(
        actual === expected,
        `Expected write with CSP payload type ${CspPayloadTypeUtils.nameOf(
            expected,
        )}, but found ${CspPayloadTypeUtils.nameOf(actual)}`,
    );
}
