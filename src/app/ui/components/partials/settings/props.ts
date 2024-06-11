import type {AppServicesForSvelte} from '~/app/types';

/**
 * Props accepted by the `Settings` component.
 */
export interface SettingsProps {
    readonly services: AppServicesForSvelte;
}
