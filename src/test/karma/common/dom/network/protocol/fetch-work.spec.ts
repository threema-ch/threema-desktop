import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {ensurePublicKey} from '~/common/crypto';
import {FetchWorkBackend} from '~/common/dom/network/protocol/fetch-work';
import {WorkError, type WorkErrorType} from '~/common/network/protocol/work';
import {ensureIdentityString} from '~/common/network/types';
import type {u53} from '~/common/types';
import {assert, assertError} from '~/common/utils/assert';
import {base64ToU8a} from '~/common/utils/base64';
import {NoopLoggerFactory} from '~/test/common/logging';
import {makeResponse} from '~/test/karma/common/dom/dom-test-helpers';
import {TEST_CONFIG} from '~/test/karma/common/dom/network/protocol/config-mock';

const {expect} = chai.use(sinonChai);

/**
 * Mock a `fetch()`-response.
 *
 * @param status The mocked response status code.
 * @param responseBody The response body.
 */
function mockFetchResponse(
    expectedMethod: 'POST',
    status: u53,
    responseBody: Record<string, unknown>,
): void {
    const fakeFetch = sinon.fake(
        // eslint-disable-next-line @typescript-eslint/require-await
        async (input: RequestInfo | URL, init?: RequestInit | undefined) => {
            if (init?.method === expectedMethod) {
                return makeResponse(status, responseBody);
            }
            throw new Error(`Unexpected method: ${init?.method}`);
        },
    );
    sinon.replace(self, 'fetch', fakeFetch);
}

async function assertWorkError(
    promise: Promise<unknown>,
    type: WorkErrorType,
    message: string,
): Promise<void> {
    let errorThrown;
    try {
        await promise;
        errorThrown = false;
    } catch (error) {
        errorThrown = true;
        expect(error).to.be.instanceOf(WorkError);
        assertError(error, WorkError);
        expect(error.type).to.equal(type);
        expect(error.message).to.equal(message);
    }
    if (!errorThrown) {
        expect.fail('Expected a WorkError, but no exception was thrown');
    }
}

export function run(): void {
    describe('FetchWorkBackend', function () {
        const credentials = {username: 'testuser', password: 'testpass'};
        const backend = new FetchWorkBackend({
            config: TEST_CONFIG,
            logging: new NoopLoggerFactory(),
            systemInfo: {os: 'other', arch: 'pentium386', locale: 'de_CH.utf8'},
        });

        this.beforeEach(function () {
            sinon.restore();
        });

        describe('checkLicense', function () {
            it('valid license', async function () {
                mockFetchResponse('POST', 200, {success: true} as const);

                const result = await backend.checkLicense(credentials);
                expect(result.valid).to.be.true;
            });

            it('invalid license', async function () {
                mockFetchResponse('POST', 200, {success: false, error: 'Expired license'} as const);

                const result = await backend.checkLicense(credentials);
                expect(result.valid).to.be.false;
                assert(!result.valid);
                expect(result.message).to.equal('Expired license');
            });

            it('invalid status code', async function () {
                mockFetchResponse('POST', 500, {someOtherError: 'Internal server error'} as const);

                await assertWorkError(
                    backend.checkLicense(credentials),
                    'invalid-response',
                    'Work license validation endpoint request returned status 500',
                );
            });

            it('invalid response', async function () {
                mockFetchResponse('POST', 200, {someOtherField: 42} as const);

                await assertWorkError(
                    backend.checkLicense(credentials),
                    'invalid-response',
                    'Work license validation response against schema failed',
                );
            });
        });

        describe('contacts', function () {
            it('successful fetch', async function () {
                const responseBody = {
                    contacts: [
                        {
                            id: 'AAAAAAAA',
                            pk: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=',
                            first: 'Aria',
                            last: 'Reverb',
                        },
                        {
                            id: 'BBBBBBBB',
                            pk: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb=',
                        },
                    ],
                };

                mockFetchResponse('POST', 200, responseBody);

                const result = await backend.contacts(credentials, [
                    ensureIdentityString('AAAAAAAA'),
                    ensureIdentityString('BBBBBBBB'),
                ]);

                expect(result.contacts.length).to.equal(2);
                expect(result.contacts).to.have.deep.members(
                    responseBody.contacts.map((contact) => ({
                        ...contact,
                        pk: ensurePublicKey(base64ToU8a(contact.pk)),
                    })),
                );
            });

            it('invalid response', async function () {
                const invalidContacts = {
                    contacts: [
                        {
                            id: 'ECHOECHO',
                            // Missing 'pk', but mandatory
                            first: 'Aria',
                            last: 'Reverb',
                        },
                    ],
                };

                mockFetchResponse('POST', 200, invalidContacts);

                await assertWorkError(
                    backend.contacts(credentials, [ensureIdentityString('ECHOECHO')]),
                    'invalid-response',
                    'Work contacts endpoint response against schema failed',
                );
            });

            it('invalid request', async function () {
                mockFetchResponse('POST', 400, {});

                await assertWorkError(
                    backend.contacts(credentials, [ensureIdentityString('ECHOECHO')]),
                    'invalid-response',
                    'Work contacts endpoint request returned status 400',
                );
            });
        });
    });
}

run();
