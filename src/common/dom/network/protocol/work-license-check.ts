import * as v from '@badrap/valita';

import type {ThreemaWorkCredentials} from '~/common/device';
import {getBrowserInfo, makeCspClientInfo} from '~/common/dom/utils/browser';
import type {SystemInfo} from '~/common/electron-ipc';
import type {Logger} from '~/common/logging';

export type WorkLicenseCheckResult = {valid: true} | {valid: false; message: string};

/**
 * Error types while validating the Threema Work license.
 *
 * - request-failed: The HTTP request failed.
 * - status-code: The HTTP endpoint did not return a HTTP 200 response.
 * - invalid-response-body: The response body could not be parsed or validated.
 */
export type WorkLicenseCheckErrorType = 'request-failed' | 'status-code' | 'invalid-response-body';

/** An error occurred while validating the Threema Work license. */
export class WorkLicenseCheckError extends Error {
    public constructor(
        public readonly type: WorkLicenseCheckErrorType,
        message?: string,
    ) {
        super(message ?? `Threema Work license check failed: '${type}' (${message})`);
    }
}

export const WORK_LICENSE_CHECK_RESPONSE_SCHEMA = v
    .object({
        success: v.boolean(),
        error: v.string().optional(),
    })
    .rest(v.unknown());

/**
 * Do a work license check
 *
 * @param credentials Work credentials, used for authentication
 * @param log A logger instance
 * @returns The validated response data
 * @throws WorkLicenseCheckError
 */
export async function workLicenseCheck(
    credentials: ThreemaWorkCredentials,
    systemInfo: SystemInfo,
    log: Logger,
): Promise<WorkLicenseCheckResult> {
    const base = import.meta.env.DIRECTORY_SERVER_URL;
    const url = `${new URL('/check_license', base)}`;

    const browserInfo = getBrowserInfo(self.navigator.userAgent);
    const cspClientInfo = makeCspClientInfo(browserInfo);

    // Send request
    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                licenseUsername: credentials.username,
                licensePassword: credentials.password,
                version: cspClientInfo,
                arch: systemInfo.arch,
            }),
        });
    } catch (error) {
        throw new WorkLicenseCheckError(
            'request-failed',
            `Request to license validation endpoint failed: ${error}`,
        );
    }

    // Validate status code
    if (response.status !== 200) {
        const body = await response.text();
        log.warn(`Response status code is ${response.status}. Response body: ${body}`);
        throw new WorkLicenseCheckError(
            'status-code',
            `Request to license validation endpoint returned status code ${response.status}`,
        );
    }

    // Parse and validate response body
    let unvalidatedBody;
    try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        unvalidatedBody = await response.json();
    } catch (error) {
        throw new WorkLicenseCheckError(
            'invalid-response-body',
            'Could not parse response body as JSON',
        );
    }
    let validatedBody;
    try {
        validatedBody = WORK_LICENSE_CHECK_RESPONSE_SCHEMA.parse(unvalidatedBody);
    } catch (error) {
        throw new WorkLicenseCheckError(
            'invalid-response-body',
            `Could not validate response body: ${error}`,
        );
    }

    return validatedBody.success
        ? {valid: true}
        : {valid: false, message: validatedBody.error ?? 'Unknown reason'};
}
