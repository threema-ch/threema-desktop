import {TransactionScope} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {
    ACTIVE_TASK,
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {transactionCompleted} from '~/common/network/protocol/task/manager';

import {type GroupSyncVariant, ReflectGroupSyncTask} from './reflect-group-sync';

export type GroupSyncTaskResult = 'success' | 'aborted';

/**
 * Run the {@link ReflectGroupSyncTask} inside a transaction.
 */
export class ReflectGroupSyncTransactionTask
    implements ActiveTask<GroupSyncTaskResult, 'volatile'>
{
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = false;
    public readonly transaction = undefined;
    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _precondition: () => boolean,
        private readonly _variant: GroupSyncVariant,
    ) {
        this._log = _services.logging.logger(
            `network.protocol.task.reflect-group-sync-transaction`,
        );
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<GroupSyncTaskResult> {
        const [state] = await handle.transaction(
            TransactionScope.GROUP_SYNC,
            this._precondition,
            async (state_) => {
                const task = new ReflectGroupSyncTask(this._services, state_, this._variant);
                await task.run(handle);
            },
        );
        const result = transactionCompleted(state) ? 'success' : 'aborted';
        this._log.debug(`Transaction ${result}`);
        return result;
    }
}
