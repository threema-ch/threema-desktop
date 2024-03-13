import {createHash, X509Certificate} from 'node:crypto';

import type {Request} from 'electron';

import type {Logger} from '~/common/logging';
import type {DomainCertificatePin} from '~/common/types';
import {byteEquals} from '~/common/utils/byte';

/**
 * The verification results as returned by electron.
 *
 * See docs at https://www.electronjs.org/docs/latest/api/session#sessetcertificateverifyprocproc
 * for more information.
 */
const VERIFICATION_RESULT = {
    /** Indicates success and disables Certificate Transparency verification. */
    VALID: 0,
    /** Indicates failure. */
    INVALID: -2,
    /** Uses the verification result from chromium. */
    ABORTED: -3,
} as const;

/**
 * The verifier function that can be passed to {@link Electron.session.setCertificateVerifyProc}.
 */
type CertificateVerifier = NonNullable<Parameters<Electron.Session['setCertificateVerifyProc']>[0]>;

/**
 * Creates a `CertificateVerifier` function that only accepts certificates which match the
 * fingerprints specified in the `certificatePins`.
 *
 * In the case of an OnPrem build, the certificates pin must be passed from the main process after processing the .oppf file.
 * This is done using the {@link electronIpcCommand.UPDATE_PUBLIC_KEY_PINS} signal.
 * (TODO(DESK-1298): This doesn't yet work properly due to caching.)
 *
 * Ther returned function can be passed to {@link Electron.session.setCertificateVerifyProc}.
 *
 * @param certificatePins The list of pinned SPKI fingerprints (SHA-256-hashed and Base64-encoded
 *   public keys). Requests that are not pinned, will not be allowed.
 * @param log A logger instance.
 */
export function createTlsCertificateVerifier(
    certificatePins: DomainCertificatePin[] | undefined,
    log: Logger,
): CertificateVerifier {
    // Sanity-checking of certificate pins
    if (certificatePins !== undefined) {
        for (const pin of certificatePins) {
            for (const fingerprint of pin.spkis) {
                const fingerprintBytes = fingerprint.value;
                if (fingerprintBytes.byteLength !== 32) {
                    throw new Error(
                        `Invalid certificate pinning config for "${pin.domain}": Fingerprint "${fingerprint.value}" is not 32 bytes`,
                    );
                }
            }
        }
    }

    // eslint-disable-next-line no-restricted-syntax
    return (request: Request, callback: (verificationResult: number) => void) => {
        function valid(): void {
            log.debug(`Successfully validated certificate pin for ${request.hostname}`);

            // If certificate is accepted, return `ABORTED` to yield back to the regular
            // verification process in Chromium. (In other words, we don't reject the certificate.
            // If it is generally valid, it will be accepted by Chromium.)
            callback(VERIFICATION_RESULT.ABORTED);
        }

        function invalid(reason: string): void {
            log.error(
                `TLS certificate of host ${request.hostname} couldn't be verified and was rejected. Reason: ${reason}`,
            );

            // Block Chromium from accepting the certificate.
            callback(VERIFICATION_RESULT.INVALID);
        }

        // Reject if the certificate is not trusted by Chromium
        if (!request.isIssuedByKnownRoot) {
            return invalid('Not issued by known root');
        }
        if (!['OK', 'net::OK'].includes(request.verificationResult)) {
            return invalid(`Verification result is ${request.verificationResult}`);
        }

        // This is a special case for the connection before the .oppf file is parsed.
        if (import.meta.env.BUILD_ENVIRONMENT === 'onprem' && certificatePins === undefined) {
            return valid();
        }

        if (certificatePins === undefined) {
            return invalid(
                `No certificate pins were specified. This is illegal in non-OnPrem builds`,
            );
        }

        for (const pin of certificatePins) {
            // Skip if the hostname of the request doesn't match the specified domain.
            const domainRegex = new RegExp(
                `^${pin.domain.replaceAll('.', '\\.').replace('*', '[^\\.]*')}$`,
                'u',
            );
            if (!domainRegex.test(request.hostname)) {
                continue;
            }

            // Calculate the SPKI fingerprint for this certificate
            // Note: Here we only allow sha256 but this could change in the future
            const fingerprint = spkiFingerprint(request.certificate.data, 'sha256');

            // Validate fingerprint against configured pins
            if (pin.spkis.some((spki) => byteEquals(fingerprint, spki.value))) {
                return valid();
            }
            return invalid(
                `Fingerprint ${fingerprint} not found in certificate pins for domain ${pin.domain}`,
            );
        }

        return invalid('No matching pin config found');
    };
}

/**
 * Extract the DER-encoded SPKI public key from the X509 certificate.
 */
function extractPublicKey(certificatePem: string): Uint8Array {
    const x509 = new X509Certificate(certificatePem);
    return x509.publicKey.export({
        type: 'spki',
        format: 'der',
    });
}

/**
 * Calculate the SPKI public key fingerprint (Base64-encoded) for the specified X509 certificate.
 *
 * See https://datatracker.ietf.org/doc/html/rfc7469#section-2.4
 */
function spkiFingerprint(certificatePem: string, algorithm: 'sha256'): Uint8Array {
    const publicKey = extractPublicKey(certificatePem);
    return createHash(algorithm).update(publicKey).digest();
}
