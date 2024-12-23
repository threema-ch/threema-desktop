// This file has been generated by structbuf. Do not modify it!
import * as handshake from './handshake';
import * as payload from './payload';
export {handshake, payload};

/**
 * ## Connection Rendezvous Protocol
 *
 * Some mechanisms may request a 1:1 connection between two devices in order
 * to transmit data as direct as possible. Establishing such a connection
 * should always require user interaction.
 *
 * The authentication **handshake** for each connection path takes two round
 * trips with **nomination** of a specific path. Once nominated, arbitrary
 * encrypted payloads may be exchanged.
 *
 * ### Terminology
 *
 * - `RK`: Rendezvous Key
 * - `RID`: Rendezvous Initiator Device
 * - `RRD`: Rendezvous Responder Device
 * - `PID`: Path ID
 * - `RRDCK`: RRD's Path Cookie
 * - `RIDCK`: RID's Path Cookie
 * - `RRDSN`: RRD's Sequence Number
 * - `RIDSN`: RID's Sequence Number
 *
 * ### General Information
 *
 * Encryption format: An NaCl box with a 24 byte nonce.
 *
 * Nonce format:
 *
 * - the Path ID (PID, u32-le), followed by
 * - a 16 byte cookie (RRDCK/RIDCK), followed by
 * - a monotonically increasing sequence number (RRDSN/RIDSN, u32-le).
 *
 * Sequence number: The sequence number starts with `1` and is counted
 * separately for each direction (i.e. there is one sequence number counter for
 * the client and one for the server). We will use `RIDSN+` and `RRDSN+` in
 * this document to denote that the counter should be increased **after** the
 * value has been inserted (i.e. semantically equivalent to `x++` in many
 * languages).
 *
 * Sizes: The handshake uses concrete fixed struct sizes. After nomination of
 * a path, encrypted payloads can be up to 4 GiB.
 *
 * Framing: After the handshake and nomination, `payload.frame` is always
 * being used to frame the transmitted data even if the transport supports
 * datagrams. This intentionally allows to fragment a frame across multiple
 * datagrams (e.g. useful for limited APIs that cannot deliver data in a
 * streamed fashion).
 *
 * ### Path Matrix
 *
 * | Name              | Multiple Paths |
 * |-------------------|----------------|
 * | Direct TCP Server | Yes            |
 * | Relayed WebSocket | No             |
 *
 * ### Protocol Flow
 *
 * Connection paths are formed by transmitting a `rendezvous.RendezvousInit`
 * from RID to RRD as defined in the description of that message.
 *
 * The connections are then simultaneously established in the background and
 * each path must go through the handshake process with separate cookies and
 * challenges. While doing so, the peers measure the RTT between challenge
 * and response in order to determine a good path candidate for nomination.
 *
 * One of the peers (defined by the upper-level protocol) nominates one of
 * the established paths. Once nominated, both peers silently close all other
 * paths.
 *
 * ### Nomination
 *
 * After the `rendezvous.RendezvousInit` has been transferred by RID and
 * processed by RRD, it is recommended to nominate a path in the following
 * way:
 *
 * 1. Let `established` be the list of established connection paths.
 * 2. In the background with each connection becoming established, update
 *    `established` with the RTT that was measured during the handshake.
 * 3. Wait for the first connection path to become established.
 * 4. After a brief timeout (or on a specific user interaction), nominate the
 *    connection path in the following way, highest priority first:
 *    1. Path with the lowest RTT on a mutually unmetered, fast network
 *    2. Path with the lowest RTT on a mutually unmetered, slow network
 *    3. Path with the lowest RTT on any other network
 *
 * It is recommended to warn the user if a metered connection path has been
 * nominated in case large amounts of data are to be transmitted.
 */
