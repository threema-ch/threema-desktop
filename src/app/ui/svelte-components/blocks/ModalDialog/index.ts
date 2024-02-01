export interface Modal {
    clickoutside: () => void;
    close: () => void;
    cancel: () => void;
    confirm: () => void;
}

export type EventName = keyof Modal;
