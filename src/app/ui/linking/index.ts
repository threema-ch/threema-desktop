import type {LinkingState, LinkingStateErrorType, SyncingPhase} from '~/common/dom/backend';
import type {ReadonlyUint8Array} from '~/common/types';
import type {ResolvablePromise} from '~/common/utils/resolvable-promise';
import type {ReadableStore} from '~/common/utils/store';

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
}

export interface LinkingWizardStateScan {
    readonly currentStep: 'scan';
    readonly joinUri?: string;
}

export interface LinkingWizardStateConfirmEmoji {
    readonly currentStep: 'confirm-emoji';
    readonly rph: ReadonlyUint8Array;
}

export interface LinkingWizardStateSetPassword {
    readonly currentStep: 'set-password';
    readonly userPassword: ResolvablePromise<string>;
}

export interface LinkingWizardStateSyncing {
    readonly currentStep: 'syncing';
    readonly phase: SyncingPhase;
}

export interface LinkingWizardStateSuccess {
    readonly currentStep: 'success-linked';
    readonly identityReady: ResolvablePromise<void>;
}

export interface LinkingWizardStateError {
    readonly currentStep: 'error';
    readonly errorType: LinkingStateErrorType;
    readonly errorMessage: string;
}

/**
 * Linking wizard UI state and associated data.
 */
export type LinkingWizardState =
    | LinkingWizardStateScan
    | LinkingWizardStateConfirmEmoji
    | LinkingWizardStateSetPassword
    | LinkingWizardStateSyncing
    | LinkingWizardStateSuccess
    | LinkingWizardStateError;
