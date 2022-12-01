import {type AnyToastAction} from '#3sc/components/generic/Snackbar';
import {type IconSet} from '~/common/types';
import {WritableStore} from '~/common/utils/store';

const SIMPLE_TOAST_TTL_MILLISECONDS = 5000 as const;
const ACTION_TOAST_TTL_MILLISECONDS = 10000 as const;

export type ToastIconColor = 'green' | 'red';

export interface ToastIcon {
    type: IconSet;
    name: string;
    theme: 'Filled' | 'Outlined';
    color: ToastIconColor;
}

export interface Toast {
    readonly message: string;
    readonly action?: AnyToastAction;
    readonly ttl:
        | typeof SIMPLE_TOAST_TTL_MILLISECONDS
        | typeof ACTION_TOAST_TTL_MILLISECONDS
        | 'persistent';
    readonly icon?: ToastIcon;
}

export const snackbarStore = new WritableStore<Toast[]>([]);

function addDismissable(message: string, icon?: ToastIcon): void {
    addToast({
        message,
        icon,
        ttl: 'persistent',
        action: {
            type: 'dismissible',
        },
    });
}

function addAction(message: string, action: AnyToastAction, icon?: ToastIcon): void {
    addToast({
        message,
        icon,
        action,
        ttl: ACTION_TOAST_TTL_MILLISECONDS,
    });
}

function addSimpleSuccess(message: string): void {
    addSimple(message, {
        type: 'md-icon',
        name: 'done',
        theme: 'Outlined',
        color: 'green',
    });
}

function addSimpleFailure(message: string): void {
    addSimple(message, {
        type: 'md-icon',
        name: 'close',
        theme: 'Outlined',
        color: 'red',
    });
}

function addSimple(message: string, icon?: ToastIcon): void {
    addToast({
        message,
        icon,
        ttl: SIMPLE_TOAST_TTL_MILLISECONDS,
    });
}

function addToast(toast: Toast): void {
    snackbarStore.set([toast, ...snackbarStore.get()]);
    if (toast.ttl !== 'persistent') {
        setTimeout(() => {
            removeToast(toast);
        }, toast.ttl);
    }
}

function removeToast(toast: Toast): void {
    const toasts = [...snackbarStore.get()];
    const index = toasts.findIndex((element) => element === toast);
    if (index !== -1) {
        toasts.splice(index, 1);
        snackbarStore.set(toasts);
    }
}

export const toast = {
    addSimple,
    addSimpleSuccess,
    addSimpleFailure,
    addDismissable,
    addAction,
    removeToast,
} as const;
