/**
 * Lowercase hexadecimal lookup table indexed by nibble value (0–15).
 *
 * Shared internal helper for byte-to-hex conversions; not intended for direct use.
 */
// prettier-ignore
export const HEX_LOOKUP_TABLE = [
    '0', '1', '2', '3', '4', '5', '6', '7',
    '8', '9', 'a', 'b', 'c', 'd', 'e', 'f',
] as const;
