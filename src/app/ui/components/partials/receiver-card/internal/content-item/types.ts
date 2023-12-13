import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Configuration options for a `ContentItem` in a `ReceiverCard`.
 */
export type AnyContentItemOptions = TextContentItemOptions | VerificationContentItemOptions;

export interface TextContentItemOptions {
    readonly type: 'text';
    readonly text: string;
    readonly decoration?: 'strikethrough' | 'semi-transparent';
}

export interface VerificationContentItemOptions {
    readonly type: 'verification-dots';
    readonly receiver: Pick<AnyReceiverData & {type: 'contact'}, 'verification'>;
}
