/**
 * The direction of the packet.
 */
export type PacketDirection = 'inbound' | 'outbound';

/**
 * The packet's content.
 */
export type PacketData = Record<string | number | symbol, unknown> | Uint8Array;

/**
 * Allows to filter packets to be displayed.
 */
export type PacketFilter = (packet: Packet, index: number, array: readonly Packet[]) => boolean;

/**
 * A packet which may be a plain JS object or bytes (Uint8Array) and its
 * associated metadata.
 */
export interface Packet {
    /**
     * The direction of the packet, i.e. whether it's inbound or outbound.
     */
    direction: PacketDirection;

    /**
     * The layer the packet has passed through.
     */
    layer: string;

    /**
     * Time when the packet has been received/sent.
     */
    timestamp: number;

    /**
     * An arbitrary name for the packet (e.g. its type).
     */
    name: string;

    /**
     * The packet's payload.
     */
    payload: PacketData;

    /**
     * Can be set to indicate that an error occured while handling the packet.
     */
    error?: string | undefined;
}
