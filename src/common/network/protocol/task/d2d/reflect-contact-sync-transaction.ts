import {TransactionScope} from '~/common/enum';
import type {Logger} from '~/common/logging';
import {
    ACTIVE_TASK,
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {transactionCompleted} from '~/common/network/protocol/task/manager';

import {type ContactSyncVariant, ReflectContactSyncTask} from './reflect-contact-sync';

export type ContactSyncTaskResult = 'success' | 'aborted';

/**
 * Run the {@link ReflectContactSyncTask} inside a transaction.
 */
export class ReflectContactSyncTransactionTask
    implements ActiveTask<ContactSyncTaskResult, 'volatile'>
{
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = false;
    public readonly transaction = undefined;
    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _precondition: () => boolean,
        private readonly _variant: ContactSyncVariant,
    ) {
        this._log = _services.logging.logger(
            `network.protocol.task.reflect-contact-sync-transaction`,
        );
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<ContactSyncTaskResult> {
        const [state] = await handle.transaction(
            TransactionScope.CONTACT_SYNC,
            this._precondition,
            async (state_) => {
                const task = new ReflectContactSyncTask(this._services, state_, this._variant);
                await task.run(handle);
            },
        );
        const result = transactionCompleted(state) ? 'success' : 'aborted';
        this._log.debug(`Transaction ${result}`);
        return result;
    }
}
