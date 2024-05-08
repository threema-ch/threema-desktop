import type {LazyImageProps} from '~/app/ui/components/atoms/lazy-image/props';
import type {ProfilePictureColor} from '~/app/ui/svelte-components/threema/ProfilePicture';
import type {u53} from '~/common/types';

/**
 * Props accepted by the `Avatar` component.
 */
export interface AvatarProps {
    /** Bytes of the avatar image. */
    readonly byteStore: LazyImageProps['byteStore'];
    /**
     * Additional decorations to place on the circular avatar's edge.
     */
    readonly charms?: AvatarCharm[];
    /** Color used as the backdrop. */
    readonly color: ProfilePictureColor;
    /** Description of the avatar, used for accessibility. */
    readonly description: string;
    /** Fallback initials if the image is not provided or unavailable. */
    readonly initials: string;
    /**
     * Whether the `Avatar` is clickable and should emit `on:click` events. Defaults to `true`.
     */
    readonly isClickable?: boolean;
    /**
     * Whether the `Avatar` is focusable (usually with the `Tab` key). Defaults to `true`. Note:
     * Doesn't have any effect if `isClickable` is set to `false`.
     */
    readonly isFocusable?: boolean;
    /** Size the avatar should render at. */
    readonly size: u53;
}

export interface AvatarCharm {
    readonly content: AnyCharmContent;
    /**
     * Offset of the charm from its default position (i.e., centered on the edge of the avatar at
     * the given `position`), in pixels. Defaults to `{x: 0, y: 0}`.
     */
    readonly offset?: {
        readonly x: u53;
        readonly y: u53;
    };
    /**
     * The position of the charm on the avatar's circle, between `0` and `360` degrees, measured
     * clockwise from the avatar's top center point. Defaults to `135`.
     */
    readonly position?: u53;
    /** Size the charm should render at, in pixels. Defaults to `16`. */
    readonly size?: u53;
    /**
     * Style of the charm. Defaults to type `cutout` with a gap of `2` pixels.
     */
    readonly style?: AnyCharmStyle;
}

type AnyCharmContent = IconCharmContent | TextCharmContent;

interface IconCharmContent {
    readonly type: 'icon';
    readonly icon: string;
    readonly description?: string;
    /**
     * The icon family to use. Defaults to `"threema"`.
     */
    readonly family?: 'material' | 'threema';
}

interface TextCharmContent {
    readonly type: 'text';
    readonly text: string;
}

type AnyCharmStyle = CutoutCharmStyle | OverlayCharmStyle;

interface BaseCharmStyle {
    /**
     * Background color of the charm. Note: Any valid CSS `background-color` value is allowed.
     * Defaults to `transparent`.
     */
    readonly backgroundColor?: string;
    /**
     * Content color of the charm. Note: Any valid CSS `color` value is allowed. Defaults to
     * `currentColor`.
     */
    readonly contentColor?: string;
}

interface CutoutCharmStyle extends BaseCharmStyle {
    readonly type: 'cutout';
    /**
     * Width of the transparent gap between the charm and avatar (i.e., the amount by which the
     * cutout's diameter is larger than the charm's), in pixels.
     */
    readonly gap: u53;
}

interface OverlayCharmStyle extends BaseCharmStyle {
    readonly type: 'overlay';
}
