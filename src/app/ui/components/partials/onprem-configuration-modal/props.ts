import type {OppfConfig} from '~/app/ui/linking';
import type {ResolvablePromise} from '~/common/utils/resolvable-promise';

export interface OnPremConfigurationModalProps {
    oppfConfig: ResolvablePromise<OppfConfig>;
}
