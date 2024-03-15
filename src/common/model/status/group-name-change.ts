import type {DbConversationUid, DbStatusMessage, DbStatusMessageUid, UidOf} from '~/common/db';
import type {ServicesForModel} from '~/common/model/types/common';
import type {
    BaseStatusMessageController,
    GroupNameChangeView,
    GroupNameChanges,
} from '~/common/model/types/status';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';

export class GroupNameChangeStatusModelController
    implements BaseStatusMessageController<GroupNameChangeView>
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<GroupNameChangeView>();
    public constructor(
        public readonly uid: UidOf<DbStatusMessage>,
        private readonly _services: ServicesForModel,
    ) {}
}

export class GroupNameChangeModelStore extends LocalModelStore<GroupNameChanges> {
    public constructor(
        uid: DbStatusMessageUid,
        services: ServicesForModel,
        dbConversationUid: DbConversationUid,
        view: GroupNameChangeView,
    ) {
        const {logging} = services;
        const tag = 'status-messages.group-member-change';
        super(
            view,
            new GroupNameChangeStatusModelController(uid, services),
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
