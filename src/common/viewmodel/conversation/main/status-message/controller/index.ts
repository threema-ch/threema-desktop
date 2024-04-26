import type {GroupMemberChangeStatusModelStore} from '~/common/model/status/group-member-change';
import type {GroupNameChangeStatusModelStore} from '~/common/model/status/group-name-change';
import {PROXY_HANDLER, TRANSFER_HANDLER, type ProxyMarked} from '~/common/utils/endpoint';

/**
 * Describes the controller of a status message in the view model. Some statuses might not have any
 * additional functionality, so action will remain undefined. The controller is needed anyway to
 * create a view model bundle.
 */
export interface IConversationStatusMessageViewModelController extends ProxyMarked {
    /**
     * Possible action of a status message that is triggered on a click.
     */
    readonly action?: () => void;
}

export class GroupMemberChangeViewModelController
    implements IConversationStatusMessageViewModelController
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly action?: () => void;

    public constructor(private readonly _statusMessage: GroupMemberChangeStatusModelStore) {}
}

export class GroupNameChangeViewModelController
    implements IConversationStatusMessageViewModelController
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(private readonly _statusMessage: GroupNameChangeStatusModelStore) {}
}
