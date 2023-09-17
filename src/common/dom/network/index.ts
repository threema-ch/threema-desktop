import type {CloseInfo} from '~/common/network';

export interface MediatorPipe {
    readonly readable: Promise<void>;
    readonly writable: Promise<void>;
}

export interface MediatorTransport {
    readonly pipe: Promise<MediatorPipe>;
    readonly closed: Promise<CloseInfo>;
    close: (info: CloseInfo) => void;
}
