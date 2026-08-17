import type {IdentityString} from '@threema/domain';
import {group_call} from '@threema/protocol/protobuf';
import type {u53} from '@threema/ts-utils/integer/u53';
import type {u64} from '@threema/ts-utils/integer/u64';

/**
 * The result of peeking a call, with the call state (if any and if it could be decrypted) reduced to
 * the identities of the participants.
 *
 * Note: The properties shared with the raw _peek_ response are declared explicitly rather than picked
 * from it, so that this module does not have to import the schemas (which import this module). That
 * the two do not drift apart is asserted at compile time in `sfu.test.ts`.
 */
export interface SfuPeekResult {
    /** When the call was started. */
    readonly startedAt: Date;
    /** Maximum number of participants the SFU admits to the call. */
    readonly maxParticipants: u53;
    /** IMPORTANT: This may include contacts more than once, including the user itself! */
    readonly participants: readonly IdentityString[] | undefined;
}

/**
 * Supported group call features as defined in the group call protocol.
 */
export interface SfuSupportedFeaturesInterface {
    /**
     * Base feature support (always present).
     */
    readonly base: true;
    /**
     * Whether the SFU supports screen sharing.
     */
    readonly screenShare: boolean;
}

/**
 * Supported group call feature flags.
 */
export class SfuSupportedFeatures implements SfuSupportedFeaturesInterface {
    /** @inheritdoc */
    public base;
    /** @inheritdoc */
    public screenShare;

    public constructor(init: SfuSupportedFeaturesInterface) {
        this.base = init.base;
        this.screenShare = init.screenShare;
    }

    /**
     * Create a {@link SfuSupportedFeatures} instance with the most restrictive feature-set
     * possible.
     */
    public static base(): SfuSupportedFeatures {
        return new SfuSupportedFeatures({
            base: true,
            screenShare: false,
        });
    }

    /**
     * Create an instance from a 4-byte SFU `SupportedFeature` bitmask.
     */
    public static fromBitmask(flags: u64): SfuSupportedFeatures {
        return new SfuSupportedFeatures({
            /* eslint-disable no-bitwise */
            base: (flags & BigInt(group_call.SupportedFeature.BASE)) > 0n || true,
            screenShare: (flags & BigInt(group_call.SupportedFeature.SCREEN_SHARE)) > 0n,
            /* eslint-enable no-bitwise */
        });
    }
}
