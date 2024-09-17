import {expoOut} from 'svelte/easing';
import type {TransitionConfig} from 'svelte/transition';

/**
 * A custom, CSP-safe, Svelte scale-in/-out transition.
 */
// eslint-disable-next-line func-style, func-names
export const scale = function (
    node: HTMLElement,
    config?: Omit<TransitionConfig, 'css' | 'tick'>,
): TransitionConfig {
    return {
        ...config,
        duration: config?.duration ?? 200,
        easing: config?.easing ?? expoOut,
        tick: (t, u) => {
            node.style.setProperty('transform', `scale3d(${t}, ${t}, ${t})`);
        },
    };
};
