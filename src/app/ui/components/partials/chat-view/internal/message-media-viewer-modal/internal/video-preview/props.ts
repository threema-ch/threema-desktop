import type {LoadedVideoState} from '~/app/ui/components/partials/chat-view/internal/message-media-viewer-modal/types';
import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

/**
 * Props accepted by the `VideoPreview` component.
 */
export interface VideoPreviewProps {
    /**
     * Reference to the `video` element in this component.
     */
    readonly element: SvelteNullableBinding<HTMLElement>;
    /**
     * Data of the loaded video blob to preview.
     */
    readonly video: LoadedVideoState;
}
