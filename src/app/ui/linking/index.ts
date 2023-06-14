import {type LinkingState, type LinkingStateErrorType} from '~/common/dom/backend';
import {type ReadonlyUint8Array} from '~/common/types';
import {type ReadableStore} from '~/common/utils/store';

export interface LinkingParams {
    /**
     * Linking-related events from the backend.
     */
    readonly linkingEvents: ReadableStore<LinkingState>;
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

// List generated with rendezvous-emoji script
export const EMOJI_LIST = [
    ['1F435'],
    ['1F436'],
    ['1F429'],
    ['1F98A'],
    ['1F408', '200D', '2B1B'],
    ['1F434'],
    ['1F9AC'],
    ['1F42E'],
    ['1F437'],
    ['1F42A'],
    ['1F992'],
    ['1F418'],
    ['1F42D'],
    ['1F430'],
    ['1F43F', 'FE0F'],
    ['1F43C'],
    ['1F998'],
    ['1F414'],
    ['1F54A', 'FE0F'],
    ['1F986'],
    ['1F9A2'],
    ['1F989'],
    ['1F9A4'],
    ['1FAB6'],
    ['1F9A9'],
    ['1F438'],
    ['1F40B'],
    ['1F42C'],
    ['1F9AD'],
    ['1F41F'],
    ['1F41A'],
    ['1FAB2'],
    ['1F578', 'FE0F'],
    ['1F3F5', 'FE0F'],
    ['1F33B'],
    ['1F332'],
    ['1F33F'],
    ['2618', 'FE0F'],
    ['1F349'],
    ['1F34B'],
    ['1F34E'],
    ['1F352'],
    ['1F353'],
    ['1FAD0'],
    ['1F345'],
    ['1F951'],
    ['1F955'],
    ['1F966'],
    ['1F344'],
    ['1FAD8'],
    ['1F9C2'],
    ['1F36A'],
    ['1F36B'],
    ['2615'],
    ['1F9CA'],
    ['1F962'],
    ['1F5FA', 'FE0F'],
    ['1F30B'],
    ['1F3D5', 'FE0F'],
    ['1F3DD', 'FE0F'],
    ['1F3DB', 'FE0F'],
    ['1F682'],
    ['1F69A'],
    ['1F69C'],
    ['1F6E4', 'FE0F'],
    ['2693'],
    ['1F6F0', 'FE0F'],
    ['1F680'],
    ['1F319'],
    ['2600', 'FE0F'],
    ['2B50'],
    ['1F308'],
    ['2602', 'FE0F'],
    ['2744', 'FE0F'],
    ['2603', 'FE0F'],
    ['1F525'],
    ['1F4A7'],
    ['2728'],
    ['1F388'],
    ['1F380'],
    ['1F947'],
    ['1F3C0'],
    ['1F3D0'],
    ['1F3B3'],
    ['1F3D3'],
    ['26F3'],
    ['1F3AF'],
    ['1F579', 'FE0F'],
    ['1F9E9'],
    ['1F9F8'],
    ['2660', 'FE0F'],
    ['2665', 'FE0F'],
    ['1F457'],
    ['1F451'],
    ['1F514'],
    ['1F3B7'],
    ['1F3B8'],
    ['1F5A8', 'FE0F'],
    ['1F4F8'],
    ['1F56F', 'FE0F'],
    ['1F4D6'],
    ['1F4E6'],
    ['1F4EE'],
    ['1F4DD'],
    ['1F4BC'],
    ['1F4CB'],
    ['1F512'],
    ['1F511'],
    ['2692', 'FE0F'],
    ['1FA83'],
    ['2696', 'FE0F'],
    ['1F517'],
    ['1FA9D'],
    ['1F52C'],
    ['1FA91'],
    ['1F6BD'],
    ['1F9F9'],
    ['1FAA3'],
    ['1FAE7'],
    ['26AB'],
    ['1F7E8'],
    ['25B6', 'FE0F'],
    ['1F4F6'],
    ['1F4A5'],
    ['1F4AC'],
    ['1F4AB'],
    ['1F440'],
    ['1F463'],
] as const;
