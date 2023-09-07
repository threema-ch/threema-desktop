import {type Logger} from '~/common/logging';

import {PASSIVE_TASK, type PassiveTask, type PassiveTaskSymbol, type ServicesForTasks} from '.';

/**
 * This is the tech debt task. It reminds you that you **still** haven't implemented <insert task
 * name here>!
 *
 * TODO(DESK-579): Obviously, the task in itself is tech debt and should be removed!
 */
export class TechDebtTask implements PassiveTask<void> {
    public readonly type: PassiveTaskSymbol = PASSIVE_TASK;
    public readonly persist = false;
    private readonly _log: Logger;

    public constructor(
        services: ServicesForTasks,
        private readonly _reminder: string,
    ) {
        this._log = services.logging.logger('TODO');
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(): Promise<void> {
        this._log.warn(this._reminder);
    }
}
