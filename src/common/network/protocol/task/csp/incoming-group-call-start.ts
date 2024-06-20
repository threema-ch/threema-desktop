import type {Logger} from '~/common/logging';
import type {Contact, ContactInit} from '~/common/model';
import {LocalModelStore} from '~/common/model/utils/model-store';
import type {GroupCallStart} from '~/common/network/protobuf/validate/csp-e2e';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {getGroupCallBaseData} from '~/common/network/protocol/task/common/group-call-start';
import {commonGroupReceiveSteps} from '~/common/network/protocol/task/common/group-helpers';
import type {GroupMemberContainer} from '~/common/network/structbuf/validate/csp/e2e';
import type {IdentityString, MessageId} from '~/common/network/types';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Receive and process an incoming `GroupCallStart` message.
 */
export class IncomingGroupCallStartTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, void>
{
    private readonly _log: Logger;
    private readonly _senderIdentity: IdentityString;

    public constructor(
        private readonly _services: ServicesForTasks,
        messageId: MessageId,
        private readonly _senderContactOrInit: LocalModelStore<Contact> | ContactInit,
        private readonly _container: GroupMemberContainer.Type,
        private readonly _groupCallStart: GroupCallStart.Type,
    ) {
        const messageIdHex = u64ToHexLe(messageId);
        this._log = _services.logging.logger(
            `network.protocol.task.in-group-call-start.${messageIdHex}`,
        );
        if (_senderContactOrInit instanceof LocalModelStore) {
            this._senderIdentity = _senderContactOrInit.get().view.identity;
        } else {
            this._senderIdentity = _senderContactOrInit.identity;
        }
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        // Run common group receive steps
        //
        // TODO(DESK-1502): Use declarative `runCommonGroupReceiveStep` instead
        let group;
        {
            const result = await commonGroupReceiveSteps(
                this._container.groupId,
                this._container.creatorIdentity,
                this._senderContactOrInit,
                handle,
                this._services,
                this._log,
            );
            if (result === undefined) {
                this._log.debug(
                    'Aborting processing of group message after common group receive steps.',
                );
                return;
            }
            group = result.group;
        }

        // Register call
        await group
            .get()
            .controller.registerCall.fromRemote(
                handle,
                getGroupCallBaseData(
                    this._services,
                    this._senderIdentity,
                    this._groupCallStart,
                    group,
                ),
            );
    }
}
