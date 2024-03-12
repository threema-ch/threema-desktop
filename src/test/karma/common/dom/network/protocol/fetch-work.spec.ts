import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {FetchWorkBackend} from '~/common/dom/network/protocol/fetch-work';
import {WorkError} from '~/common/network/protocol/work';
import type {u53} from '~/common/types';
import {assert} from '~/common/utils/assert';
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

export function run(): void {
    describe('FetchWorkBackend', function () {
        const backend = new FetchWorkBackend(
            {
                config: TEST_CONFIG,
                logging: new NoopLoggerFactory(),
                systemInfo: {os: 'other', arch: 'pentium386', locale: 'de_CH.utf8'},
            },
            {username: 'testuser', password: 'testpass'},
        );

        this.beforeEach(function () {
            sinon.restore();
        });

        it('valid license', async function () {
            mockFetchResponse('POST', 200, {success: true} as const);

            const result = await backend.checkLicense();
            expect(result.valid).to.be.true;
        });

        it('invalid license', async function () {
            mockFetchResponse('POST', 200, {success: false, error: 'Expired license'} as const);

            const result = await backend.checkLicense();
            expect(result.valid).to.be.false;
            assert(!result.valid);
            expect(result.message).to.equal('Expired license');
        });

        it('invalid status code', async function () {
            mockFetchResponse('POST', 500, {someOtherError: 'Internal server error'} as const);

            let errorThrown;
            try {
                await backend.checkLicense();
                errorThrown = false;
            } catch (error) {
                errorThrown = true;
                expect(error).to.be.instanceOf(WorkError);
                assert(error instanceof WorkError);
                expect(error.type).to.equal('invalid-response');
                expect(error.message).to.equal(
                    'Work license validation endpoint request returned status 500',
                );
            }
            expect(errorThrown).to.be.true;
        });

        it('invalid response', async function () {
            mockFetchResponse('POST', 200, {someOtherField: 42} as const);

            let errorThrown;
            try {
                await backend.checkLicense();
                errorThrown = false;
            } catch (error) {
                errorThrown = true;
                expect(error).to.be.instanceOf(WorkError);
                assert(error instanceof WorkError);
                expect(error.type).to.equal('invalid-response');
                expect(error.message).to.equal(
                    'Work license validation response against schema failed',
                );
            }
            expect(errorThrown).to.be.true;
        });
    });
}

run();
