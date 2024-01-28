/**
 * Props accepted by the `Charms` component.
 */
export interface CharmsProps {
    readonly isBlocked?: boolean;
    readonly isPinned?: boolean;
    readonly isPrivate?: boolean;
    readonly notificationPolicy?: 'default' | 'muted' | 'mentioned' | 'never';
}
