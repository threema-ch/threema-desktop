import {TRANSFER_HANDLER} from '~/common/index';
import type {AnyReceiver} from '~/common/model';
import {PROXY_HANDLER, type ProxyMarked} from '~/common/utils/endpoint';
import {updateReceiverData, type ReceiverUpdateDataFor} from '~/common/viewmodel/utils/receiver';

export interface IReceiverListItemViewModelController<TReceiver extends AnyReceiver>
    extends ProxyMarked {
    /**
     * Update the receiver with the provided data.
     */
    readonly edit: (update: ReceiverUpdateDataFor<TReceiver>) => Promise<void>;
}

export class ReceiverListItemViewModelController<TReceiver extends AnyReceiver>
    implements IReceiverListItemViewModelController<TReceiver>
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(private readonly _receiver: TReceiver) {}

    /** @inheritdoc */
    public async edit(update: ReceiverUpdateDataFor<TReceiver>): Promise<void> {
        return await updateReceiverData(this._receiver, update);
    }
}
