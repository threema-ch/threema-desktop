import type {u53} from '~/common/types';

/**
 * Props accepted by the `TopBar` component.
 */
export interface TopBarProps {
    readonly state:
        | {
              readonly type: 'connecting';
          }
        | {
              readonly type: 'connected';
              /** When the group call was started. */
              readonly startedAt: Date;
              /** Number of participants in the call. */
              readonly nParticipants: u53;
          };

    /**
     * Whether the panel that contains this `TopBar` is expanded or collapsed. Used to display the
     * appropriate action button and icon.
     */
    readonly isExpanded: boolean;
}
