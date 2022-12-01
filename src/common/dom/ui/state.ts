import {WritableStore} from '~/common/utils/store';

import {type DisplayMode, type LayoutMode, DEFAULT_LAYOUT_MODE} from './layout';

/**
 * The current display mode.
 */
export const display = new WritableStore<DisplayMode>('large');

/**
 * The currently active layout mode.
 */
export const layout = new WritableStore<LayoutMode>(DEFAULT_LAYOUT_MODE);

/**
 * App visibility state.
 *
 * - focused: The app is visible **and** focused.
 * - visible: The app is visible but not focused.
 * - hidden: The app has been minimised or is in the background.
 */
export type AppVisibility = 'focused' | 'visible' | 'hidden';

export function getAppVisibility(): AppVisibility {
    if (document.hasFocus()) {
        return 'focused';
    }
    if (document.visibilityState === 'visible') {
        return 'visible';
    }
    return 'hidden';
}

/**
 * The current page visibility.
 */
export const appVisibility = new WritableStore<AppVisibility>(getAppVisibility());
