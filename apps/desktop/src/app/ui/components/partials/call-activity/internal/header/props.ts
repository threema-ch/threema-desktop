import type {u53} from '@threema/ts-utils/integer/u53';
import type {Logger} from '@threema/ts-utils/logging/logger';

/**
 * Props accepted by the `Header` component.
 */
export interface HeaderProps {
    /** Whether the panel is expanded or collapsed. */
    readonly isExpanded: boolean;
    readonly log: Logger;
    readonly onclicktoggleexpand?: (event: MouseEvent) => void;
    readonly state:
        | {readonly type: 'connecting'}
        | {
              readonly type: 'connected';
              readonly nParticipants: u53;
              readonly startedAt: Date;
          };
}
