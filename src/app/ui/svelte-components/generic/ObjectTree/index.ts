/**
 * An item that we can display in an ObjectTree component.
 */
export type TreeItem =
    | undefined
    // eslint-disable-next-line @typescript-eslint/ban-types
    | null
    | boolean
    | number
    | string
    | Record<string | number | symbol, unknown>
    | TreeItem[]
    | Uint8Array;

/**
 * The determined item's type string representation.
 */
export type TreeItemType =
    | 'undefined'
    | 'null'
    | 'Boolean'
    | 'Number'
    | 'String'
    | 'Object'
    | 'Array'
    | 'Uint8Array';

/**
 * Metadata determined by parsing an item.
 */
export interface TreeItemInfo {
    readonly type: TreeItemType;
    readonly display: {
        readonly type: boolean;
        readonly value?: string;
    };
    readonly length?: number;
    readonly children?: readonly [key: string, item: TreeItem][];
}

/**
 * Event data raised by the `expand` event.
 */
export type TreeExpandEvent = CustomEvent<{
    readonly object: TreeItem;
    readonly info: TreeItemInfo;
}>;

/**
 * Determine metadata of an object/item.
 * @param item The tree object to be parsed.
 * @returns Metadata associated to the parsed object.
 */
export function parse(item: TreeItem): TreeItemInfo {
    if (item === undefined) {
        return {type: 'undefined', display: {type: false, value: 'undefined'}};
    }
    if (item === null) {
        return {type: 'null', display: {type: false, value: 'null'}};
    }
    if (item.constructor === Boolean) {
        return {type: 'Boolean', display: {type: false, value: `${item}`}};
    }
    if (item.constructor === Number) {
        return {type: 'Number', display: {type: false, value: `${item}`}};
    }
    if (item.constructor === String) {
        return {
            type: 'String',
            display: {type: false, value: item},
            length: item.length,
        };
    }
    if (item.constructor === Object) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const object = {...(item as Record<string | number | symbol, any>)};
        const type = (object['__name__'] as TreeItemType | undefined) ?? 'Object';
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete object['__name__'];
        const children = Object.entries(object).sort(([a], [b]) => a.localeCompare(b));
        return {
            type,
            display: {type: true},
            length: children.length,
            children,
        };
    }
    if (item instanceof Array) {
        const children: readonly [key: string, item: TreeItem][] = item.map((child, index) => [
            `${index}`,
            child,
        ]);
        return {
            type: 'Array',
            display: {type: true},
            length: item.length,
            children,
        };
    }
    if (item instanceof Uint8Array) {
        return {
            type: 'Uint8Array',
            display: {type: true},
            length: item.byteLength,
        };
    }
    throw new Error(`ObjectTree cannot handle type '${typeof item}'`);
}
