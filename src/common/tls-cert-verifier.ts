import {createHash, X509Certificate} from 'crypto';
import {type Request} from 'electron';

import {type Logger} from '~/common/logging';
import {type Length, type Split} from '~/common/types';

const VERIFICATION_RESULT = {
    /** Indicates success and disables Certificate Transparency verification. */
    VALID: 0,
    /** Indicates failure. */
    INVALID: -2,
    /** Uses the verification result from chromium. */
    INTERNAL_ERROR: -3,
} as const;

type VerificationResult = (typeof VERIFICATION_RESULT)[keyof typeof VERIFICATION_RESULT];
type WildcardDomain<Domain extends string> = Length<Split<Domain, '*'>> extends 1 | 2
    ? Domain
    : never;
type CertificateVerifier = (
    request: Request,
    callback: (verificationResult: VerificationResult) => void,
) => void;

export interface DomainCertificatePin<Domain extends string> {
    /** The domain the certificates belong to (e.g. `*.example.com`). */
    readonly domain: WildcardDomain<Domain>;
    /**
     * The fingerprints (SHA-256-hashed and Base64-encoded public keys) of the certificates that are
     * whitelisted for the specified `domain`.
     */
    readonly fingerprints: string[];
}

/**
 * Creates a `CertificateVerifier` function that only accepts certificates which match the
 * fingerprints specified in the `whitelist`.
 *
 * @param whitelist The list of pinned fingerprints (SHA-256-hashed and Base64-encoded public keys).
 * @param log A logger instance.
 * @returns A custom `CertificateVerifier` function that can be used with electron's
 * `setCertificateVerifyProc`.
 */
export function createTlsCertificateVerifier<Domain extends string>(
    whitelist: DomainCertificatePin<Domain>[],
    log: Logger,
): CertificateVerifier {
    return (request: Request, callback: (verificationResult: VerificationResult) => void) => {
        let verified = false;
        for (const pin of whitelist) {
            // Skip if the hostname of the request doesn't match the specified domain.
            const domainRegex = new RegExp(`^${pin.domain.replace('*.', '.*\\.?')}$`, 'u');
            if (!domainRegex.test(request.hostname)) {
                continue;
            }

            // Extract the public key from (PEM) certificate.
            const publicKey = getPublickKey(request.certificate.data);
            if (publicKey === undefined) {
                continue;
            }

            // Create a SHA-256 hash of the public key and encode in Base64.
            const fingerprint = createHash('sha256')
                .update(Buffer.from(publicKey, 'base64'))
                .digest('base64');
            // Skip if fingerprint is not whitelisted.
            if (!pin.fingerprints.includes(fingerprint)) {
                continue;
            }

            // Accept only if the whitelisted certificate is also trusted by Chromium.
            verified = request.isIssuedByKnownRoot && request.verificationResult === 'net::OK';
            if (verified) {
                break;
            }
        }

        if (verified) {
            // If certificate is accepted, return `INTERNAL_ERROR` to yield back to the regular
            // verification process in Chromium. This might seem counterinuitive, but this way we
            // don't skip any other verification processes that might be important.
            callback(-3);
        } else {
            log.error(
                `TLS certificate of host ${request.hostname} couldn't be verified and was rejected`,
                request.certificate,
            );
            // Block Chromium from accepting the certificate.
            callback(-2);
        }
    };
}

function getPublickKey(pem: string): string | undefined {
    const x509 = new X509Certificate(pem);
    const publicKey = x509.publicKey.export({
        type: 'spki',
        format: 'pem',
    });

    if (publicKey instanceof Buffer) {
        return undefined;
    }

    // Only extract the key itself and remove any spacing.
    return (
        // prettier-ignore
        publicKey
            .match(/-----BEGIN PUBLIC KEY-----(?<key>.*)-----END PUBLIC KEY-----/su)
            ?.groups
            ?.key
    );
}
