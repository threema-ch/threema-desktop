import {TRANSFER_HANDLER} from '~/common/index';
import type {ServicesForModel} from '~/common/model';
import type {OngoingGroupCall} from '~/common/model/group-call';
import {GroupCallManager} from '~/common/network/protocol/call/group-call';
import {PROXY_HANDLER} from '~/common/utils/endpoint';
import {AsyncLock} from '~/common/utils/lock';
import {WritableStore, type ReadableStore} from '~/common/utils/store';

export type CallType = '1:1-call' | 'group-call';

export interface Call<TType extends CallType> {
    readonly type: TType;
}

export type AnyOngoingCall = undefined | OngoingGroupCall;

export class CallManager {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly group: GroupCallManager;
    private readonly _ongoing = new AsyncLock<CallType, WritableStore<AnyOngoingCall>>(
        new WritableStore<AnyOngoingCall>(undefined),
    );

    public constructor(services: ServicesForModel) {
        this.group = new GroupCallManager(services, this._ongoing);
    }

    /** A call that is considered ongoing, i.e. a call the user is actively participating in. */
    public get ongoing(): ReadableStore<AnyOngoingCall> {
        // Note: This is fine because we only expose it as a `ReadableStore`. Only writing needs to
        // be guarded by the lock.
        return this._ongoing.unwrap();
    }
}
