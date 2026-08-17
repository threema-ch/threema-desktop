// Components

export {Avatar, type AvatarProps} from './components/avatar';
export {
    default as AvatarSelectionSummary,
    type AvatarSelectionSummaryItem,
    type AvatarSelectionSummaryProps,
} from './components/avatar-selection-summary/AvatarSelectionSummary.svelte';
export {
    default as Button,
    type ButtonProps,
    buttonVariants,
} from './components/button/Button.svelte';
export {
    ContextMenu,
    type ContextMenuGroupProps,
    type ContextMenuItemProps,
    type ContextMenuProps,
} from './components/context-menu';
export {default as Icon, type IconProps, iconVariants} from './components/icon/Icon.svelte';
export {
    default as Spinner,
    type SpinnerProps,
    spinnerVariants,
} from './components/spinner/Spinner.svelte';
export {
    default as Switch,
    type SwitchProps,
    type SwitchVariants,
    switchVariants,
} from './components/switch/Switch.svelte';
export {
    default as VerticalNavigationStrip,
    type VerticalNavigationAvatar,
    type VerticalNavigationItem,
    type VerticalNavigationStripProps,
    verticalNavigationStripVariants,
} from './components/vertical-navigation-strip/VerticalNavigationStrip.svelte';

// HOCs

export {
    default as PopoverProvider,
    type PopoverAnchorProps,
    type PopoverProviderProps,
    popoverProviderVariants,
} from './hocs/popover-provider/PopoverProvider.svelte';
export {
    default as RadialExclusionMaskProvider,
    type RadialExclusionMaskProviderProps,
} from './hocs/radial-exclusion-mask-provider/RadialExclusionMaskProvider.svelte';

// Utils

export {
    type ProfilePictureColor,
    PROFILE_PICTURE_BACKGROUND_COLOR_CLASS_MAP,
    PROFILE_PICTURE_TEXT_COLOR_CLASS_MAP,
} from './utils/profile-picture-color';
