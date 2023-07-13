CREATE TABLE nonces (
    `uid` INTEGER PRIMARY KEY,
    `scope` INTEGER NOT NULL,
    `nonce` value BLOB NOT NULL,

    -- A nonce may only exist once per scope.
    UNIQUE (scope, nonce)
);