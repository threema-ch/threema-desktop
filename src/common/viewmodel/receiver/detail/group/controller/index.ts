import type {DbContactReceiverLookup} from '~/common/db';
import {AcquaintanceLevel} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {Group} from '~/common/model';
import {assert} from '~/common/utils/assert';
import {PROXY_HANDLER, type ProxyMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';

export interface IGroupDetailViewModelController extends ProxyMarked {
    /**
     * Update the acquaintance level of the contact specified by `lookup`.
     */
    readonly setAcquaintanceLevelDirect: (lookup: DbContactReceiverLookup) => Promise<void>;
}

export class GroupDetailViewModelController implements IGroupDetailViewModelController {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(
        private readonly _services: Pick<ServicesForViewModel, 'model'>,
        private readonly _group: Group,
    ) {}

    /** @inheritdoc */
    public async setAcquaintanceLevelDirect(lookup: DbContactReceiverLookup): Promise<void> {
        const contact = this._services.model.contacts.getByUid(lookup.uid);
        assert(contact !== undefined, 'A contact that is visible in the group details must exist');

        // Do nothing if the contact is a direct contact already.
        if (contact.get().view.acquaintanceLevel === AcquaintanceLevel.DIRECT) {
            return;
        }
        await contact.get().controller.update.fromLocal({
            acquaintanceLevel: AcquaintanceLevel.DIRECT,
        });
    }
}
