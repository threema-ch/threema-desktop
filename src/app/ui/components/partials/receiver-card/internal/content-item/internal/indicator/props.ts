/**
 * Props accepted by the `Indicator` component.
 */
export interface IndicatorProps {
    /** Whether to forcefully hide status icons, even if a status is provided. */
    readonly options?: {
        /** Whether to forcefully hide status icons, even if a status is provided. */
        readonly hideStatus?: boolean;
    };
    readonly reactions: readonly Reaction[];
    /** Details about the conversation this status belongs to. */
    readonly conversation: {
        readonly receiver: {
            readonly type: 'contact' | 'group' | 'distribution-list';
        };
    };
    readonly status: Status;
}

interface Reaction {
    readonly direction: 'inbound' | 'outbound';
    readonly type: 'acknowledged' | 'declined';
}

interface Status {
    readonly created: Milestone;
    readonly received?: Milestone;
    readonly sent?: Milestone;
    readonly delivered?: Milestone;
    readonly read?: Milestone;
    readonly error?: Milestone;
    readonly deleted?: Milestone;
}

interface Milestone {
    /** When the milestone was reached. */
    readonly at: Date;
}
