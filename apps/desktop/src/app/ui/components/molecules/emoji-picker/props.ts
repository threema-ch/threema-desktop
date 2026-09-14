import type {AppServicesForSvelte} from '~/app/types';
import type {SingleUnicodeEmoji} from '~/common/utils/emoji';

/**
 * Props accepted by the `EmojiPicker` component.
 */
export interface EmojiPickerProps {
    /**
     * List of emojis to display as highlighted in the picker. This is can be used to display emojis
     * that have already been selected by the user, for example.
     */
    readonly highlighted?: SingleUnicodeEmoji[];
    readonly onselectemoji?: (emoji: SingleUnicodeEmoji) => void;
    readonly services: Pick<AppServicesForSvelte, 'backend' | 'emojis'>;
    readonly visible: boolean;
}
