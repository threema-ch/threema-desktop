import type {AppServices} from '~/app/types';

/**
 * Props accepted by the `ProfileSettings` component.
 */
export interface ProfileSettingsProps {
    readonly services: AppServices;
}