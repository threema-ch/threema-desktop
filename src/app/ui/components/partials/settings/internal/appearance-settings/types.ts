import type {ToggleSpellcheckModalProps} from '~/app/ui/components/partials/settings/internal/appearance-settings/internal/props';

export type ModalState = NoneModalState | ToggleSpellcheckModalState;

interface NoneModalState {
    readonly type: 'none';
}

interface ToggleSpellcheckModalState {
    readonly type: 'toggle-spellcheck';
    readonly props: ToggleSpellcheckModalProps;
}
