import {group_call} from '@threema/protocol/protobuf';
import type {u64} from '@threema/ts-utils/integer/u64';

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
