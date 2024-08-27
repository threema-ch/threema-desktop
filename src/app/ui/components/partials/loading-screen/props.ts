import type {LoadingState} from '~/common/dom/backend';
import type {IQueryableStore} from '~/common/utils/store';

/**
 * Props accepted by the `LoadingScreen` component.
 */
export interface LoadingScreenProps {
    readonly loadingState: IQueryableStore<LoadingState>;
}
