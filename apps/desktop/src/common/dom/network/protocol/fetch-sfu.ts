import {FetchSfuHttpClient, type SfuCallData, type SfuHttpClient} from '@threema/call/worker';
import type {DtlsFingerprint} from '@threema/webrtc/sdp';

import type {ServicesForBackend} from '~/common/backend';
import type {JoinResponse} from '~/common/network/protobuf/validate/group-call';
import type {GroupCallBaseData} from '~/common/network/protocol/call/group-call';
import type {SfuToken} from '~/common/network/protocol/directory';
import type {PeekResponse, SfuHttpBackend} from '~/common/network/protocol/sfu';

/**
 * Narrow a group call's base data down to the values the shared SFU HTTP client reads, i.e. drop the
 * model store and everything else it has no business knowing about.
 */
function sfuCallData(data: GroupCallBaseData): SfuCallData {
    return {
        callId: data.derivations.callId,
        gcsk: data.derivations.gcsk,
        sfuBaseUrl: data.sfuBaseUrl.parsed,
        protocolVersion: data.protocolVersion,
    };
}

export class FetchSfuHttpBackend implements SfuHttpBackend {
    private readonly _client: SfuHttpClient;

    public constructor(services: Pick<ServicesForBackend, 'config' | 'logging'>) {
        this._client = new FetchSfuHttpClient({
            userAgent: services.config.USER_AGENT,
            logging: services.logging,
        });
    }

    /** @inheritdoc */
    public async peek(data: GroupCallBaseData, token: SfuToken): Promise<PeekResponse | undefined> {
        return await this._client.peek(sfuCallData(data), token.sfuToken);
    }

    /** @inheritdoc */
    public async join(
        data: GroupCallBaseData,
        fingerprint: DtlsFingerprint,
        token: SfuToken,
    ): Promise<JoinResponse> {
        return await this._client.join(sfuCallData(data), fingerprint, token.sfuToken);
    }
}
