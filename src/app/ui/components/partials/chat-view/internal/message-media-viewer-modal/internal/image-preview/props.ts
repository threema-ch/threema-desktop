import type {LoadedImageState} from '~/app/ui/components/partials/chat-view/internal/message-media-viewer-modal/types';
import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

/**
 * Props accepted by the `ImagePreview` component.
 */
export interface ImagePreviewProps {
    /**
     * Reference to the `img` element in this component.
     */
    readonly element: SvelteNullableBinding<HTMLElement>;
    /**
     * Data of the loaded image blob to preview.
     */
    readonly image: LoadedImageState;
}
