import type {PublicKey} from '~/common/crypto';

/**
 * Props accepted by the `PublicKeyModal` component.
 */
export interface PublicKeyModalProps {
    readonly publicKey: PublicKey;
}
