import type {AnyMention, MentionContact} from '~/common/viewmodel/utils/mentions';

/**
 * Props accepted by the `Mention` component.
 */
export interface MentionProps {
    readonly mention:
        | Pick<Exclude<AnyMention, MentionContact>, 'identity' | 'type'>
        | Pick<MentionContact, 'identity' | 'name' | 'type'>;
}
