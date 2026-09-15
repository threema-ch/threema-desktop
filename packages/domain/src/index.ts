// Threema domain types, interfaces, and business objects.
// This package contains no DOM, Node, or Electron APIs — only plain TypeScript.

export type {DirectoryErrorType} from './types/directory.js';
export {
    ensureIdentityString,
    ensureNickname,
    isIdentityString,
    isNickname,
    type IdentityString,
    type Nickname,
} from './types/identity.js';
