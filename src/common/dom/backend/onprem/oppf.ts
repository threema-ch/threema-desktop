import * as v from '@badrap/valita';

import type {ServicesForBackend} from '~/common/backend';
import {
    ensurePublicKey,
    ensureEd25519PublicKey,
    ensureEd25519Signature,
    type Ed25519PublicKey,
} from '~/common/crypto';
import {ensureBaseUrl, validateUrl} from '~/common/network/types';
import {ensureU53, type ReadonlyUint8Array} from '~/common/types';
import {entriesReverse} from '~/common/utils/array';
import {base64ToU8a, u8aToBase64} from '~/common/utils/base64';
import {byteEquals} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';

const OPPF_SIGNATURE_KEY_SCHEMA = v.string().map(base64ToU8a).map(ensureEd25519PublicKey);

const OPPF_FILE_ONLY_SIGNATURE_KEY_SCHEMA = v
    .object({
        signatureKey: OPPF_SIGNATURE_KEY_SCHEMA,
    })
    .rest(v.unknown());

// Note: Since many of the URLs contain variables that we need to replace at runtime, we only
// validate those but not transform them to `URL` or `BaseUrl` as transforming would escape the
// curly brackets used for the variables.
export const OPPF_FILE_SCHEMA = v
    .object({
        version: v.string(),
        signatureKey: OPPF_SIGNATURE_KEY_SCHEMA,
        refresh: v.number().map(ensureU53),
        license: v
            .object({
                id: v.string(),
                expires: v.string().map((s) => new Date(s)),
                count: v.number().map(ensureU53),
            })
            .rest(v.unknown()),
        chat: v
            .object({
                publicKey: v.string().map((pk) => ensurePublicKey(base64ToU8a(pk))),
            })
            .rest(v.unknown()),
        directory: v
            .object({
                url: v.string().map((url) => ensureBaseUrl(url, 'https:')),
            })
            .rest(v.unknown()),
        work: v
            .object({
                url: v.string().map((url) => {
                    ensureBaseUrl(url, 'https:');
                    return url;
                }),
            })
            .rest(v.unknown()),
        avatar: v
            .object({
                url: v.string().map((url) => {
                    ensureBaseUrl(url, 'https:');
                    return url;
                }),
            })
            .rest(v.unknown()),
        safe: v
            .object({
                url: v.string().map((url) => {
                    ensureBaseUrl(url, 'https:');
                    return url;
                }),
            })
            .rest(v.unknown()),
        mediator: v
            .object({
                url: v.string().map((url) => {
                    ensureBaseUrl(url, 'wss:');
                    return url;
                }),
                blob: v
                    .object({
                        uploadUrl: v.string().map((url) =>
                            validateUrl(url, {
                                protocol: 'https:',
                                search: 'deny',
                                hash: 'deny',
                            }),
                        ),
                        downloadUrl: v.string().map((url) => {
                            validateUrl(url, {
                                protocol: 'https:',
                                search: 'deny',
                                hash: 'deny',
                            });
                            return url;
                        }),
                        doneUrl: v.string().map((url) => {
                            validateUrl(url, {
                                protocol: 'https:',
                                search: 'deny',
                                hash: 'deny',
                            });
                            return url;
                        }),
                    })
                    .rest(v.unknown()),
            })
            .rest(v.unknown()),
        rendezvous: v
            .object({
                url: v.string().map((url) => {
                    ensureBaseUrl(url, 'wss:');
                    return url;
                }),
            })
            .rest(v.unknown()),
        updates: v
            .object({
                desktop: v
                    .object({
                        check: v.string().map((url) => {
                            ensureBaseUrl(url, 'https:');
                            return url;
                        }),
                    })
                    .rest(v.unknown()),
            })
            .rest(v.unknown()),
        publicKeyPinning: v
            .array(
                v
                    .object({
                        domain: v.string(),
                        spkis: v.array(
                            v
                                .object({
                                    algorithm: v.literal('sha256'),
                                    value: v.string(),
                                })
                                .rest(v.unknown()),
                        ),
                    })
                    .rest(v.unknown()),
            )
            .optional(),
    })
    .rest(v.unknown());

export type OppfFile = v.Infer<typeof OPPF_FILE_SCHEMA>;

// An Ed25519 signature has 64 bytes which Base64 encoded result in 88 bytes.
const ED25519_BASE64_ENCODED_SIGNATURE_LENGTH = 88;

/**
 * Decode and verify the UTF-8 encoded OPPF JSON body against the Base64 encoded Ed25519 signature
 * and the trusted public keys.
 *
 * @throws {@link Error} in case the provided data does not contain a valid OPPF file.
 * @throws {@link CryptoError} in case the signature does not match.
 * @returns the parsed OPPF JSON body and the OPPF string data.
 */
export function verifyOppfFile(
    services: Pick<ServicesForBackend, 'crypto'>,
    trustedKeys: readonly Ed25519PublicKey[],
    data: ReadonlyUint8Array,
): {readonly parsed: OppfFile; readonly string: string} {
    // Calculate the offset where the OPPF body ends. Disregard any excess new-line (ASCII 0x0a)
    // characters between the content and the signature.
    let offset = ED25519_BASE64_ENCODED_SIGNATURE_LENGTH;
    for (const [, byte] of entriesReverse(data.subarray(0, -offset))) {
        if (byte !== 0x0a) {
            break;
        }
        ++offset;
    }

    // Extract the raw OPPF file body and the signature
    const bytes = {
        body: data.subarray(0, -offset),
        signature: data.subarray(-ED25519_BASE64_ENCODED_SIGNATURE_LENGTH),
    };

    // Decode the signature
    const signature = ensureEd25519Signature(base64ToU8a(UTF8.decode(bytes.signature)));

    // Decode the OPPF file but only validate the signature key for now
    const string = UTF8.decode(bytes.body);
    const decoded = JSON.parse(string) as unknown;
    const {signatureKey} = OPPF_FILE_ONLY_SIGNATURE_KEY_SCHEMA.parse(decoded);

    // Ensure the signature key matches against one of the hard-coded public keys we accept
    if (!trustedKeys.some((trusted) => byteEquals(signatureKey, trusted))) {
        throw new Error(
            `OPPF file is signed with an unknown signature key: ${u8aToBase64(signatureKey)} (Base64)`,
        );
    }

    // Validate the signature against the file body now
    services.crypto.verifyEd25519Signature(signatureKey, bytes.body, signature);

    // Now validate the rest of the file
    const parsed = OPPF_FILE_SCHEMA.parse(decoded);

    // Check whether the OPPF file expired
    if (new Date() > parsed.license.expires) {
        throw new Error(`OPPF file expired at ${parsed.license.expires}`);
    }

    // Now validate the rest of the file
    return {parsed, string};
}
