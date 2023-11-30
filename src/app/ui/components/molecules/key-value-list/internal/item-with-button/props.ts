export interface ItemWithButtonProps {
    readonly key: string;
    readonly options?: {
        readonly showInfoIcon?: boolean;
        readonly disabled?: boolean;
    };
    readonly icon: string;
}
