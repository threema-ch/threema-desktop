import type {DbConversationUid, DbStatusMessage, DbStatusMessageUid, UidOf} from '~/common/db';
import type {ServicesForModel} from '~/common/model/types/common';
import type {
    BaseStatusMessageController,
    GroupMemberChangeStatusView,
    GroupMemberChange,
} from '~/common/model/types/status';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';

export class GroupMemberChangeStatusModelController
    implements BaseStatusMessageController<GroupMemberChangeStatusView>
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<GroupMemberChangeStatusView>();

    public constructor(
        public readonly uid: UidOf<DbStatusMessage>,
        private readonly _services: ServicesForModel,
    ) {}
}

export class GroupMemberChangeStatusModelStore extends LocalModelStore<GroupMemberChange> {
    public constructor(
        uid: DbStatusMessageUid,
        services: ServicesForModel,
        dbConversationUid: DbConversationUid,
        view: GroupMemberChangeStatusView,
    ) {
        const {logging} = services;
        const tag = 'status-message.group-member-change';
        super(
            view,
            new GroupMemberChangeStatusModelController(uid, services),
            dbConversationUid,
            view.type,
            {
                debug: {
                    log: logging.logger(`model.${tag}`),
                    tag,
                },
            },
        );
    }
}
