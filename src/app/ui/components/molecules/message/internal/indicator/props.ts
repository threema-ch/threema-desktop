/**
 * Props accepted by the `Indicator` component.
 */
export interface IndicatorProps {
    /** Direction of the message. */
    readonly direction: 'inbound' | 'outbound';
    /** Whether to forcefully hide status icons, even if a status is provided. */
    readonly options?: {
        /** Whether to forcefully hide status icons, even if a status is provided. */
        readonly hideStatus?: boolean;
        /**
         * Whether to forcefully display the reaction icons as filled, even if none of the reactions
         * is outbound.
         */
        readonly fillReactions?: boolean;

        /**
         * Whether to always show the number, even if only one reaction is there.
         */
        readonly alwaysShowNumber?: boolean;
    };
    readonly reactions: Readonly<Reaction[]>;
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
}

interface Milestone {
    /** When the milestone was reached. */
    readonly at: Date;
}
