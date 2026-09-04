import type {AppServicesForSvelte} from '~/app/types';

/**
 * Props accepted by the `CallActivity` component.
 */
export interface CallActivityProps {
    /** Whether the panel is expanded or collapsed. */
    readonly isExpanded: boolean;
    readonly ontoggleexpand?: (event?: Event) => void;
    readonly services: AppServicesForSvelte;
}
