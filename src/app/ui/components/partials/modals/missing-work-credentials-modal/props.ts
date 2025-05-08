import type {AppServicesForSvelte} from '~/app/types';

export interface MissingWorkCredentialsProps {
    readonly services: Pick<AppServicesForSvelte, 'electron'>;
}
