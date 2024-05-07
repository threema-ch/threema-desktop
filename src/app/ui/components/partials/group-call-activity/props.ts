import type {AppServices} from '~/app/types';

/**
 * Props accepted by the `GroupCallActivity` component.
 */
export interface GroupCallActivityProps {
    /**
     * Whether the panel is expanded or collapsed.
     */
    readonly isExpanded: boolean;
    readonly services: AppServices;
}
