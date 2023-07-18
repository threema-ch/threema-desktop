import * as v from '@badrap/valita';

import {type BlobId, ensureBlobId} from '~/common/network/protocol/blob';
import * as csp from '~/common/network/structbuf/csp';
import {validator} from '~/common/network/structbuf/validate/utils';
import {type RawBlobKey, wrapRawBlobKey} from '~/common/network/types/keys';
import {ensureU53, type f64, type u53} from '~/common/types';
import {hexToBytes} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';
import {instanceOf} from '~/common/utils/valita-helpers';

const RAW_IMAGE_METADATA_SCHEMA = v
    .object({
        // The width as an integer in px
        w: v.number().map(ensureU53).optional(),
        // The height as an integer in px
        h: v.number().map(ensureU53).optional(),
        // Whether this is an animated picture (e.g. an AnimGIF)
        a: v.boolean().default(false),
    })
    .rest(v.unknown());

const RAW_AUDIO_METADATA_SCHEMA = v
    .object({
        // The duration as float in seconds
        d: v
            .number()
            .map((val) => val as f64)
            .optional(),
    })
    .rest(v.unknown());

const RAW_VIDEO_METADATA_SCHEMA = v
    .object({
        // The width as an integer in px
        w: v.number().map(ensureU53).optional(),
        // The height as an integer in px
        h: v.number().map(ensureU53).optional(),
        // The duration as float in seconds
        d: v
            .number()
            .map((val) => val as f64)
            .optional(),
    })
    .rest(v.unknown());

/**
 * The raw file JSON schema as defined by the protocol.
 */
export const RAW_FILE_JSON_SCHEMA = v
    .object({
        // Rendering type
        j: v.number().map(ensureU53).default(0),
        // Encryption key: Random symmetric key used to encrypt the blobs (file and thumbnail data)
        k: v.string().map(hexToBytes).map(wrapRawBlobKey),
        // File blob ID: Blob ID in lowercase hex string representation to obtain the file data
        b: v.string().map(hexToBytes).map(ensureBlobId),
        // File media type
        m: v.string(),
        // Optional file name
        n: v.string().optional(),
        // File size in bytes
        s: v.number().map(ensureU53),
        // Optional thumbnail blob ID: Blob containing the thumbnail file data
        t: v.string().map(hexToBytes).map(ensureBlobId).optional(),
        // Optional thumbnail media type
        p: v.string().default('image/jpeg'),
        // Optional caption
        d: v.string().optional(),
        // Optional correlation ID: 32 byte ASCII string to collocate multiple media files
        c: v.string().optional(),
        // Optional metadata
        x: v
            .union(
                v.object({}),
                RAW_IMAGE_METADATA_SCHEMA,
                RAW_AUDIO_METADATA_SCHEMA,
                RAW_VIDEO_METADATA_SCHEMA,
            )
            .map((val) => (Object.keys(val).length === 0 ? undefined : val))
            .optional(),
    })
    .rest(v.unknown());

export type FileRenderingType = 'file' | 'media' | 'sticker';

/**
 * A validated and structured representation of the raw file JSON.
 */
export interface FileJson {
    readonly renderingType: FileRenderingType;
    readonly file: {
        readonly blobId: BlobId;
        readonly mediaType: string;
    };
    readonly thumbnail?: {
        readonly blobId: BlobId;
        readonly mediaType: string;
    };
    readonly encryptionKey: RawBlobKey;
    readonly fileName?: string;
    readonly fileSize: u53;
    readonly caption?: string;
    readonly correlationId?: string;
    // TODO(DESK-935): Metadata
}

/**
 * Take a raw file JSON (with single-letter keys) and convert it into a more structured
 * {@link FileJson} object.
 */
function processRawFileJson(json: v.Infer<typeof RAW_FILE_JSON_SCHEMA>): FileJson {
    let renderingType: FileRenderingType;
    switch (json.j) {
        case 1:
            renderingType = 'media';
            break;
        case 2:
            renderingType = 'sticker';
            break;
        case 0:
        default:
            renderingType = 'file';
    }
    return {
        renderingType,
        file: {
            blobId: json.b,
            mediaType: json.m,
        },
        thumbnail:
            json.t === undefined
                ? undefined
                : {
                      blobId: json.t,
                      mediaType: json.p,
                  },
        encryptionKey: json.k,
        fileName: json.n,
        fileSize: json.s,
        caption: json.d,
        correlationId: json.c,
    };
}

/** Validates {@link csp.e2e.File} */
export const SCHEMA = v
    .object(
        validator(csp.e2e.File.prototype, {
            file: instanceOf(Uint8Array)
                .map((value) => UTF8.decode(value))
                .map(JSON.parse)
                .map((json) => RAW_FILE_JSON_SCHEMA.parse(json))
                .map(processRawFileJson),
        }),
    )
    .rest(v.unknown());

/** Validated Scheme for {@link csp.e2e.File} */
export type Type = v.Infer<typeof SCHEMA>;
