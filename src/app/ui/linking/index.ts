import {type LinkingState, type LinkingStateErrorType} from '~/common/dom/backend';
import {type ReadonlyUint8Array} from '~/common/types';
import {type ResolvablePromise} from '~/common/utils/resolvable-promise';
import {type ReadableStore} from '~/common/utils/store';

export interface LinkingParams {
    /**
     * Linking-related state from the backend.
     */
    readonly linkingState: ReadableStore<LinkingState>;

    /**
     * A promise that should be fulfilled when the user has chosen a password.
     */
    readonly userPassword: ResolvablePromise<string>;
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
    | {readonly currentStep: 'syncing'}
    | {readonly currentStep: 'success-linked'}
    | LinkingWizardStateError;
