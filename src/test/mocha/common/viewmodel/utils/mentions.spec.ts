import {expect} from 'chai';

import {MessageDirection, ReceiverType} from '~/common/enum';
import type {Contact} from '~/common/model';
import type {ModelStore} from '~/common/model/utils/model-store';
import {randomMessageId} from '~/common/network/protocol/utils';
import {ensureIdentityString, ensureNickname} from '~/common/network/types';
import {derive} from '~/common/utils/store/derived-store';
import {type AnyMention, getMentions} from '~/common/viewmodel/utils/mentions';
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
                recipient: ModelStore<Contact>,
                expectedMentions: AnyMention[],
            ): Promise<void> {
                const messageStore = await recipient
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
                const mentions = derive(
                    [messageStore],
                    ([{currentValue: messageModel}], getAndSubscribe) =>
                        getMentions(services, messageModel, getAndSubscribe),
                );
                expect(mentions.get()).to.deep.equal(expectedMentions);
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
                            type: 'contact',
                            identity: ensureIdentityString('EUGEN000'),
                            name: 'Eugen Pfister',
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
                            type: 'contact',
                            identity: ensureIdentityString('EUGEN000'),
                            name: 'Eugen Pfister',
                            lookup: {type: ReceiverType.CONTACT, uid: contactEugen.ctx},
                        },
                        {
                            type: 'contact',
                            identity: ensureIdentityString('WRIGLEY0'),
                            name: 'WRIGLEY0',
                            lookup: {type: ReceiverType.CONTACT, uid: contactWrigley.ctx},
                        },
                    ],
                );
            });

            it('mention everyone', async () => {
                const services = makeTestServices(me);
                const contactBästeli = addTestUserAsContact(services.model, userBästeli);
                await testMessageMentions(services, 'Mention to @[@@@@@@@@]', contactBästeli, [
                    {
                        type: 'everyone',
                        identity: '@@@@@@@@',
                    },
                ]);
            });
        });
    });
}
