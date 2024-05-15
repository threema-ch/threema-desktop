import type {Constraints} from '~/app/ui/components/atoms/lazy-image/types';
import type {Dimensions} from '~/common/types';
import type {IQueryableStore} from '~/common/utils/store';

/**
 * Props accepted by the `LazyImage` component.
 */
export interface LazyImageProps {
    /**
     * Bytes of the image. Note: Please ensure the {@link Blob} has a defined media type, or it will
     * be rendered as failed.
     */
    readonly byteStore: IQueryableStore<'loading' | Blob | undefined>;
    /**
     * Constraints to control the display size of an image.
     */
    readonly constraints: Constraints;
    /**
     * Description of the image, used for accessibility.
     */
    readonly description: string;
    /**
     * Optional full-size dimensions of the image. This will be used to display a placeholder that
     * behaves similarly to the image.
     */
    readonly dimensions?: Dimensions;
    /**
     * Whether the `LazyImage` is clickable and should emit `on:click` events. Defaults to `false`.
     */
    readonly isClickable?: boolean;
    /**
     * Whether the `LazyImage` is focusable (usually with the `Tab` key). Defaults to `false`. Note:
     * Doesn't have any effect if `isClickable` is set to `false`.
     */
    readonly isFocusable?: boolean;
    /**
     * Whether the image should be responsive, i.e. it should not exceed 100% of the parent's width
     * or height. Defaults to `false`.
     */
    readonly responsive?: boolean;
}
