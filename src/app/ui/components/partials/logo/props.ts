import type {f64} from '~/common/types';

/**
 * Props accepted by the `Logo` component.
 */
export interface LogoProps {
    /**
     * Whether to animate progress completion. Defaults to `false`.
     */
    readonly animated?: boolean;
    /**
     * Callback to call when `progress` has reached 100% (or is `undefined`) and all animations are
     * completed (if any).
     */
    readonly onCompletion?: () => void;
    /**
     * Optionally display a progress bar in place of the Threema dots with the given value between
     * `0` and `1`. Alternatively, if the value is `"unknown"`, a pending animation will be shown.
     */
    readonly progress?: f64 | 'unknown';
}
