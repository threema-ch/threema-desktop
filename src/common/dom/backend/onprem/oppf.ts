import * as v from '@badrap/valita';

import {ensurePublicKey} from '~/common/crypto';
import {ensureU16, ensureU53} from '~/common/types';
import {base64ToU8a} from '~/common/utils/base64';

export const OPPF_VALIDATION_SCHEMA = v
    .object({
        version: v.string(),
        signatureKey: v.string().map((pk) => base64ToU8a(pk)),
        refresh: v.number(),
        license: v
            .object({
                id: v.string(),
                expires: v.string().map((s) => new Date(s).getMilliseconds()),
                count: v.number().map(ensureU53),
            })
            .rest(v.unknown()),
        chat: v
            .object({
                hostname: v.string(),
                ports: v.array(v.number().map(ensureU16)),
                publicKey: v.string().map((pk) => ensurePublicKey(base64ToU8a(pk))),
            })
            .rest(v.unknown()),

        directory: v
            .object({
                url: v.string(),
            })
            .rest(v.unknown()),

        blob: v
            .object({
                uploadUrl: v.string(),
                downloadUrl: v.string(),
                doneUrl: v.string(),
            })
            .rest(v.unknown()),

        work: v
            .object({
                url: v.string(),
            })
            .rest(v.unknown()),
        avatar: v
            .object({
                url: v.string(),
            })
            .rest(v.unknown()),
        safe: v
            .object({
                url: v.string(),
            })
            .rest(v.unknown()),
        web: v
            .object({
                url: v.string(),
                overrideSaltyRtcHost: v.string().optional(),
                overrideSaltyRtcPort: v.number().map(ensureU16).optional(),
            })
            .rest(v.unknown()),
        mediator: v
            .object({
                url: v.string(),
                blob: v
                    .object({
                        uploadUrl: v.string(),
                        downloadUrl: v.string(),
                        doneUrl: v.string(),
                    })
                    .rest(v.unknown()),
            })
            .rest(v.unknown()),
        rendezvous: v
            .object({
                url: v.string(),
            })
            .rest(v.unknown()),
        updates: v
            .object({
                desktop: v
                    .object({
                        check: v.string(),
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

export type Type = v.Infer<typeof OPPF_VALIDATION_SCHEMA>;
