const MOCK_WSS_URL = 'wss://127.0.0.1';
const MOCK_URL = 'https://127.0.0.1:9999/';
export const MOCK_OPPF = {
    license: {
        expires: '2024-12-01',
        count: 1000,
        id: 'opt-o00-5',
    },
    blob: {
        uploadUrl: MOCK_URL,
        downloadUrl: MOCK_URL,
        doneUrl: MOCK_URL,
    },
    publicKeyPinning: [
        {
            spkis: [
                {
                    value: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
                    algorithm: 'sha256',
                },
            ],
            domain: '*test.ch',
        },
    ],
    work: {url: MOCK_URL},
    chat: {publicKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='},
    signatureKey: 'VR4nTeVFeao9TcIJn5KxMsuW6Lc4gMC+j8z//zngvNs=',
    safe: {
        rendezvous: {url: MOCK_WSS_URL},
        mediator: {
            blob: {
                uploadUrl: MOCK_URL,
                downloadUrl: MOCK_URL,
                doneUrl: MOCK_URL,
            },
            url: MOCK_WSS_URL,
        },
        url: MOCK_URL,
    },
    refresh: 86400,
    avatar: {url: MOCK_URL},
    updates: {desktop: {check: MOCK_URL}},
    version: '1',
    directory: {url: MOCK_URL},
    mediator: {
        blob: {
            uploadUrl: MOCK_URL,
            downloadUrl: MOCK_URL,
            doneUrl: MOCK_URL,
        },
        url: MOCK_WSS_URL,
    },
    rendezvous: {url: MOCK_WSS_URL},
};

export const CORRECT_OPPF_STRING = `{
    "work": {"url": "https://127.0.0.1:9999/"},
    "refresh": 86400,
    "avatar": {"url": "https://127.0.0.1:9999/"},
    "updates": {"desktop": {"check": "https://127.0.0.1:9999/"}},
    "version": "1",
    "directory": {"url": "https://127.0.0.1:9999/"},
    "license": {
        "expires": "2024-12-01",
        "count": 1000,
        "id": "opt-o00-5"
    },
    "blob": {
        "uploadUrl": "https://127.0.0.1:9999/",
        "downloadUrl": "https://127.0.0.1:9999/",
        "doneUrl": "https://127.0.0.1:9999/"
    },
    "publicKeyPinning": [{
        "spkis": [{
            "value": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "algorithm": "sha256"
        }],
        "domain": "*test.ch"
    }],
    "chat": {"publicKey": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="},
    "signatureKey": "VR4nTeVFeao9TcIJn5KxMsuW6Lc4gMC+j8z//zngvNs=",
    "safe": {
        "rendezvous": {"url": "wss://127.0.0.1"},
        "mediator": {
            "blob": {
                "uploadUrl": "https://127.0.0.1:9999/",
                "downloadUrl": "https://127.0.0.1:9999/",
                "doneUrl": "https://127.0.0.1:9999/"
            },
            "url": "wss://127.0.0.1"
        },
        "url": "https://127.0.0.1:9999/"
    },
    "rendezvous": {"url": "wss://127.0.0.1"},
    "mediator": {
        "blob": {
            "uploadUrl": "https://127.0.0.1:9999/",
            "downloadUrl": "https://127.0.0.1:9999/",
            "doneUrl": "https://127.0.0.1:9999/"
        },
        "url": "wss://127.0.0.1"
    }
}
nK5pc1kHwwH4xWqo4LquaZfuDMOzhgPzjRMgK6B3ype9W3xI2DK+eyHUbaxfQcgGlSFbFxQj++3mFFjnymvJBA==`;

export const WRONG_OPPF_SIGNATURE_STRING = `{
    "work": {"url": "https://127.0.0.1:9999/"},
    "refresh": 86400,
    "avatar": {"url": "https://127.0.0.1:9999/"},
    "updates": {"desktop": {"check": "https://127.0.0.1:9999/"}},
    "version": "1",
    "directory": {"url": "https://127.0.0.1:9999/"},
    "license": {
        "expires": "2024-12-01",
        "count": 1000,
        "id": "opt-o00-5"
    },
    "blob": {
        "uploadUrl": "https://127.0.0.1:9999/",
        "downloadUrl": "https://127.0.0.1:9999/",
        "doneUrl": "https://127.0.0.1:9999/"
    },
    "publicKeyPinning": [{
        "spkis": [{
            "value": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "algorithm": "sha256"
        }],
        "domain": "*test.ch"
    }],
    "chat": {"publicKey": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="},
    "signatureKey": "VR4nTeVFeao9TcIJn5KaMsuW6Lc4gMC+j8z//zngvNs=",
    "safe": {
        "rendezvous": {"url": "wss://127.0.0.1"},
        "mediator": {
            "blob": {
                "uploadUrl": "https://127.0.0.1:9999/",
                "downloadUrl": "https://127.0.0.1:9999/",
                "doneUrl": "https://127.0.0.1:9999/"
            },
            "url": "wss://127.0.0.1"
        },
        "url": "https://127.0.0.1:9999/"
    },
    "rendezvous": {"url": "wss://127.0.0.1"},
    "mediator": {
        "blob": {
            "uploadUrl": "https://127.0.0.1:9999/",
            "downloadUrl": "https://127.0.0.1:9999/",
            "doneUrl": "https://127.0.0.1:9999/"
        },
        "url": "wss://127.0.0.1"
    }
}
nK5pc1kHwwH4xWqo4LquaZfuDMOzhgPzjRMgK6B3ype9W3xI2DK+eyHUbaxfQcgGlSFbFxQj++3mFFjnymvJBA==`;

export const LICENSE_EXPIRED_STRING = `{
    "work": {"url": "https://127.0.0.1:9999/"},
    "refresh": 86400,
    "avatar": {"url": "https://127.0.0.1:9999/"},
    "updates": {"desktop": {"check": "https://127.0.0.1:9999/"}},
    "version": "1",
    "directory": {"url": "https://127.0.0.1:9999/"},
    "license": {
        "expires": "1970-12-01",
        "count": 1000,
        "id": "opt-o00-5"
    },
    "blob": {
        "uploadUrl": "https://127.0.0.1:9999/",
        "downloadUrl": "https://127.0.0.1:9999/",
        "doneUrl": "https://127.0.0.1:9999/"
    },
    "publicKeyPinning": [{
        "spkis": [{
            "value": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "algorithm": "sha256"
        }],
        "domain": "*test.ch"
    }],
    "chat": {"publicKey": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="},
    "signatureKey": "VR4nTeVFeao9TcIJn5KxMsuW6Lc4gMC+j8z//zngvNs=",
    "safe": {
        "rendezvous": {"url": "wss://127.0.0.1"},
        "mediator": {
            "blob": {
                "uploadUrl": "https://127.0.0.1:9999/",
                "downloadUrl": "https://127.0.0.1:9999/",
                "doneUrl": "https://127.0.0.1:9999/"
            },
            "url": "wss://127.0.0.1"
        },
        "url": "https://127.0.0.1:9999/"
    },
    "rendezvous": {"url": "wss://127.0.0.1"},
    "mediator": {
        "blob": {
            "uploadUrl": "https://127.0.0.1:9999/",
            "downloadUrl": "https://127.0.0.1:9999/",
            "doneUrl": "https://127.0.0.1:9999/"
        },
        "url": "wss://127.0.0.1"
    }
}
xO6QtohQlcnuzrTMBlnK3R2zP0dnoYKcP7qb5IkC2GDQrQ6A/u9uluJDf+ylRwQ+p7UKp/wnRS5tM3xeqQoBDg==`;
