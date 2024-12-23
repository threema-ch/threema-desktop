// This file has been generated by structbuf. Do not modify it!
import * as e2e from './e2e.js';
import * as handshake from './handshake.js';
import * as payload from './payload.js';
export {e2e, handshake, payload};

/**
 * # Chat Server Protocol
 *
 * The Chat Server Protocol is a custom transport encrypted frame-based
 * protocol, originally designed to operate on top of TCP. it uses the NaCl
 * cryptography library to provide authentication, integrity and encryption.
 *
 * The login [**handshake**](ref:handshake) takes two round trips and
 * establishes ephemeral encryption keys along the way. Authentication is
 * solely based on the secret key associated to a Threema ID.
 *
 * After the handshake process, [**payloads**](ref:payload) can be exchanged
 * bidirectionally although some payload structs may only be used in one
 * direction. A client may now send and receive end-to-end encrypted
 * [**messages**](ref:e2e) (wrapped in [message payload
 * structs](ref:payload.container)).
 *
 * ## Terminology
 *
 * - `CK`: Client Key (permanent secret key associated to the Threema ID)
 * - `SK`: Permanent Server Key
 * - `TCK`: Temporary Client Key
 * - `TSK`: Temporary Server Key
 * - `CCK`: Client Connection Cookie
 * - `SCK`: Server Connection Cookie
 * - `CSN`: Client Sequence Number
 * - `SSN`: Server Sequence Number
 * - `ID`: The client's Threema ID
 *
 * ## General Information
 *
 * **Endianness:** All integers use little-endian encoding.
 *
 * **Encryption cipher:** XSalsa20-Poly1305, unless otherwise specified.
 *
 * **Nonce format:**
 *
 * - a 16 byte cookie (CCK/SCK), followed by
 * - a monotonically increasing sequence number (CSN/SSN, u64-le).
 *
 * **Sequence number:** The sequence number starts with `1` and is counted
 * separately for each direction (i.e. there is one sequence number counter for
 * the client and one for the server). We will use `CSN+` and `SSN+` in this
 * document to denote that the counter should be increased **after** the value
 * has been inserted (i.e. semantically equivalent to `x++` in many languages).
 *
 * ## Size Limitations
 *
 * The chat server protocol currently allows for up to 8192 bytes within a
 * single frame. To elaborate this down to end-to-end encrypted messages,
 * the limitations are:
 *
 * - 8192 bytes for frames in total,
 * - 8176 bytes for a payload container struct, before applying transport
 *   encryption,
 * - 8172 bytes for a payload struct, before wrapping it with a container,
 * - 8084 bytes for a message payload struct's box, after encryption of a
 *   message struct,
 * - 7812 bytes minimum and 8066 bytes maximum (due to the random padding of
 *   1 to 255 bytes) for an end-to-end encrypted message struct.
 */
