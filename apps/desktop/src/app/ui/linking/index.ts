import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import type {ResolvablePromise} from '@threema/ts-utils/promise/resolvable-promise';

import type {AppServicesForSvelte} from '~/app/types';
import type {ModalProps} from '~/app/ui/components/hocs/modal/props';
import type {LinkingState, LinkingStateErrorType, SyncingPhase} from '~/common/dom/backend';
import type {SafeStorageUnavailableReason} from '~/common/electron-ipc';
import type {ReusablePromise} from '~/common/utils/promise';
import type {ReadableStore, WritableStore} from '~/common/utils/store';

export interface OppfConfig {
    readonly oppfUrl: string;
    readonly username: string;
    readonly password: string;
}

export interface LinkingParams {
    /**
     * Linking-related state from the backend.
     */
    readonly linkingState: ReadableStore<LinkingState>;

    /**
     * A promise that should be fulfilled when the user has chosen a password.
     */
    readonly userPassword: ResolvablePromise<string>;

    /**
     * A promise that should be fulfilled when the user has chosen to store the password or not.
     */
    readonly shouldStorePassword: ResolvablePromise<boolean>;

    /**
     * A promise that fulfills when the user enters a password to unlock the key storage of an old
     * profile. Can be resolved multiple times.
     *
     * Is resolved to undefined when the user does not wish to unlock the old key storage, or when no
     * such storage is found.
     */
    readonly oldProfilePassword: ReusablePromise<string | undefined>;

    /**
     * A promise that fulfills if the user tried to restore messages from another Threema ID and
     * decides to continue without message restoration.
     */
    readonly continueWithoutRestoring: ResolvablePromise<void>;

    /**
     * A promise that should be fulfilled when the user clicks the button in the success screen.
     */
    readonly identityReady: ResolvablePromise<void>;

    /**
     * A promise that should be fulfilled when the user has entered OnPrem credentials and URL.
     */
    readonly oppfConfig: ResolvablePromise<OppfConfig>;

    readonly isSafeStorageAvailable: boolean;
    readonly safeStorageUnavailableReason: SafeStorageUnavailableReason | undefined;

    /**
     * A writable store that stores if invalid certificate pins have been detected.
     */
    readonly invalidCertificatePinStore: WritableStore<boolean>;
}

export interface LinkingWizardOppfProps {
    readonly oppfConfig: ResolvablePromise<OppfConfig>;
    readonly services: Pick<AppServicesForSvelte, 'electron'>;
}

export interface LinkingWizardScanProps {
    readonly joinUri?: string;
}

export interface LinkingWizardConfirmEmojiProps {
    readonly rph: ReadonlyUint8Array;
}

export interface LinkingWizardOldProfilePasswordProps extends Pick<ModalProps, 'onclose'> {
    readonly services: Pick<AppServicesForSvelte, 'electron'>;
    readonly oldPassword: ReusablePromise<string | undefined>;
    readonly previouslyEnteredPassword?: string;
    readonly state: 'default' | 'skipped' | 'restoring';
}

export interface RestorationIdentityMismatchProps extends Pick<ModalProps, 'onclose'> {
    readonly accept: ResolvablePromise<void>;
}

export interface LinkingWizardSetPasswordProps {
    readonly userPassword: ResolvablePromise<string>;
    readonly shouldStorePassword: ResolvablePromise<boolean>;
    readonly isSafeStorageAvailable: boolean;
    readonly safeStorageUnavailableReason: SafeStorageUnavailableReason | undefined;
}

export interface LinkingWizardSyncingProps {
    readonly phase: SyncingPhase;
}

export interface LinkingWizardSuccessProps {
    readonly identityReady: ResolvablePromise<void>;
}

export interface LinkingWizardErrorProps {
    readonly errorType: LinkingStateErrorType;
    readonly errorMessage: string;
    readonly publicKeyPinMismatch: WritableStore<boolean>;
    readonly services: Pick<AppServicesForSvelte, 'electron'>;
}
