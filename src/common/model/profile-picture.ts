import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {PROXY_HANDLER, TRANSFER_MARKER} from '~/common/utils/endpoint';

import {
    type ProfilePicture,
    type ProfilePictureController,
    type ProfilePictureUpdate,
    type ProfilePictureView,
    type ServicesForModel,
} from '.';

export class ProfilePictureModelController implements ProfilePictureController {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
    public readonly meta = new ModelLifetimeGuard<ProfilePictureView>();

    // @ts-expect-error: TODO(WEBMD-231)
    public constructor(private readonly _services: ServicesForModel) {}

    public update(change: ProfilePictureUpdate): void {
        this.meta.update(() => {
            throw new Error('TODO'); // TODO(WEBMD-231)
        });
    }
}

export class ProfilePictureModelStore extends LocalModelStore<ProfilePicture> {
    public constructor(services: ServicesForModel, profilePicture: ProfilePictureView) {
        const {logging} = services;
        const tag = 'profile-picture';
        super(profilePicture, new ProfilePictureModelController(services), undefined, undefined, {
            debug: {
                log: logging.logger(`model.${tag}`),
                tag,
            },
        });
    }
}
