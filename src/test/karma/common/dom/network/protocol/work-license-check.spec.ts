import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import type {ThreemaWorkCredentials} from '~/common/device';
import {
    WorkLicenseCheckError,
    workLicenseCheck,
} from '~/common/dom/network/protocol/work-license-check';
import type {SystemInfo} from '~/common/electron-ipc';
import {NOOP_LOGGER} from '~/common/logging';
import type {u53} from '~/common/types';
import {assert} from '~/common/utils/assert';
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
    describe('work license check', function () {
        this.beforeEach(function () {
            sinon.restore();
        });

        // Test data
        const credentials: ThreemaWorkCredentials = {username: 'testuser', password: 'testpass'};
        const systemInfo: SystemInfo = {os: 'other', arch: 'pentium386', locale: 'de_CH.utf8'};

        it('valid license', async function () {
            mockFetchResponse('POST', 200, {success: true} as const);

            const result = await workLicenseCheck(
                TEST_CONFIG.WORK_API_SERVER_URL,
                credentials,
                systemInfo,
                NOOP_LOGGER,
            );
            expect(result.valid).to.be.true;
        });

        it('invalid license', async function () {
            mockFetchResponse('POST', 200, {success: false, error: 'Expired license'} as const);

            const result = await workLicenseCheck(
                TEST_CONFIG.WORK_API_SERVER_URL,
                credentials,
                systemInfo,
                NOOP_LOGGER,
            );
            expect(result.valid).to.be.false;
            assert(!result.valid);
            expect(result.message).to.equal('Expired license');
        });

        it('invalid status code', async function () {
            mockFetchResponse('POST', 500, {someOtherError: 'Internal server error'} as const);

            let errorThrown;
            try {
                await workLicenseCheck(
                    TEST_CONFIG.WORK_API_SERVER_URL,
                    credentials,
                    systemInfo,
                    NOOP_LOGGER,
                );
                errorThrown = false;
            } catch (error) {
                errorThrown = true;
                expect(error).to.be.instanceOf(WorkLicenseCheckError);
                assert(error instanceof WorkLicenseCheckError);
                expect(error.type).to.equal('status-code');
                expect(error.message).to.equal(
                    'Request to license validation endpoint returned status code 500',
                );
            }
            expect(errorThrown).to.be.true;
        });

        it('invalid response body', async function () {
            mockFetchResponse('POST', 200, {someOtherField: 42} as const);

            let errorThrown;
            try {
                await workLicenseCheck(
                    TEST_CONFIG.WORK_API_SERVER_URL,
                    credentials,
                    systemInfo,
                    NOOP_LOGGER,
                );
                errorThrown = false;
            } catch (error) {
                errorThrown = true;
                expect(error).to.be.instanceOf(WorkLicenseCheckError);
                assert(error instanceof WorkLicenseCheckError);
                expect(error.type).to.equal('invalid-response-body');
                expect(error.message).to.equal(
                    'Could not validate response body: ValitaError: missing_value at .success (missing value)',
                );
            }
            expect(errorThrown).to.be.true;
        });
    });
}

run();
