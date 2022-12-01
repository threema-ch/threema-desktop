import {type PublicKey} from '~/common/crypto';
import {bytesToHex} from '~/common/utils/byte';

/**
 * Visualize a 32 bit public key in an 8x8 hex grid.
 *
 * Return a string containing newlines.
 */
export function publicKeyGrid(publicKey: PublicKey): string {
    const hex = bytesToHex(publicKey);
    let grid = '';
    for (let i = 0; i < hex.length; i++) {
        // Prepend a newline if end of row is reached
        if (i % 8 === 0 && i > 0 && i < 63) {
            grid += '\n';
        }

        // Prepend a space if this isn't the first char of a row
        if (i % 8 > 0) {
            grid += ' ';
        }

        // Add hex character
        grid += hex[i];
    }
    return grid;
}
