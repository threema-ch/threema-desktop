import {ContactModelRepository} from '~/common/model/contact';
import {ConversationModelRepository} from '~/common/model/conversation';
import {GlobalPropertyRepository} from '~/common/model/global-property';
import {GroupModelRepository} from '~/common/model/group';
import {MessageModelRepository} from '~/common/model/message';
import {
    ProfilePictureModelRepository,
    type ProfilePictureRepository,
} from '~/common/model/profile-picture';
import type {ServicesForModel} from '~/common/model/types/common';
import type {ContactRepository} from '~/common/model/types/contact';
import type {ConversationRepository} from '~/common/model/types/conversation';
import type {GroupRepository} from '~/common/model/types/group';
import type {MessageRepository} from '~/common/model/types/message';
import type {IGlobalPropertyRepository} from '~/common/model/types/settings';
import type {User} from '~/common/model/types/user';
import {UserModel} from '~/common/model/user';
import {PROXY_HANDLER, type ProxyMarked, TRANSFER_HANDLER} from '~/common/utils/endpoint';

export type Repositories = {
    readonly user: User;
    readonly contacts: ContactRepository;
    readonly groups: GroupRepository;
    readonly conversations: ConversationRepository;
    readonly messages: MessageRepository;
    readonly profilePictures: ProfilePictureRepository;
    readonly globalProperties: IGlobalPropertyRepository;
} & ProxyMarked;

export class ModelRepositories implements Repositories {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly user: UserModel;
    public readonly contacts: ContactModelRepository;
    public readonly groups: GroupModelRepository;
    public readonly conversations: ConversationModelRepository;
    public readonly messages: MessageModelRepository;
    public readonly profilePictures: ProfilePictureRepository;
    public readonly globalProperties: GlobalPropertyRepository;

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
        this.messages = new MessageModelRepository(services_);
        this.globalProperties = new GlobalPropertyRepository(services_);
    }
}
