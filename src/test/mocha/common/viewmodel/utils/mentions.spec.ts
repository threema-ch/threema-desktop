import {expect} from 'chai';

import {MessageDirection, ReceiverType} from '~/common/enum';
import type {Contact} from '~/common/model';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import {randomMessageId} from '~/common/network/protocol/utils';
import {ensureIdentityString, ensureNickname} from '~/common/network/types';
import {type Mention, getMentions} from '~/common/viewmodel/utils/mentions';
import {
    type TestUser,
    addTestUserAsContact,
    makeTestServices,
    makeTestUser,
    type TestServices,
} from '~/test/mocha/common/backend-mocks';

// NOTE: More mention tests are in `parse-text.spec.ts`!

export function run(): void {
    const me = ensureIdentityString('MEMEMEME');

    describe('mentions', function () {
        describe('getMentions', function () {
            const userEugen: TestUser = {
                ...makeTestUser('EUGEN000', ensureNickname('eugen')),
                firstName: 'Eugen',
                lastName: 'Pfister',
            };
            const userBästeli: TestUser = makeTestUser('BAESTELI', ensureNickname('bäschteli'));
            const userWrigley: TestUser = {
                ...makeTestUser('WRIGLEY0'),
                nickname: undefined,
            };

            async function testMessageMentions(
                services: TestServices,
                message: string,
                recipient: LocalModelStore<Contact>,
                expectedMentions: Mention[],
            ): Promise<void> {
                const msg = await recipient
                    .get()
                    .controller.conversation()
                    .get()
                    .controller.addMessage.fromLocal({
                        type: 'text',
                        direction: MessageDirection.OUTBOUND,
                        id: randomMessageId(services.crypto),
                        createdAt: new Date(),
                        text: message,
                    });
                const mentions = getMentions(msg.get(), services.model);
                expect(mentions).to.deep.equal(expectedMentions);
            }

            it('single contact mention', async () => {
                const services = makeTestServices(me);
                const contactEugen = addTestUserAsContact(services.model, userEugen);
                const contactBästeli = addTestUserAsContact(services.model, userBästeli);
                await testMessageMentions(
                    services,
                    'Hey Bäschteli, de @[EUGEN000] het wider e Seich gmacht!',
                    contactBästeli,
                    [
                        {
                            type: 'other',
                            identity: ensureIdentityString('EUGEN000'),
                            displayName: 'Eugen Pfister',
                            lookup: {type: ReceiverType.CONTACT, uid: contactEugen.ctx},
                        },
                    ],
                );
            });

            it('multiple contact mention, deduplicated', async () => {
                const services = makeTestServices(me);
                const contactEugen = addTestUserAsContact(services.model, userEugen);
                const contactBästeli = addTestUserAsContact(services.model, userBästeli);
                const contactWrigley = addTestUserAsContact(services.model, userWrigley);
                await testMessageMentions(
                    services,
                    'De @[EUGEN000] und de @[WRIGLEY0] hei wider e Seich gmacht! De @[EUGEN000] isch denn eifach abghoue.',
                    contactBästeli,
                    [
                        {
                            type: 'other',
                            identity: ensureIdentityString('EUGEN000'),
                            displayName: 'Eugen Pfister',
                            lookup: {type: ReceiverType.CONTACT, uid: contactEugen.ctx},
                        },
                        {
                            type: 'other',
                            identity: ensureIdentityString('WRIGLEY0'),
                            displayName: 'WRIGLEY0',
                            lookup: {type: ReceiverType.CONTACT, uid: contactWrigley.ctx},
                        },
                    ],
                );
            });

            it('all mention', async () => {
                const services = makeTestServices(me);
                const contactBästeli = addTestUserAsContact(services.model, userBästeli);
                await testMessageMentions(services, 'Mention to @[@@@@@@@@]', contactBästeli, [
                    {
                        type: 'all',
                        identity: '@@@@@@@@',
                    },
                ]);
            });
        });
    });
}
