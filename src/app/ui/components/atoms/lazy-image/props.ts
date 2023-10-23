import type {Constraints} from '~/app/ui/components/atoms/lazy-image/types';
import type {Dimensions, ReadonlyUint8Array} from '~/common/types';

/**
 * Props accepted by the `LazyImage` component.
 */
export interface LazyImageProps {
    /**
     * Bytes of the image to create the blob from.
     */
    readonly bytes: Promise<ReadonlyUint8Array | undefined>;
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
     * Whether clicking on the image should be disabled. Defaults to `true`.
     */
    readonly disabled?: boolean;
    /**
     * Whether the image should be responsive, i.e. its `max-width` and `max-height` should be set
     * to `100%`. Defaults to `false`.
     */
    readonly responsive?: boolean;
}
