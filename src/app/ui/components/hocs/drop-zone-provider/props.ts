/**
 * Props accepted by the `DropZoneProvider` component.
 */
export interface DropZoneProviderProps {
    /**
     * Whether to show an overlay while hovering, and what message it should contain.
     */
    readonly overlay?: {
        readonly message: string;
    };
}
