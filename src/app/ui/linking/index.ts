import type {LinkingState, LinkingStateErrorType, SyncingPhase} from '~/common/dom/backend';
import type {ReadonlyUint8Array} from '~/common/types';
import type {ReusablePromise} from '~/common/utils/promise';
import type {ResolvablePromise} from '~/common/utils/resolvable-promise';
import type {ReadableStore} from '~/common/utils/store';

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
}

export interface LinkingWizardOppfProps {
    readonly oppfConfig: ResolvablePromise<OppfConfig>;
}

export interface LinkingWizardScanProps {
    readonly joinUri?: string;
}

export interface LinkingWizardConfirmEmojiProps {
    readonly rph: ReadonlyUint8Array;
}

export interface LinkingWizardOldProfilePasswordProps {
    readonly oldPassword: ReusablePromise<string | undefined>;
    readonly previouslyEnteredPassword?: string;
    readonly state: 'default' | 'skipped' | 'restoring';
}

export interface RestorationIdentityMismatchProps {
    readonly accept: ResolvablePromise<void>;
}

export interface LinkingWizardSetPasswordProps {
    readonly userPassword: ResolvablePromise<string>;
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
}
