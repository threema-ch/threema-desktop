import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import {CONSOLE_LOGGER} from '~/common/logging';
import {FileSystemKeyStorage} from '~/common/node/key-storage';

// TODO: Move into ~/common/node and use this in `backend-mocks.ts`
export function randomBytes<T extends ArrayBufferView>(buffer: T): T {
    // The Node.js crypto.getRandomValues API has a quota that cannot be exceeded, so we need to
    // call it continuously until the buffer has been filled. See:
    // https://nodejs.org/api/webcrypto.html#cryptogetrandomvaluestypedarray
    const array =
        buffer instanceof Uint8Array
            ? buffer
            : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const length = buffer.byteLength;
    for (let offset = 0; offset < length; offset += 65536) {
        crypto.getRandomValues(array.subarray(offset, offset + 65536));
    }
    return buffer;
}

function main(): void {
    // I just stole this from the tests, change this
    const appPath = fs.mkdtempSync(path.join(os.tmpdir(), 'threema-desktop-test-'));
    const keyStoragePath = path.join(appPath, 'key-storage.pb3');
    const keyStorage = new FileSystemKeyStorage(
        {
            crypto: new TweetNaClBackend(randomBytes),
        },
        CONSOLE_LOGGER,
        keyStoragePath,
    );
    CONSOLE_LOGGER.debug("Hi, I think I'm okay!", keyStorage);
}
main();
