import {writable} from 'svelte/store';

import {type u32} from '~/common/types';

export interface Offset {
    left: u32;
    top: u32;
}

export interface RectPoint {
    x: 'left' | 'center' | 'right';
    y: 'top' | 'center' | 'bottom';
}

export const anchorElementStore = writable<HTMLElement | undefined>(undefined);

export function rectPointOffset(rect: DOMRect, {x, y}: RectPoint): Offset {
    const horizontalOffsetMap = {
        left: 0,
        center: rect.width / 2,
        right: rect.width,
    };

    const verticalOffsetMap = {
        top: 0,
        center: rect.height / 2,
        bottom: rect.height,
    };

    return {
        left: horizontalOffsetMap[x],
        top: verticalOffsetMap[y],
    };
}
