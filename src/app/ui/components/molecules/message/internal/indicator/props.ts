/**
 * Props accepted by the `Indicator` component.
 */
export interface IndicatorProps {
    /** Direction of the message. */
    readonly direction: 'inbound' | 'outbound';
    /** Whether to forcefully hide status icons, even if a status is provided. */
    readonly hideStatus?: boolean;
    readonly reactions: Readonly<Reaction[]> | undefined;
    readonly status: Status;
}

interface Reaction {
    readonly direction: 'inbound' | 'outbound';
    readonly type: 'acknowledged' | 'declined';
    readonly at: Date;
}

interface Status {
    readonly created: Milestone;
    readonly received?: Milestone;
    readonly sent?: Milestone;
    readonly delivered?: Milestone;
    readonly read?: Milestone;
    readonly error?: Milestone;
}

interface Milestone {
    /** When the milestone was reached. */
    readonly at: Date;
}
