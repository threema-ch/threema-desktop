/**
 * Props accepted by the `ConnectionErrorDialog` component.
 */
export interface ConnectionErrorDialogProps {
    /**
     * The error to be displayed as the dialog's content.
     */
    readonly error: ConnectionError;
}

// TODO(DESK-487): Add other user interactions.
// TODO(DESK-1337): Below properties are confusing / dead code.
type ConnectionError =
    | {
          readonly type: 'mediator-update-required';
          readonly userCanReconnect: true;
      }
    | {
          readonly type: 'client-update-required';
          readonly userCanReconnect: false;
      }
    | {
          readonly type: 'client-was-dropped';
          readonly userCanReconnect: false;
      }
    | {
          readonly type: 'device-slot-state-mismatch';
          readonly userCanReconnect: false;
          readonly clientExpectedState: 'new';
      };
