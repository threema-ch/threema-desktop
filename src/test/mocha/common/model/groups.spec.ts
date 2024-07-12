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
                members: [contact],
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

            await group.get().controller.addMembers.fromLocal([thirdContact], new Date());

            const members = group.get().view.members;

            expect([...members].map((member) => member.get().view.identity)).to.have.members([
                'USER0002',
                'USER0001',
            ]);

            await group.get().controller.removeMembers.fromLocal([contact], new Date());

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

            const numAdded = await group2
                .get()
                .controller.addMembers.fromLocal([creator], new Date());
            expect(numAdded).to.eq(0);
            expect(group2.get().view.members).to.be.empty;
        });

        it('set group members', function () {
            const thirdUser = makeTestUser('USER0002');
            const thirdContact = addTestUserAsContact(services.model, thirdUser);

            const {added, removed} = group
                .get()
                .controller.setMembers.fromSync([contact, thirdContact], new Date());

            const members = group.get().view.members;

            expect([...members].map((member) => member.get().view.identity)).to.have.members([
                'USER0001',
                'USER0002',
            ]);

            expect(added).to.eq(1);
            expect(removed).to.eq(0);

            const {added: added2, removed: removed2} = group
                .get()
                .controller.setMembers.fromSync([], new Date());

            const members2 = group.get().view.members;

            expect([...members2].map((member) => member.get().view.identity)).to.be.empty;

            expect(added2).to.eq(0);
            expect(removed2).to.eq(2);
        });

        it('set group members with duplicates', function () {
            const thirdUser = makeTestUser('USER0002');
            const thirdContact = addTestUserAsContact(services.model, thirdUser);

            const {added, removed} = group
                .get()
                .controller.setMembers.fromSync(
                    [contact, thirdContact, contact, thirdContact],
                    new Date(),
                );

            const members = group.get().view.members;

            expect([...members].map((member) => member.get().view.identity)).to.have.members([
                'USER0001',
                'USER0002',
            ]);

            expect(added).to.eq(1);
            expect(removed).to.eq(0);
        });

        it('set group members with the creator', function () {
            const group2 = addTestGroup(services.model, {
                creator: contact,
                members: [],
                createdAt: new Date(),
            });

            const {added, removed} = group2
                .get()
                .controller.setMembers.fromSync([contact], new Date());

            expect(group2.get().view.members).to.be.empty;

            expect(added).to.eq(0);
            expect(removed).to.eq(0);

            expect(group2.get().view.members).to.be.empty;
        });

        it('Atomically rejoin the group with a member update', function () {
            const group2 = addTestGroup(services.model, {
                creator: contact,
                members: [],
                createdAt: new Date(),
            });

            expect(group2.get().view.userState).to.eq(GroupUserState.MEMBER);
            expect(group2.get().view.members).to.be.empty;

            const thirdUser = makeTestUser('USER0002');
            const thirdContact = addTestUserAsContact(services.model, thirdUser);

            group2.get().controller.kicked.fromSync(new Date());

            expect(group2.get().view.userState).to.eq(GroupUserState.KICKED);

            const {added} = group2
                .get()
                .controller.setMembers.fromSync([thirdContact], new Date(), GroupUserState.MEMBER);

            expect(group2.get().view.userState).to.eq(GroupUserState.MEMBER);

            expect(
                [...group2.get().view.members].map((member) => member.get().view.identity),
            ).to.have.members(['USER0002']);

            expect(added).to.eq(2);
        });
    });
}
