/**
 * All strings (including `data`) are expected to be the hex representation of the byte array.
 */
export interface CryptoBoxTestCase {
    secretKey: string;
    publicKey: string;
    nonce: string;
    data: {
        plain: string;
        encryptedWithSecretKeyEncryption: string;
        encryptedWithPublicKeyEncryption: string;
    };
}

export const testCases: CryptoBoxTestCase[] = [
    {
        secretKey: '00'.repeat(32),
        publicKey: '00'.repeat(32),
        nonce: '00'.repeat(24),
        data: {
            plain: '00',
            encryptedWithSecretKeyEncryption: '42e45eb764a1b706d4776a849bc2526bc6',
            encryptedWithPublicKeyEncryption: 'a1b6d3b89a3b0d7babecaf1d9f21ba5387',
        },
    },
    {
        secretKey: '01'.repeat(32),
        publicKey: '00'.repeat(32),
        nonce: '00'.repeat(24),
        data: {
            plain: '00',
            encryptedWithSecretKeyEncryption: 'aa4f20a71316003ba2f60727f443d5e4de',
            encryptedWithPublicKeyEncryption: 'a1b6d3b89a3b0d7babecaf1d9f21ba5387',
        },
    },
    {
        secretKey: '00'.repeat(32),
        publicKey: '00'.repeat(32),
        nonce: '01'.repeat(24),
        data: {
            plain: '00',
            encryptedWithSecretKeyEncryption: '089f09cb7dc9ecea7169eca94228ecba50',
            encryptedWithPublicKeyEncryption: 'ece5f3db1c2eea81a1baf0e8054f81e51a',
        },
    },
    {
        secretKey: '1b35ed7e1ba9993171fe4a7eed30c2831905c3a583616d61e93782da900bf8ba',
        publicKey: 'ba3ff7104bf8e0e32f49717e639a8cb533530acace71d1d10d0bcef38847ac66',
        nonce: '8bd5ea94d8b3ed78c4111b35790b968b8ac89c4d9c19db15',
        data: {
            plain: '123abd',
            encryptedWithSecretKeyEncryption: '0b2e6d6435f6544ec82f12572aca6f222b30d0',
            encryptedWithPublicKeyEncryption: '0dfcab829dacfac306398a6821ee2a8a91e69d',
        },
    },
];
