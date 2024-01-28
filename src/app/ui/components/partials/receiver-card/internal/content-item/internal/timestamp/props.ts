import type {AppServices} from '~/app/types';

/**
 * Props accepted by the `Timestamp` component.
 */
export interface TimestampProps {
    readonly date: Date;
    /** Whether to only display the time, or the full timestamp. Defaults to `"auto"`. */
    readonly format: 'auto' | 'time' | 'extended';
    readonly services: Pick<AppServices, 'settings'>;
}
