import {expect} from 'chai';

import {GroupUserState} from '~/common/enum';
import type {Contact, Group} from '~/common/model';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import {assert} from '~/common/utils/assert';
import {
    addTestGroup,
    addTestUserAsContact,
    makeTestServices,
    makeTestUser,
    type TestServices,
} from '~/test/mocha/common/backend-mocks';

export function run(): void {
    describe('group model', function () {
        const me = makeTestUser('MEMEMEME');
        const anotherUser = makeTestUser('USER0001');

        let services: TestServices;
        let contact: LocalModelStore<Contact>;
        let group: LocalModelStore<Group>;

        this.beforeEach(function () {
            services = makeTestServices(me.identity.string);
            contact = addTestUserAsContact(services.model, anotherUser);
            group = addTestGroup(services.model, {
                creator: 'me',
                members: [contact.ctx],
                createdAt: new Date(),
            });
        });

        it('get the correct creator from the group', function () {
            const creator = group.get().view.creator;
            expect(creator, 'Creator should be me').to.eq('me');
        });

        it('add/remove a member to/from the group', async function () {
            const thirdUser = makeTestUser('USER0002');

            const thirdContact = addTestUserAsContact(services.model, thirdUser);

            await group.get().controller.members.add.fromLocal([thirdContact.ctx]);

            const members = group.get().view.members;

            expect([...members].map((member) => member.get().view.identity)).to.have.members([
                'USER0002',
                'USER0001',
            ]);

            await group.get().controller.members.remove.fromLocal([contact.ctx]);

            const members2 = group.get().view.members;
            expect([...members2].map((member) => member.get().view.identity)).to.have.members([
                'USER0002',
            ]);
        });

        it('add the creator/a member that is already in the group', async function () {
            const group2 = addTestGroup(services.model, {
                creator: contact,
                members: [],
                createdAt: new Date(),
            });

            expect(group2.get().view.userState).to.eq(GroupUserState.MEMBER);
            expect(group2.get().view.members).to.be.empty;
            const creator = group2.get().view.creator;
            assert(creator !== 'me');

            await group2.get().controller.members.add.fromLocal([creator.ctx]);

            expect(group2.get().view.members).to.be.empty;
        });
    });
}
