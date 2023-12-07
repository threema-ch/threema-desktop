import type {u53} from '~/common/types';

export interface EditDeviceNameModalProps {
    readonly label: string;
    readonly value: string;
    readonly maxlength?: u53;
}
