import {type LinkingState, type LinkingStateErrorType} from '~/common/dom/backend';
import {type ReadonlyUint8Array} from '~/common/types';
import {type ReadableStore} from '~/common/utils/store';

export interface LinkingParams {
    /**
     * Linking-related state from the backend.
     */
    readonly linkingState: ReadableStore<LinkingState>;
}

export interface LinkingWizardStateScan {
    readonly currentStep: 'scan';
    readonly joinUri?: string;
}

export interface LinkingWizardStateConfirmEmoji {
    readonly currentStep: 'confirm-emoji';
    readonly rph: ReadonlyUint8Array;
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
    | {readonly currentStep: 'set-password'}
    | {readonly currentStep: 'syncing'}
    | {readonly currentStep: 'success-linked'}
    | LinkingWizardStateError;
