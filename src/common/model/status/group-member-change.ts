import type {DbConversationUid, DbStatusMessageUid} from '~/common/db';
import {GenericStatusModelController} from '~/common/model/status';
import type {ServicesForModel} from '~/common/model/types/common';
import type {GroupMemberChangeStatus} from '~/common/model/types/status';
import {LocalModelStore} from '~/common/model/utils/model-store';

export class GroupMemberChangeStatusModelStore extends LocalModelStore<GroupMemberChangeStatus> {
    public constructor(
        uid: DbStatusMessageUid,
        services: ServicesForModel,
        dbConversationUid: DbConversationUid,
        view: GroupMemberChangeStatus['view'],
    ) {
        const {logging} = services;
        const tag = 'status-message.group-member-change';
        super(view, new GenericStatusModelController(uid, services), dbConversationUid, view.type, {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    }
}
