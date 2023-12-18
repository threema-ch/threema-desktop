/**
 * Props accepted by the `Section` component.
 */
export interface SectionProps {
    readonly options?: {
        /**
         * If the section has a title, an additional left offset (padding) will be added to its
         * items. Set to `true` if this inset should never be added.
         */
        readonly disableItemInset?: boolean;
    };
    /** Optional title of the section. */
    readonly title?: string;
}
