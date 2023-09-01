import * as v from '@badrap/valita';

import {ensurePublicKey} from '~/common/crypto';
import type {ThreemaWorkCredentials} from '~/common/device';
import type {Logger} from '~/common/logging';
import {ensureIdentityString} from '~/common/network/types';
import {ensureU53} from '~/common/types';
import {base64ToU8a} from '~/common/utils/base64';
import {nullOptional} from '~/common/utils/valita-helpers';

export const WORK_DATA_SYNC_RESPONSE_SCHEMA = v
    .object({
        checkInterval: v.number().map(ensureU53),
        contacts: v.array(
            v
                .object({
                    id: v.string().map(ensureIdentityString),
                    first: v
                        .string()
                        .map((value) => (value === '' ? undefined : value))
                        .optional(),
                    last: v
                        .string()
                        .map((value) => (value === '' ? undefined : value))
                        .optional(),
                    pk: v.string().map(base64ToU8a).map(ensurePublicKey),
                })
                .rest(v.unknown()),
        ),
        directory: v.union(
            v
                .object({
                    enabled: v.literal(false),
                })
                .rest(v.unknown()),
            v
                .object({
                    enabled: v.literal(true),
                    cat: v.record(v.string()).optional(),
                })
                .rest(v.unknown()),
        ),
        logo: v
            .object({
                light: nullOptional(v.string()),
                dark: nullOptional(v.string()),
            })
            .rest(v.unknown()),
        mdm: v
            .object({
                override: v.boolean(),
                params: v.record(v.union(v.string(), v.boolean())),
            })
            .rest(v.unknown()),
        org: v
            .object({
                name: nullOptional(v.string()),
            })
            .rest(v.unknown()),
        support: nullOptional(v.string()),
    })
    .rest(v.unknown());

/**
 * Do a work API data sync
 *
 * @param credentials Work credentials, used for authentication
 * @param log A logger instance
 * @returns The validated response data
 * @throws TODO(DESK-1211)
 */
export async function workDataSync(
    credentials: ThreemaWorkCredentials,
    log: Logger,
): Promise<void> {
    const base = import.meta.env.WORK_API_SERVER_URL;
    const url = `${new URL('/fetch2', base)}`;

    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                contacts: [], // TODO(DESK-1211)
                username: credentials.username,
                password: credentials.password,
            }),
        });
    } catch (error) {
        log.error(`Work subscription sync failed: ${error}`);
        // TODO(DESK-1211) throw
    }

    log.debug('Response: ', response);

    // TODO(DESK-1211): Validate status code

    /*
    TODO(DESK-1211): Finish implementation, validate with WORK_DATA_SYNC_RESPONSE_SCHEMA
    let unvalidatedBody;
    try {
        unvalidatedBody = await response.json();
    } catch (error) {
        log.error(`Work subscription sync failed: Could not extract JSON body: ${error}`);
        return; // TODO throw
    }
    log.info('XXX body', unvalidatedBody);
    */
}
