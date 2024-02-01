/**
 * Possible Toast action types.
 */
export type ToastActionType = 'dismissible' | 'action';

/**
 * Possible actions of an Toast action type.
 * `dismissible` with icon to dismiss the toast instand
 * `action` with custom clickable text which will trigger the custom callback
 */
export type ToastAction<TState extends ToastActionType> = {
    readonly type: TState;
} & (TState extends 'action'
    ? {
          readonly text: string;
          readonly callback: (closeHandler: () => void) => void;
      }
    : unknown);
/**
 * Unified possible Toast action types
 */
export type AnyToastAction = ToastAction<'dismissible'> | ToastAction<'action'>;

/**
 * One Toast Message
 */
export interface ToastMessage {
    readonly message: string;
    readonly lifetime: number;
    readonly action: AnyToastAction;
}
