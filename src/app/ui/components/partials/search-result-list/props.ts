import type {AppServicesForSvelte} from '~/app/types';

/**
 * Props accepted by the `SearchResultList` component.
 */
export interface SearchResultListProps {
    readonly searchTerm: string | undefined;
    readonly services: AppServicesForSvelte;
}
