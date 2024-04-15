import type {ThreemaIdInfoInfoModalProps} from '~/app/ui/components/partials/modals/threema-id-info-modal/props';
import type {VerificationLevelInfoModalProps} from '~/app/ui/components/partials/modals/verification-level-info-modal/props';

export type ModalState = NoneModalState | ThreemaIdInfoModalState | VerificationLevelInfoModalState;

interface NoneModalState {
    readonly type: 'none';
}

interface ThreemaIdInfoModalState {
    readonly type: 'threema-id-info';
    readonly props: ThreemaIdInfoInfoModalProps;
}

interface VerificationLevelInfoModalState {
    readonly type: 'verification-level-info';
    readonly props: VerificationLevelInfoModalProps;
}
