import type {AppServicesForSvelte} from '~/app/types';

export interface ForgotPasswordModalProps {
    readonly services: Pick<AppServicesForSvelte, 'electron'>;
}
