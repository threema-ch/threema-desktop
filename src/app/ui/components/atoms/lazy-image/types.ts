import type {Dimensions, u53} from '~/common/types';

/**
 * The orientation of an image.
 */
export type Orientation = 'none' | 'horizontal' | 'vertical';

/**
 * Constraints that can be used to determine the optimal display size of an image.
 */
export interface Constraints {
    /**
     * Minimum size. Note: must be smaller than `max` size in every dimension.
     */
    readonly min: Dimensions & {
        /**
         * Minimum total number of pixels in the image. Note: Only has an effect if it would make
         * the image larger than the given concrete `width` and `height` values.
         */
        readonly size?: u53;
    };
    /**
     * Maximum size. Note: must be larger than `min` size in every dimension.
     */
    readonly max: Dimensions & {
        /**
         * Maximum total number of pixels in the image. Note: Only has an effect if it would make
         * the image smaller than the given concrete `width` and `height` values.
         */
        readonly size?: u53;
    };
}

/**
 * The optimal {@link Dimensions} for displaying an image after applying {@link Constraints}.
 */
export interface ConstrainedDimensions {
    /**
     * Optimal size to display the image at, given its constraints.
     */
    readonly values: Dimensions;
    /**
     * Whether the constrained dimensions have an equal aspect ratio compared to the image's natural
     * size.
     */
    readonly isAspectRatioObeyed: boolean;
    /**
     * Orientation of the constrained dimensions.
     */
    readonly orientation: Orientation;
}

export type LazyImageContent =
    | LoadingLazyImageContent
    | FailedLazyImageContent
    | LoadedLazyImageContent;

interface LoadingLazyImageContent {
    state: 'loading';
}

interface FailedLazyImageContent {
    state: 'failed';
}

interface LoadedLazyImageContent {
    state: 'loaded';
    /** Url of the loaded image. */
    url: string;
    /** Dimensions extracted from the real image. */
    dimensions: Dimensions;
}
