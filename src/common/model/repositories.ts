import {
    type IGlobalPropertyRepository,
    type IProfilePictureRepository,
    type Repositories,
    type ServicesForModel,
    type Settings,
} from '~/common/model';
import {ContactModelRepository} from '~/common/model/contact';
import {ConversationModelRepository} from '~/common/model/conversation';
import {GlobalPropertyRepository} from '~/common/model/global-property';
import {GroupModelRepository} from '~/common/model/group';
import {ProfilePictureModelRepository} from '~/common/model/profile-picture';
import {UserModel} from '~/common/model/user';
import {PROXY_HANDLER, TRANSFER_MARKER} from '~/common/utils/endpoint';

export class ModelRepositories implements Repositories {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
    public readonly user: UserModel;
    public readonly contacts: ContactModelRepository;
    public readonly groups: GroupModelRepository;
    public readonly conversations: ConversationModelRepository;
    public readonly profilePictures: IProfilePictureRepository;
    public readonly settings: Settings = {
        [TRANSFER_MARKER]: PROXY_HANDLER,
        // TODO(WEBMD-783)
        blockUnknown: false,
        contactIsBlocked: (identity) => false,
    };
    public readonly globalProperties: IGlobalPropertyRepository;

    public constructor(services: Omit<ServicesForModel, 'model'>) {
        const services_ = {...services, model: this};
        this.user = new UserModel(services_);
        this.contacts = new ContactModelRepository(services_);
        this.groups = new GroupModelRepository(services_);
        this.conversations = new ConversationModelRepository(services_);
        this.profilePictures = new ProfilePictureModelRepository(services_);
        this.globalProperties = new GlobalPropertyRepository(services_);
    }
}
