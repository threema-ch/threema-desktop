import {byteToHex, byteToPrintableAscii} from '~/app/ui/svelte-components/utils/bytes';

/**
 * A tuple representing the offset, followed by an array tuple representing
 * each byte as hex and as printable ASCII.
 */
export type ParsedBytes = readonly [
    offset: string,
    byteRepresentations: readonly [hex: string, ascii: string][],
];

/**
 * Splits input into chunks of 16 bytes and converts them to their
 * hexadecimal and ASCII representation at once.
 */
export function parse(array: Uint8Array): readonly ParsedBytes[] {
    const padLength = Math.max(Math.max(array.byteLength - 1, 0).toString(16).length, 4);
    const rows: ParsedBytes[] = [];
    for (let offset = 0; offset < array.byteLength; offset += 16) {
        rows.push([
            offset.toString(16).padStart(padLength, '0'),
            Array.from(array.subarray(offset, offset + 16)).map((byte) => [
                byteToHex(byte),
                byteToPrintableAscii(byte),
            ]),
        ]);
    }
    return rows;
}
