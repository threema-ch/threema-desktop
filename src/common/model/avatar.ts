import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {PROXY_HANDLER, TRANSFER_MARKER} from '~/common/utils/endpoint';

import {
    type Avatar,
    type AvatarController,
    type AvatarUpdate,
    type AvatarView,
    type ServicesForModel,
} from '.';

export class AvatarModelController implements AvatarController {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<AvatarView>();

    // @ts-expect-error: TODO(WEBMD-231)
    public constructor(private readonly _services: ServicesForModel) {}

    public update(change: AvatarUpdate): void {
        this.meta.update(() => {
            throw new Error('TODO'); // TODO(WEBMD-231)
        });
    }
}

export class AvatarModelStore extends LocalModelStore<Avatar> {
    public constructor(services: ServicesForModel, avatar: AvatarView) {
        const {logging} = services;
        const tag = 'avatar';
        super(avatar, new AvatarModelController(services), undefined, undefined, {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    }
}
