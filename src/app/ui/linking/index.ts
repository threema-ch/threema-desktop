import type {LinkingState, LinkingStateErrorType, SyncingPhase} from '~/common/dom/backend';
import type {ReadonlyUint8Array} from '~/common/types';
import type {ResolvablePromise} from '~/common/utils/resolvable-promise';
import type {ReadableStore} from '~/common/utils/store';

export interface OppfConfig {
    oppfUrl: string;
    username: string;
    password: string;
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
