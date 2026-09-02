import CallViewRoot from './CallView.svelte';
import Control from './Control.svelte';

export type {CallViewFeed, CallViewProps} from './CallView.svelte';
export type {FeedLabels, FeedSize} from './Feed.svelte';
export type {ControlProps} from './Control.svelte';

/**
 * The contents of a call panel, with `CallView.Control` as the controls it is operated by (see
 * `CallView.svelte`).
 */
// Components are named in `PascalCase`, unlike other variables and properties.
//
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CallView = Object.assign(CallViewRoot, {Control});
