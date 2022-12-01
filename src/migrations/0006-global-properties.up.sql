CREATE TABLE globalProperties (
    `uid` INTEGER PRIMARY KEY,
    `key` TEXT UNIQUE NOT NULL,
    `value` value BLOB NOT NULL
);