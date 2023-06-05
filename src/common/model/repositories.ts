import {
    type IGlobalPropertyRepository,
    type IProfilePictureRepository,
    type Repositories,
    type ServicesForModel,
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
    public readonly globalProperties: IGlobalPropertyRepository;

    public constructor(services: Omit<ServicesForModel, 'model'>) {
        const services_ = {...services, model: this};
        // Note: Because we pass a `this`-reference to the repository constructors before this
        //       constructor has finished (and thus before `this` is completely constructed), it is
        //       important that the order of instantiation below is correct. For example, the
        //       `ContactModelRepository` constructor requires the `profilePictures` property to be
        //       initialized.
        this.profilePictures = new ProfilePictureModelRepository(services_);
        this.user = new UserModel(services_);
        this.contacts = new ContactModelRepository(services_);
        this.groups = new GroupModelRepository(services_);
        this.conversations = new ConversationModelRepository(services_);
        this.globalProperties = new GlobalPropertyRepository(services_);
    }
}
