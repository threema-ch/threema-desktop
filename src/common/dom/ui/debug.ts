import type {u53} from '~/common/types';

/**
 * Available debug panel states.
 */
export const DEBUG_PANEL_STATES = ['show', 'hide'];
export type DebugPanelState = (typeof DEBUG_PANEL_STATES)[u53];

/**
 * Default debug panel height.
 */
export const DEFAULT_DEBUG_PANEL_HEIGHT = '30vh';

/**
 * Valid debug panel height values.
 */
const DEBUG_PANEL_HEIGHT_RE = /^[0-9]+(?<unit>vh|px)$/u;

/**
 * Validate a debug panel state and fall back to the default (`hide`) if
 * invalid.
 */
export function ensureDebugPanelState(state: string): DebugPanelState {
    if (!DEBUG_PANEL_STATES.includes(state)) {
        return 'hide';
    }
    return state;
}

/**
 * Validate a debug panel height and fall back to the default (`30vh`) if
 * invalid.
 */
export function ensureDebugPanelHeight(height: string): string {
    return DEBUG_PANEL_HEIGHT_RE.test(height) ? height : DEFAULT_DEBUG_PANEL_HEIGHT;
}
