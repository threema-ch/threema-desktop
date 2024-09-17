import type {TransitionConfig} from 'svelte/transition';

import type {f64} from '~/common/types';

/**
 * A custom, CSP-safe, Svelte fly-in/-out transition.
 */
// eslint-disable-next-line func-style, func-names
export const fly = function (
    node: HTMLElement,
    config?: Omit<TransitionConfig, 'css' | 'tick'> & {x?: f64; y?: f64; opacity?: f64},
): TransitionConfig {
    const {x = 0, y = 0, ...rest} = config ?? {};

    return {
        ...rest,
        tick: (t, u) => {
            node.style.setProperty('transform', `translate(${x * u}px, ${y * u}px)`);
        },
    };
};
