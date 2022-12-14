import {type LinkingCode} from '~/app/components/bootstrap';
import {type SafeCredentials} from '~/common/dom/safe';
import {type CspDeviceId, type D2mDeviceId, type IdentityString} from '~/common/network/types';

/**
 * Determinate if an element or svelte component is loaded
 * @param element HtmlElement | SvelteComponent | ...
 * @returns boolean
 */
export function elementExists(element: unknown): boolean {
    return element !== undefined && element !== null;
}

export type ProcessStep =
    | 'welcome'
    | 'enterThreemaId'
    | 'enterLinkingCode'
    | 'enterNewPassword'
    | 'successLinked';

export interface BootstrapParams {
    readonly isIdentityValid: (identity: IdentityString) => Promise<boolean>;
    readonly isSafeBackupAvailable: (safeCredentials: SafeCredentials) => Promise<boolean>;
    readonly error?: {
        message: string;
        details: string;
    };
    readonly currentIdentity?: IdentityString;
}

export interface ContextStore {
    isIdentityValid: (identity: IdentityString) => Promise<boolean>;
    isSafeBackupAvailable: (safeCredentials: SafeCredentials) => Promise<boolean>;
    error?: {
        message: string;
        details: string;
    };
    identity?: IdentityString;
    linkingCode?: LinkingCode;
    linkingCodeParts: [one: string, two: string, three: string, four: string];
    customSafeServer?: {
        url: string;
        auth?: {
            username: string;
            password: string;
        };
    };
    cspDeviceId?: CspDeviceId;
    d2mDeviceId?: D2mDeviceId;
    newPassword?: string;
}
