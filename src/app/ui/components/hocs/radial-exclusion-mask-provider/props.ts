import type {f64, u53} from '~/common/types';

/**
 * Props accepted by the `RadialExclusionMaskProvider` component.
 */
export interface RadialExclusionMaskProviderProps {
    /**
     * An array of radial cutouts to exclude from the container. If it is empty, no mask will be
     * applied.
     */
    readonly cutouts: {
        /**
         * Diameter of the cutout, in pixels.
         */
        readonly diameter: u53;
        /**
         * Position of the cutout's center relative to the top left corner of the container, in
         * percent (e.g., `20`).
         */
        readonly position: {
            readonly x: f64;
            readonly y: f64;
        };
    }[];
}
