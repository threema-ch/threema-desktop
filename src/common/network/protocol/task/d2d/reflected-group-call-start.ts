import type {Logger} from '~/common/logging';
import type {GroupCallStart} from '~/common/network/protobuf/validate/csp-e2e';
import type {
    ComposableTask,
    PassiveTaskCodecHandle,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {getGroupCallBaseData} from '~/common/network/protocol/task/common/group-call-start';
import type {GroupMemberContainer} from '~/common/network/structbuf/validate/csp/e2e';
import type {IdentityString, MessageId} from '~/common/network/types';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Receive and process a reflected incoming or outgoing `GroupCallStart` message.
 */
export class ReflectedGroupCallStartTask implements ComposableTask<PassiveTaskCodecHandle, void> {
    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        messageId: MessageId,
        private readonly _senderIdentity: IdentityString,
        private readonly _container: GroupMemberContainer.Type,
        private readonly _groupCallStart: GroupCallStart.Type,
    ) {
        const messageIdHex = u64ToHexLe(messageId);
        this._log = _services.logging.logger(
            `network.protocol.task.reflected-group-call-start.${messageIdHex}`,
        );
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(): Promise<void> {
        // Look up group
        const group = this._services.model.groups.getByGroupIdAndCreator(
            this._container.groupId,
            this._container.creatorIdentity,
        );
        if (group === undefined) {
            this._log.debug(`Abort processing of group call start message for unknown group`);
            return;
        }

        // Register call
        group
            .get()
            .controller.registerCall.fromSync(
                getGroupCallBaseData(
                    this._services,
                    this._senderIdentity,
                    this._groupCallStart,
                    group,
                ),
            );
    }
}
