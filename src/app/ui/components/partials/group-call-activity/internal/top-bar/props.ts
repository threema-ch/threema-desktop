import type {u53} from '~/common/types';

/**
 * Props accepted by the `TopBar` component.
 */
export interface TopBarProps {
    /**
     * Whether the panel that contains this `TopBar` is expanded or collapsed. Used to display the
     * appropriate action button and icon.
     */
    readonly isExpanded: boolean;
    /**
     * Count of members in the call.
     */
    readonly memberCount: u53;
    readonly startedAt: Date;
}
