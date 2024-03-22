import type Long from "long";
import type * as types from "~/common/types";
import type * as tag from "../tag";
import * as $protobuf from "protobufjs";
/** Namespace common. */
export namespace common {
    /** Properties of an Unit. */
    interface IUnit {
    }
    type UnitEncodable = types.WeakOpaque<IUnit, {
        readonly UnitEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an Unit. */
    class Unit implements IUnit {
        /**
         * Constructs a new Unit.
         * @param [properties] Properties to set
         */
        constructor(properties?: common.IUnit);
        /**
         * Encodes the specified Unit message. Does not implicitly {@link common.Unit.verify|verify} messages.
         * @param message Unit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: common.UnitEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an Unit message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Unit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): common.Unit;
    }
    /** Properties of a Blob. */
    interface IBlob {
        /** Blob id */
        id?: (Uint8Array | null);
        /** Blob nonce */
        nonce?: (Uint8Array | null);
        /** Blob key */
        key?: (Uint8Array | null);
        /** Blob uploadedAt */
        uploadedAt?: (Long | null);
    }
    type BlobEncodable = types.WeakOpaque<IBlob, {
        readonly BlobEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a Blob. */
    class Blob implements IBlob {
        /**
         * Constructs a new Blob.
         * @param [properties] Properties to set
         */
        constructor(properties?: common.IBlob);
        /** Blob id. */
        public id: Uint8Array;
        /** Blob nonce. */
        public nonce: Uint8Array;
        /** Blob key. */
        public key: Uint8Array;
        /** Blob uploadedAt. */
        public uploadedAt: Long;
        /**
         * Encodes the specified Blob message. Does not implicitly {@link common.Blob.verify|verify} messages.
         * @param message Blob message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: common.BlobEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Blob message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Blob
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): common.Blob;
    }
    /** Properties of a BlobData. */
    interface IBlobData {
        /** BlobData id */
        id?: (Uint8Array | null);
        /** BlobData data */
        data?: (Uint8Array | null);
    }
    type BlobDataEncodable = types.WeakOpaque<IBlobData, {
        readonly BlobDataEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a BlobData. */
    class BlobData implements IBlobData {
        /**
         * Constructs a new BlobData.
         * @param [properties] Properties to set
         */
        constructor(properties?: common.IBlobData);
        /** BlobData id. */
        public id: Uint8Array;
        /** BlobData data. */
        public data: Uint8Array;
        /**
         * Encodes the specified BlobData message. Does not implicitly {@link common.BlobData.verify|verify} messages.
         * @param message BlobData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: common.BlobDataEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a BlobData message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BlobData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): common.BlobData;
    }
    /** Properties of an Image. */
    interface IImage {
        /** Image type */
        type?: (common.Image.Type | null);
        /** Image blob */
        blob?: (common.Blob | null);
    }
    type ImageEncodable = types.WeakOpaque<IImage, {
        readonly ImageEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an Image. */
    class Image implements IImage {
        /**
         * Constructs a new Image.
         * @param [properties] Properties to set
         */
        constructor(properties?: common.IImage);
        /** Image type. */
        public type: common.Image.Type;
        /** Image blob. */
        public blob?: (common.Blob | null);
        /**
         * Encodes the specified Image message. Does not implicitly {@link common.Image.verify|verify} messages.
         * @param message Image message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: common.ImageEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an Image message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Image
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): common.Image;
    }
    namespace Image {
        /** Type enum. */
        enum Type {
            JPEG = 0
        }
    }
    /** Properties of a GroupIdentity. */
    interface IGroupIdentity {
        /** GroupIdentity groupId */
        groupId?: (Long | null);
        /** GroupIdentity creatorIdentity */
        creatorIdentity?: (string | null);
    }
    type GroupIdentityEncodable = types.WeakOpaque<IGroupIdentity, {
        readonly GroupIdentityEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a GroupIdentity. */
    class GroupIdentity implements IGroupIdentity {
        /**
         * Constructs a new GroupIdentity.
         * @param [properties] Properties to set
         */
        constructor(properties?: common.IGroupIdentity);
        /** GroupIdentity groupId. */
        public groupId: Long;
        /** GroupIdentity creatorIdentity. */
        public creatorIdentity: string;
        /**
         * Encodes the specified GroupIdentity message. Does not implicitly {@link common.GroupIdentity.verify|verify} messages.
         * @param message GroupIdentity message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: common.GroupIdentityEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a GroupIdentity message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GroupIdentity
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): common.GroupIdentity;
    }
    /** Properties of a DeltaImage. */
    interface IDeltaImage {
        /** DeltaImage removed */
        removed?: (common.Unit | null);
        /** DeltaImage updated */
        updated?: (common.Image | null);
    }
    type DeltaImageEncodable = types.WeakOpaque<IDeltaImage, {
        readonly DeltaImageEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a DeltaImage. */
    class DeltaImage implements IDeltaImage {
        /**
         * Constructs a new DeltaImage.
         * @param [properties] Properties to set
         */
        constructor(properties?: common.IDeltaImage);
        /** DeltaImage removed. */
        public removed?: (common.Unit | null);
        /** DeltaImage updated. */
        public updated?: (common.Image | null);
        /** DeltaImage image. */
        public image?: ("removed" | "updated");
        /**
         * Encodes the specified DeltaImage message. Does not implicitly {@link common.DeltaImage.verify|verify} messages.
         * @param message DeltaImage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: common.DeltaImageEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a DeltaImage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DeltaImage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): common.DeltaImage;
    }
    /** Properties of a Timespan. */
    interface ITimespan {
        /** Timespan from */
        from?: (Long | null);
        /** Timespan to */
        to?: (Long | null);
    }
    type TimespanEncodable = types.WeakOpaque<ITimespan, {
        readonly TimespanEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a Timespan. */
    class Timespan implements ITimespan {
        /**
         * Constructs a new Timespan.
         * @param [properties] Properties to set
         */
        constructor(properties?: common.ITimespan);
        /** Timespan from. */
        public from: Long;
        /** Timespan to. */
        public to: Long;
        /**
         * Encodes the specified Timespan message. Does not implicitly {@link common.Timespan.verify|verify} messages.
         * @param message Timespan message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: common.TimespanEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Timespan message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Timespan
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): common.Timespan;
    }
    /** Properties of an Identities. */
    interface IIdentities {
        /** Identities identities */
        identities?: (readonly string[] | null);
    }
    type IdentitiesEncodable = types.WeakOpaque<IIdentities, {
        readonly IdentitiesEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an Identities. */
    class Identities implements IIdentities {
        /**
         * Constructs a new Identities.
         * @param [properties] Properties to set
         */
        constructor(properties?: common.IIdentities);
        /** Identities identities. */
        public identities: readonly string[];
        /**
         * Encodes the specified Identities message. Does not implicitly {@link common.Identities.verify|verify} messages.
         * @param message Identities message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: common.IdentitiesEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an Identities message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Identities
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): common.Identities;
    }
    /** Properties of a Resolution. */
    interface IResolution {
        /** Resolution width */
        width?: (number | null);
        /** Resolution height */
        height?: (number | null);
    }
    type ResolutionEncodable = types.WeakOpaque<IResolution, {
        readonly ResolutionEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a Resolution. */
    class Resolution implements IResolution {
        /**
         * Constructs a new Resolution.
         * @param [properties] Properties to set
         */
        constructor(properties?: common.IResolution);
        /** Resolution width. */
        public width: number;
        /** Resolution height. */
        public height: number;
        /**
         * Encodes the specified Resolution message. Does not implicitly {@link common.Resolution.verify|verify} messages.
         * @param message Resolution message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: common.ResolutionEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Resolution message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Resolution
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): common.Resolution;
    }
    /** CspFeatureMaskFlag enum. */
    enum CspFeatureMaskFlag {
        NONE = 0,
        VOICE_MESSAGE_SUPPORT = 1,
        GROUP_SUPPORT = 2,
        POLL_SUPPORT = 4,
        FILE_MESSAGE_SUPPORT = 8,
        O2O_AUDIO_CALL_SUPPORT = 16,
        O2O_VIDEO_CALL_SUPPORT = 32,
        FORWARD_SECURITY_SUPPORT = 64,
        GROUP_CALL_SUPPORT = 128,
        EDIT_MESSAGE_SUPPORT = 256,
        DELETE_MESSAGE_SUPPORT = 512
    }
    /** CspE2eMessageType enum. */
    enum CspE2eMessageType {
        _INVALID_TYPE = 0,
        EMPTY = 252,
        TEXT = 1,
        DEPRECATED_IMAGE = 2,
        LOCATION = 16,
        DEPRECATED_AUDIO = 20,
        DEPRECATED_VIDEO = 19,
        FILE = 23,
        POLL_SETUP = 21,
        POLL_VOTE = 22,
        CALL_OFFER = 96,
        CALL_ANSWER = 97,
        CALL_ICE_CANDIDATE = 98,
        CALL_HANGUP = 99,
        CALL_RINGING = 100,
        DELIVERY_RECEIPT = 128,
        TYPING_INDICATOR = 144,
        EDIT_MESSAGE = 145,
        DELETE_MESSAGE = 146,
        CONTACT_SET_PROFILE_PICTURE = 24,
        CONTACT_DELETE_PROFILE_PICTURE = 25,
        CONTACT_REQUEST_PROFILE_PICTURE = 26,
        GROUP_JOIN_REQUEST = 77,
        GROUP_JOIN_RESPONSE = 78,
        GROUP_SETUP = 74,
        GROUP_NAME = 75,
        GROUP_LEAVE = 76,
        GROUP_SET_PROFILE_PICTURE = 80,
        GROUP_DELETE_PROFILE_PICTURE = 84,
        GROUP_SYNC_REQUEST = 81,
        GROUP_CALL_START = 79,
        GROUP_TEXT = 65,
        GROUP_LOCATION = 66,
        GROUP_IMAGE = 67,
        GROUP_AUDIO = 69,
        GROUP_VIDEO = 68,
        GROUP_FILE = 70,
        GROUP_POLL_SETUP = 82,
        GROUP_POLL_VOTE = 83,
        GROUP_DELIVERY_RECEIPT = 129,
        GROUP_EDIT_MESSAGE = 147,
        GROUP_DELETE_MESSAGE = 148,
        FORWARD_SECURITY_ENVELOPE = 160,
        WEB_SESSION_RESUME = 254
    }
}
/** Namespace csp_e2e_fs. */
export namespace csp_e2e_fs {
    /** Version enum. */
    enum Version {
        UNSPECIFIED = 0,
        V1_0 = 256,
        V1_1 = 257,
        V1_2 = 258
    }
    /** Properties of a VersionRange. */
    interface IVersionRange {
        /** VersionRange min */
        min?: (number | null);
        /** VersionRange max */
        max?: (number | null);
    }
    type VersionRangeEncodable = types.WeakOpaque<IVersionRange, {
        readonly VersionRangeEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a VersionRange. */
    class VersionRange implements IVersionRange {
        /**
         * Constructs a new VersionRange.
         * @param [properties] Properties to set
         */
        constructor(properties?: csp_e2e_fs.IVersionRange);
        /** VersionRange min. */
        public min: number;
        /** VersionRange max. */
        public max: number;
        /**
         * Encodes the specified VersionRange message. Does not implicitly {@link csp_e2e_fs.VersionRange.verify|verify} messages.
         * @param message VersionRange message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: csp_e2e_fs.VersionRangeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a VersionRange message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns VersionRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e_fs.VersionRange;
    }
    /** Properties of an Envelope. */
    interface IEnvelope {
        /** Envelope sessionId */
        sessionId?: (Uint8Array | null);
        /** Envelope init */
        init?: (csp_e2e_fs.Init | null);
        /** Envelope accept */
        accept?: (csp_e2e_fs.Accept | null);
        /** Envelope reject */
        reject?: (csp_e2e_fs.Reject | null);
        /** Envelope terminate */
        terminate?: (csp_e2e_fs.Terminate | null);
        /** Envelope encapsulated */
        encapsulated?: (csp_e2e_fs.Encapsulated | null);
    }
    type EnvelopeEncodable = types.WeakOpaque<IEnvelope, {
        readonly EnvelopeEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an Envelope. */
    class Envelope implements IEnvelope {
        /**
         * Constructs a new Envelope.
         * @param [properties] Properties to set
         */
        constructor(properties?: csp_e2e_fs.IEnvelope);
        /** Envelope sessionId. */
        public sessionId: Uint8Array;
        /** Envelope init. */
        public init?: (csp_e2e_fs.Init | null);
        /** Envelope accept. */
        public accept?: (csp_e2e_fs.Accept | null);
        /** Envelope reject. */
        public reject?: (csp_e2e_fs.Reject | null);
        /** Envelope terminate. */
        public terminate?: (csp_e2e_fs.Terminate | null);
        /** Envelope encapsulated. */
        public encapsulated?: (csp_e2e_fs.Encapsulated | null);
        /** Envelope content. */
        public content?: ("init" | "accept" | "reject" | "terminate" | "encapsulated");
        /**
         * Encodes the specified Envelope message. Does not implicitly {@link csp_e2e_fs.Envelope.verify|verify} messages.
         * @param message Envelope message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: csp_e2e_fs.EnvelopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an Envelope message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Envelope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e_fs.Envelope;
    }
    /** Properties of an Init. */
    interface IInit {
        /** Init supportedVersion */
        supportedVersion?: (csp_e2e_fs.VersionRange | null);
        /** Init fssk */
        fssk?: (Uint8Array | null);
    }
    type InitEncodable = types.WeakOpaque<IInit, {
        readonly InitEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an Init. */
    class Init implements IInit {
        /**
         * Constructs a new Init.
         * @param [properties] Properties to set
         */
        constructor(properties?: csp_e2e_fs.IInit);
        /** Init supportedVersion. */
        public supportedVersion?: (csp_e2e_fs.VersionRange | null);
        /** Init fssk. */
        public fssk: Uint8Array;
        /**
         * Encodes the specified Init message. Does not implicitly {@link csp_e2e_fs.Init.verify|verify} messages.
         * @param message Init message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: csp_e2e_fs.InitEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an Init message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Init
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e_fs.Init;
    }
    /** Properties of an Accept. */
    interface IAccept {
        /** Accept supportedVersion */
        supportedVersion?: (csp_e2e_fs.VersionRange | null);
        /** Accept fssk */
        fssk?: (Uint8Array | null);
    }
    type AcceptEncodable = types.WeakOpaque<IAccept, {
        readonly AcceptEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an Accept. */
    class Accept implements IAccept {
        /**
         * Constructs a new Accept.
         * @param [properties] Properties to set
         */
        constructor(properties?: csp_e2e_fs.IAccept);
        /** Accept supportedVersion. */
        public supportedVersion?: (csp_e2e_fs.VersionRange | null);
        /** Accept fssk. */
        public fssk: Uint8Array;
        /**
         * Encodes the specified Accept message. Does not implicitly {@link csp_e2e_fs.Accept.verify|verify} messages.
         * @param message Accept message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: csp_e2e_fs.AcceptEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an Accept message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Accept
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e_fs.Accept;
    }
    /** Properties of a Reject. */
    interface IReject {
        /** Reject messageId */
        messageId?: (Long | null);
        /** Reject groupIdentity */
        groupIdentity?: (common.GroupIdentity | null);
        /** Reject cause */
        cause?: (csp_e2e_fs.Reject.Cause | null);
    }
    type RejectEncodable = types.WeakOpaque<IReject, {
        readonly RejectEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a Reject. */
    class Reject implements IReject {
        /**
         * Constructs a new Reject.
         * @param [properties] Properties to set
         */
        constructor(properties?: csp_e2e_fs.IReject);
        /** Reject messageId. */
        public messageId: Long;
        /** Reject groupIdentity. */
        public groupIdentity?: (common.GroupIdentity | null);
        /** Reject cause. */
        public cause: csp_e2e_fs.Reject.Cause;
        /**
         * Encodes the specified Reject message. Does not implicitly {@link csp_e2e_fs.Reject.verify|verify} messages.
         * @param message Reject message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: csp_e2e_fs.RejectEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Reject message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Reject
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e_fs.Reject;
    }
    namespace Reject {
        /** Cause enum. */
        enum Cause {
            STATE_MISMATCH = 0,
            UNKNOWN_SESSION = 1,
            DISABLED_BY_LOCAL = 2
        }
    }
    /** Properties of a Terminate. */
    interface ITerminate {
        /** Terminate cause */
        cause?: (csp_e2e_fs.Terminate.Cause | null);
    }
    type TerminateEncodable = types.WeakOpaque<ITerminate, {
        readonly TerminateEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a Terminate. */
    class Terminate implements ITerminate {
        /**
         * Constructs a new Terminate.
         * @param [properties] Properties to set
         */
        constructor(properties?: csp_e2e_fs.ITerminate);
        /** Terminate cause. */
        public cause: csp_e2e_fs.Terminate.Cause;
        /**
         * Encodes the specified Terminate message. Does not implicitly {@link csp_e2e_fs.Terminate.verify|verify} messages.
         * @param message Terminate message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: csp_e2e_fs.TerminateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Terminate message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Terminate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e_fs.Terminate;
    }
    namespace Terminate {
        /** Cause enum. */
        enum Cause {
            UNKNOWN_SESSION = 0,
            RESET = 1,
            DISABLED_BY_LOCAL = 2,
            DISABLED_BY_REMOTE = 3
        }
    }
    /** Properties of an Encapsulated. */
    interface IEncapsulated {
        /** Encapsulated dhType */
        dhType?: (csp_e2e_fs.Encapsulated.DHType | null);
        /** Encapsulated counter */
        counter?: (Long | null);
        /** Encapsulated offeredVersion */
        offeredVersion?: (number | null);
        /** Encapsulated appliedVersion */
        appliedVersion?: (number | null);
        /** Encapsulated groupIdentity */
        groupIdentity?: (common.GroupIdentity | null);
        /** Encapsulated encryptedInner */
        encryptedInner?: (Uint8Array | null);
    }
    type EncapsulatedEncodable = types.WeakOpaque<IEncapsulated, {
        readonly EncapsulatedEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an Encapsulated. */
    class Encapsulated implements IEncapsulated {
        /**
         * Constructs a new Encapsulated.
         * @param [properties] Properties to set
         */
        constructor(properties?: csp_e2e_fs.IEncapsulated);
        /** Encapsulated dhType. */
        public dhType: csp_e2e_fs.Encapsulated.DHType;
        /** Encapsulated counter. */
        public counter: Long;
        /** Encapsulated offeredVersion. */
        public offeredVersion: number;
        /** Encapsulated appliedVersion. */
        public appliedVersion: number;
        /** Encapsulated groupIdentity. */
        public groupIdentity?: (common.GroupIdentity | null);
        /** Encapsulated encryptedInner. */
        public encryptedInner: Uint8Array;
        /**
         * Encodes the specified Encapsulated message. Does not implicitly {@link csp_e2e_fs.Encapsulated.verify|verify} messages.
         * @param message Encapsulated message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: csp_e2e_fs.EncapsulatedEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an Encapsulated message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Encapsulated
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e_fs.Encapsulated;
    }
    namespace Encapsulated {
        /** DHType enum. */
        enum DHType {
            TWODH = 0,
            FOURDH = 1
        }
    }
}
/** Namespace csp_e2e. */
export namespace csp_e2e {
    /** Properties of a MessageMetadata. */
    interface IMessageMetadata {
        /** MessageMetadata padding */
        padding?: (Uint8Array | null);
        /** MessageMetadata messageId */
        messageId?: (Long | null);
        /** MessageMetadata createdAt */
        createdAt?: (Long | null);
        /** MessageMetadata nickname */
        nickname?: (string | null);
    }
    type MessageMetadataEncodable = types.WeakOpaque<IMessageMetadata, {
        readonly MessageMetadataEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a MessageMetadata. */
    class MessageMetadata implements IMessageMetadata {
        /**
         * Constructs a new MessageMetadata.
         * @param [properties] Properties to set
         */
        constructor(properties?: csp_e2e.IMessageMetadata);
        /** MessageMetadata padding. */
        public padding: Uint8Array;
        /** MessageMetadata messageId. */
        public messageId: Long;
        /** MessageMetadata createdAt. */
        public createdAt: Long;
        /** MessageMetadata nickname. */
        public nickname?: (string | null);
        /** MessageMetadata _nickname. */
        public _nickname?: "nickname";
        /**
         * Encodes the specified MessageMetadata message. Does not implicitly {@link csp_e2e.MessageMetadata.verify|verify} messages.
         * @param message MessageMetadata message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: csp_e2e.MessageMetadataEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a MessageMetadata message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns MessageMetadata
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e.MessageMetadata;
    }
    /** Properties of an EditMessage. */
    interface IEditMessage {
        /** EditMessage messageId */
        messageId?: (Long | null);
        /** EditMessage text */
        text?: (string | null);
    }
    type EditMessageEncodable = types.WeakOpaque<IEditMessage, {
        readonly EditMessageEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an EditMessage. */
    class EditMessage implements IEditMessage {
        /**
         * Constructs a new EditMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: csp_e2e.IEditMessage);
        /** EditMessage messageId. */
        public messageId: Long;
        /** EditMessage text. */
        public text: string;
        /**
         * Encodes the specified EditMessage message. Does not implicitly {@link csp_e2e.EditMessage.verify|verify} messages.
         * @param message EditMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: csp_e2e.EditMessageEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an EditMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns EditMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e.EditMessage;
    }
    /** Properties of a DeleteMessage. */
    interface IDeleteMessage {
        /** DeleteMessage messageId */
        messageId?: (Long | null);
    }
    type DeleteMessageEncodable = types.WeakOpaque<IDeleteMessage, {
        readonly DeleteMessageEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a DeleteMessage. */
    class DeleteMessage implements IDeleteMessage {
        /**
         * Constructs a new DeleteMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: csp_e2e.IDeleteMessage);
        /** DeleteMessage messageId. */
        public messageId: Long;
        /**
         * Encodes the specified DeleteMessage message. Does not implicitly {@link csp_e2e.DeleteMessage.verify|verify} messages.
         * @param message DeleteMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: csp_e2e.DeleteMessageEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a DeleteMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DeleteMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e.DeleteMessage;
    }
    /** Properties of a GroupCallStart. */
    interface IGroupCallStart {
        /** GroupCallStart protocolVersion */
        protocolVersion?: (number | null);
        /** GroupCallStart gck */
        gck?: (Uint8Array | null);
        /** GroupCallStart sfuBaseUrl */
        sfuBaseUrl?: (string | null);
    }
    type GroupCallStartEncodable = types.WeakOpaque<IGroupCallStart, {
        readonly GroupCallStartEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a GroupCallStart. */
    class GroupCallStart implements IGroupCallStart {
        /**
         * Constructs a new GroupCallStart.
         * @param [properties] Properties to set
         */
        constructor(properties?: csp_e2e.IGroupCallStart);
        /** GroupCallStart protocolVersion. */
        public protocolVersion: number;
        /** GroupCallStart gck. */
        public gck: Uint8Array;
        /** GroupCallStart sfuBaseUrl. */
        public sfuBaseUrl: string;
        /**
         * Encodes the specified GroupCallStart message. Does not implicitly {@link csp_e2e.GroupCallStart.verify|verify} messages.
         * @param message GroupCallStart message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: csp_e2e.GroupCallStartEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a GroupCallStart message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GroupCallStart
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e.GroupCallStart;
    }
    /** Properties of a GroupJoinRequest. */
    interface IGroupJoinRequest {
        /** GroupJoinRequest token */
        token?: (Uint8Array | null);
        /** GroupJoinRequest groupName */
        groupName?: (string | null);
        /** GroupJoinRequest message */
        message?: (string | null);
    }
    type GroupJoinRequestEncodable = types.WeakOpaque<IGroupJoinRequest, {
        readonly GroupJoinRequestEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a GroupJoinRequest. */
    class GroupJoinRequest implements IGroupJoinRequest {
        /**
         * Constructs a new GroupJoinRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: csp_e2e.IGroupJoinRequest);
        /** GroupJoinRequest token. */
        public token: Uint8Array;
        /** GroupJoinRequest groupName. */
        public groupName: string;
        /** GroupJoinRequest message. */
        public message: string;
        /**
         * Encodes the specified GroupJoinRequest message. Does not implicitly {@link csp_e2e.GroupJoinRequest.verify|verify} messages.
         * @param message GroupJoinRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: csp_e2e.GroupJoinRequestEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a GroupJoinRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GroupJoinRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e.GroupJoinRequest;
    }
    /** Properties of a GroupJoinResponse. */
    interface IGroupJoinResponse {
        /** GroupJoinResponse token */
        token?: (Uint8Array | null);
        /** GroupJoinResponse response */
        response?: (csp_e2e.GroupJoinResponse.Response | null);
    }
    type GroupJoinResponseEncodable = types.WeakOpaque<IGroupJoinResponse, {
        readonly GroupJoinResponseEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a GroupJoinResponse. */
    class GroupJoinResponse implements IGroupJoinResponse {
        /**
         * Constructs a new GroupJoinResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: csp_e2e.IGroupJoinResponse);
        /** GroupJoinResponse token. */
        public token: Uint8Array;
        /** GroupJoinResponse response. */
        public response?: (csp_e2e.GroupJoinResponse.Response | null);
        /**
         * Encodes the specified GroupJoinResponse message. Does not implicitly {@link csp_e2e.GroupJoinResponse.verify|verify} messages.
         * @param message GroupJoinResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: csp_e2e.GroupJoinResponseEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a GroupJoinResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GroupJoinResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e.GroupJoinResponse;
    }
    namespace GroupJoinResponse {
        /** Properties of a Response. */
        interface IResponse {
            /** Response accept */
            accept?: (csp_e2e.GroupJoinResponse.Response.Accept | null);
            /** Response expired */
            expired?: (common.Unit | null);
            /** Response groupFull */
            groupFull?: (common.Unit | null);
            /** Response reject */
            reject?: (common.Unit | null);
        }
        type ResponseEncodable = types.WeakOpaque<IResponse, {
            readonly ResponseEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Response. */
        class Response implements IResponse {
            /**
             * Constructs a new Response.
             * @param [properties] Properties to set
             */
            constructor(properties?: csp_e2e.GroupJoinResponse.IResponse);
            /** Response accept. */
            public accept?: (csp_e2e.GroupJoinResponse.Response.Accept | null);
            /** Response expired. */
            public expired?: (common.Unit | null);
            /** Response groupFull. */
            public groupFull?: (common.Unit | null);
            /** Response reject. */
            public reject?: (common.Unit | null);
            /** Response response. */
            public response?: ("accept" | "expired" | "groupFull" | "reject");
            /**
             * Encodes the specified Response message. Does not implicitly {@link csp_e2e.GroupJoinResponse.Response.verify|verify} messages.
             * @param message Response message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: csp_e2e.GroupJoinResponse.ResponseEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Response message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Response
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e.GroupJoinResponse.Response;
        }
        namespace Response {
            /** Properties of an Accept. */
            interface IAccept {
                /** Accept groupId */
                groupId?: (Long | null);
            }
            type AcceptEncodable = types.WeakOpaque<IAccept, {
                readonly AcceptEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents an Accept. */
            class Accept implements IAccept {
                /**
                 * Constructs a new Accept.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: csp_e2e.GroupJoinResponse.Response.IAccept);
                /** Accept groupId. */
                public groupId: Long;
                /**
                 * Encodes the specified Accept message. Does not implicitly {@link csp_e2e.GroupJoinResponse.Response.Accept.verify|verify} messages.
                 * @param message Accept message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: csp_e2e.GroupJoinResponse.Response.AcceptEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes an Accept message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Accept
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e.GroupJoinResponse.Response.Accept;
            }
        }
    }
}
/** Namespace groupcall. */
export namespace groupcall {
    /** Properties of a CallState. */
    interface ICallState {
        /** CallState padding */
        padding?: (Uint8Array | null);
        /** CallState stateCreatedBy */
        stateCreatedBy?: (number | null);
        /** CallState stateCreatedAt */
        stateCreatedAt?: (Long | null);
        /** CallState participants */
        participants?: ({
            [k: string]: groupcall.CallState.Participant;
        } | null);
    }
    type CallStateEncodable = types.WeakOpaque<ICallState, {
        readonly CallStateEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a CallState. */
    class CallState implements ICallState {
        /**
         * Constructs a new CallState.
         * @param [properties] Properties to set
         */
        constructor(properties?: groupcall.ICallState);
        /** CallState padding. */
        public padding: Uint8Array;
        /** CallState stateCreatedBy. */
        public stateCreatedBy: number;
        /** CallState stateCreatedAt. */
        public stateCreatedAt: Long;
        /** CallState participants. */
        public participants: {
            [k: string]: groupcall.CallState.Participant;
        };
        /**
         * Encodes the specified CallState message. Does not implicitly {@link groupcall.CallState.verify|verify} messages.
         * @param message CallState message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: groupcall.CallStateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a CallState message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CallState
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.CallState;
    }
    namespace CallState {
        /** Properties of a Participant. */
        interface IParticipant {
            /** Participant threema */
            threema?: (groupcall.CallState.Participant.Normal | null);
            /** Participant guest */
            guest?: (groupcall.CallState.Participant.Guest | null);
        }
        type ParticipantEncodable = types.WeakOpaque<IParticipant, {
            readonly ParticipantEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Participant. */
        class Participant implements IParticipant {
            /**
             * Constructs a new Participant.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.CallState.IParticipant);
            /** Participant threema. */
            public threema?: (groupcall.CallState.Participant.Normal | null);
            /** Participant guest. */
            public guest?: (groupcall.CallState.Participant.Guest | null);
            /** Participant participant. */
            public participant?: ("threema" | "guest");
            /**
             * Encodes the specified Participant message. Does not implicitly {@link groupcall.CallState.Participant.verify|verify} messages.
             * @param message Participant message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.CallState.ParticipantEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Participant message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Participant
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.CallState.Participant;
        }
        namespace Participant {
            /** Properties of a Normal. */
            interface INormal {
                /** Normal identity */
                identity?: (string | null);
                /** Normal nickname */
                nickname?: (string | null);
            }
            type NormalEncodable = types.WeakOpaque<INormal, {
                readonly NormalEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a Normal. */
            class Normal implements INormal {
                /**
                 * Constructs a new Normal.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.CallState.Participant.INormal);
                /** Normal identity. */
                public identity: string;
                /** Normal nickname. */
                public nickname: string;
                /**
                 * Encodes the specified Normal message. Does not implicitly {@link groupcall.CallState.Participant.Normal.verify|verify} messages.
                 * @param message Normal message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.CallState.Participant.NormalEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a Normal message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Normal
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.CallState.Participant.Normal;
            }
            /** Properties of a Guest. */
            interface IGuest {
                /** Guest name */
                name?: (string | null);
            }
            type GuestEncodable = types.WeakOpaque<IGuest, {
                readonly GuestEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a Guest. */
            class Guest implements IGuest {
                /**
                 * Constructs a new Guest.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.CallState.Participant.IGuest);
                /** Guest name. */
                public name: string;
                /**
                 * Encodes the specified Guest message. Does not implicitly {@link groupcall.CallState.Participant.Guest.verify|verify} messages.
                 * @param message Guest message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.CallState.Participant.GuestEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a Guest message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Guest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.CallState.Participant.Guest;
            }
        }
    }
    /** Properties of a SfuHttpRequest. */
    interface ISfuHttpRequest {
    }
    type SfuHttpRequestEncodable = types.WeakOpaque<ISfuHttpRequest, {
        readonly SfuHttpRequestEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a SfuHttpRequest. */
    class SfuHttpRequest implements ISfuHttpRequest {
        /**
         * Constructs a new SfuHttpRequest.
         * @param [properties] Properties to set
         */
        constructor(properties?: groupcall.ISfuHttpRequest);
        /**
         * Encodes the specified SfuHttpRequest message. Does not implicitly {@link groupcall.SfuHttpRequest.verify|verify} messages.
         * @param message SfuHttpRequest message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: groupcall.SfuHttpRequestEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a SfuHttpRequest message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SfuHttpRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.SfuHttpRequest;
    }
    namespace SfuHttpRequest {
        /** Properties of a Peek. */
        interface IPeek {
            /** Peek callId */
            callId?: (Uint8Array | null);
        }
        type PeekEncodable = types.WeakOpaque<IPeek, {
            readonly PeekEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Peek. */
        class Peek implements IPeek {
            /**
             * Constructs a new Peek.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.SfuHttpRequest.IPeek);
            /** Peek callId. */
            public callId: Uint8Array;
            /**
             * Encodes the specified Peek message. Does not implicitly {@link groupcall.SfuHttpRequest.Peek.verify|verify} messages.
             * @param message Peek message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.SfuHttpRequest.PeekEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Peek message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Peek
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.SfuHttpRequest.Peek;
        }
        /** Properties of a Join. */
        interface IJoin {
            /** Join callId */
            callId?: (Uint8Array | null);
            /** Join protocolVersion */
            protocolVersion?: (number | null);
            /** Join dtlsFingerprint */
            dtlsFingerprint?: (Uint8Array | null);
        }
        type JoinEncodable = types.WeakOpaque<IJoin, {
            readonly JoinEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Join. */
        class Join implements IJoin {
            /**
             * Constructs a new Join.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.SfuHttpRequest.IJoin);
            /** Join callId. */
            public callId: Uint8Array;
            /** Join protocolVersion. */
            public protocolVersion: number;
            /** Join dtlsFingerprint. */
            public dtlsFingerprint: Uint8Array;
            /**
             * Encodes the specified Join message. Does not implicitly {@link groupcall.SfuHttpRequest.Join.verify|verify} messages.
             * @param message Join message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.SfuHttpRequest.JoinEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Join message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Join
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.SfuHttpRequest.Join;
        }
    }
    /** Properties of a SfuHttpResponse. */
    interface ISfuHttpResponse {
    }
    type SfuHttpResponseEncodable = types.WeakOpaque<ISfuHttpResponse, {
        readonly SfuHttpResponseEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a SfuHttpResponse. */
    class SfuHttpResponse implements ISfuHttpResponse {
        /**
         * Constructs a new SfuHttpResponse.
         * @param [properties] Properties to set
         */
        constructor(properties?: groupcall.ISfuHttpResponse);
        /**
         * Encodes the specified SfuHttpResponse message. Does not implicitly {@link groupcall.SfuHttpResponse.verify|verify} messages.
         * @param message SfuHttpResponse message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: groupcall.SfuHttpResponseEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a SfuHttpResponse message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SfuHttpResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.SfuHttpResponse;
    }
    namespace SfuHttpResponse {
        /** Properties of a Peek. */
        interface IPeek {
            /** Peek startedAt */
            startedAt?: (Long | null);
            /** Peek maxParticipants */
            maxParticipants?: (number | null);
            /** Peek encryptedCallState */
            encryptedCallState?: (Uint8Array | null);
        }
        type PeekEncodable = types.WeakOpaque<IPeek, {
            readonly PeekEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Peek. */
        class Peek implements IPeek {
            /**
             * Constructs a new Peek.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.SfuHttpResponse.IPeek);
            /** Peek startedAt. */
            public startedAt: Long;
            /** Peek maxParticipants. */
            public maxParticipants: number;
            /** Peek encryptedCallState. */
            public encryptedCallState?: (Uint8Array | null);
            /** Peek _encryptedCallState. */
            public _encryptedCallState?: "encryptedCallState";
            /**
             * Encodes the specified Peek message. Does not implicitly {@link groupcall.SfuHttpResponse.Peek.verify|verify} messages.
             * @param message Peek message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.SfuHttpResponse.PeekEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Peek message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Peek
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.SfuHttpResponse.Peek;
        }
        /** Properties of a Join. */
        interface IJoin {
            /** Join startedAt */
            startedAt?: (Long | null);
            /** Join maxParticipants */
            maxParticipants?: (number | null);
            /** Join participantId */
            participantId?: (number | null);
            /** Join addresses */
            addresses?: (readonly groupcall.SfuHttpResponse.Join.Address[] | null);
            /** Join iceUsernameFragment */
            iceUsernameFragment?: (string | null);
            /** Join icePassword */
            icePassword?: (string | null);
            /** Join dtlsFingerprint */
            dtlsFingerprint?: (Uint8Array | null);
        }
        type JoinEncodable = types.WeakOpaque<IJoin, {
            readonly JoinEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Join. */
        class Join implements IJoin {
            /**
             * Constructs a new Join.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.SfuHttpResponse.IJoin);
            /** Join startedAt. */
            public startedAt: Long;
            /** Join maxParticipants. */
            public maxParticipants: number;
            /** Join participantId. */
            public participantId: number;
            /** Join addresses. */
            public addresses: readonly groupcall.SfuHttpResponse.Join.Address[];
            /** Join iceUsernameFragment. */
            public iceUsernameFragment: string;
            /** Join icePassword. */
            public icePassword: string;
            /** Join dtlsFingerprint. */
            public dtlsFingerprint: Uint8Array;
            /**
             * Encodes the specified Join message. Does not implicitly {@link groupcall.SfuHttpResponse.Join.verify|verify} messages.
             * @param message Join message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.SfuHttpResponse.JoinEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Join message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Join
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.SfuHttpResponse.Join;
        }
        namespace Join {
            /** Properties of an Address. */
            interface IAddress {
                /** Address protocol */
                protocol?: (groupcall.SfuHttpResponse.Join.Address.Protocol | null);
                /** Address port */
                port?: (number | null);
                /** Address ip */
                ip?: (string | null);
            }
            type AddressEncodable = types.WeakOpaque<IAddress, {
                readonly AddressEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents an Address. */
            class Address implements IAddress {
                /**
                 * Constructs a new Address.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.SfuHttpResponse.Join.IAddress);
                /** Address protocol. */
                public protocol: groupcall.SfuHttpResponse.Join.Address.Protocol;
                /** Address port. */
                public port: number;
                /** Address ip. */
                public ip: string;
                /**
                 * Encodes the specified Address message. Does not implicitly {@link groupcall.SfuHttpResponse.Join.Address.verify|verify} messages.
                 * @param message Address message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.SfuHttpResponse.Join.AddressEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes an Address message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Address
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.SfuHttpResponse.Join.Address;
            }
            namespace Address {
                /** Protocol enum. */
                enum Protocol {
                    UDP = 0
                }
            }
        }
    }
    /** Properties of a SfuToParticipant. */
    interface ISfuToParticipant {
    }
    type SfuToParticipantEncodable = types.WeakOpaque<ISfuToParticipant, {
        readonly SfuToParticipantEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a SfuToParticipant. */
    class SfuToParticipant implements ISfuToParticipant {
        /**
         * Constructs a new SfuToParticipant.
         * @param [properties] Properties to set
         */
        constructor(properties?: groupcall.ISfuToParticipant);
        /**
         * Encodes the specified SfuToParticipant message. Does not implicitly {@link groupcall.SfuToParticipant.verify|verify} messages.
         * @param message SfuToParticipant message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: groupcall.SfuToParticipantEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a SfuToParticipant message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SfuToParticipant
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.SfuToParticipant;
    }
    namespace SfuToParticipant {
        /** Properties of an Envelope. */
        interface IEnvelope {
            /** Envelope padding */
            padding?: (Uint8Array | null);
            /** Envelope relay */
            relay?: (groupcall.ParticipantToParticipant.OuterEnvelope | null);
            /** Envelope hello */
            hello?: (groupcall.SfuToParticipant.Hello | null);
            /** Envelope participantJoined */
            participantJoined?: (groupcall.SfuToParticipant.ParticipantJoined | null);
            /** Envelope participantLeft */
            participantLeft?: (groupcall.SfuToParticipant.ParticipantLeft | null);
        }
        type EnvelopeEncodable = types.WeakOpaque<IEnvelope, {
            readonly EnvelopeEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an Envelope. */
        class Envelope implements IEnvelope {
            /**
             * Constructs a new Envelope.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.SfuToParticipant.IEnvelope);
            /** Envelope padding. */
            public padding: Uint8Array;
            /** Envelope relay. */
            public relay?: (groupcall.ParticipantToParticipant.OuterEnvelope | null);
            /** Envelope hello. */
            public hello?: (groupcall.SfuToParticipant.Hello | null);
            /** Envelope participantJoined. */
            public participantJoined?: (groupcall.SfuToParticipant.ParticipantJoined | null);
            /** Envelope participantLeft. */
            public participantLeft?: (groupcall.SfuToParticipant.ParticipantLeft | null);
            /** Envelope content. */
            public content?: ("relay" | "hello" | "participantJoined" | "participantLeft");
            /**
             * Encodes the specified Envelope message. Does not implicitly {@link groupcall.SfuToParticipant.Envelope.verify|verify} messages.
             * @param message Envelope message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.SfuToParticipant.EnvelopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an Envelope message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Envelope
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.SfuToParticipant.Envelope;
        }
        /** Properties of a Hello. */
        interface IHello {
            /** Hello participantIds */
            participantIds?: (readonly number[] | null);
        }
        type HelloEncodable = types.WeakOpaque<IHello, {
            readonly HelloEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Hello. */
        class Hello implements IHello {
            /**
             * Constructs a new Hello.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.SfuToParticipant.IHello);
            /** Hello participantIds. */
            public participantIds: readonly number[];
            /**
             * Encodes the specified Hello message. Does not implicitly {@link groupcall.SfuToParticipant.Hello.verify|verify} messages.
             * @param message Hello message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.SfuToParticipant.HelloEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Hello message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Hello
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.SfuToParticipant.Hello;
        }
        /** Properties of a ParticipantJoined. */
        interface IParticipantJoined {
            /** ParticipantJoined participantId */
            participantId?: (number | null);
        }
        type ParticipantJoinedEncodable = types.WeakOpaque<IParticipantJoined, {
            readonly ParticipantJoinedEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a ParticipantJoined. */
        class ParticipantJoined implements IParticipantJoined {
            /**
             * Constructs a new ParticipantJoined.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.SfuToParticipant.IParticipantJoined);
            /** ParticipantJoined participantId. */
            public participantId: number;
            /**
             * Encodes the specified ParticipantJoined message. Does not implicitly {@link groupcall.SfuToParticipant.ParticipantJoined.verify|verify} messages.
             * @param message ParticipantJoined message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.SfuToParticipant.ParticipantJoinedEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a ParticipantJoined message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ParticipantJoined
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.SfuToParticipant.ParticipantJoined;
        }
        /** Properties of a ParticipantLeft. */
        interface IParticipantLeft {
            /** ParticipantLeft participantId */
            participantId?: (number | null);
        }
        type ParticipantLeftEncodable = types.WeakOpaque<IParticipantLeft, {
            readonly ParticipantLeftEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a ParticipantLeft. */
        class ParticipantLeft implements IParticipantLeft {
            /**
             * Constructs a new ParticipantLeft.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.SfuToParticipant.IParticipantLeft);
            /** ParticipantLeft participantId. */
            public participantId: number;
            /**
             * Encodes the specified ParticipantLeft message. Does not implicitly {@link groupcall.SfuToParticipant.ParticipantLeft.verify|verify} messages.
             * @param message ParticipantLeft message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.SfuToParticipant.ParticipantLeftEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a ParticipantLeft message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ParticipantLeft
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.SfuToParticipant.ParticipantLeft;
        }
    }
    /** Properties of a ParticipantToSfu. */
    interface IParticipantToSfu {
    }
    type ParticipantToSfuEncodable = types.WeakOpaque<IParticipantToSfu, {
        readonly ParticipantToSfuEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a ParticipantToSfu. */
    class ParticipantToSfu implements IParticipantToSfu {
        /**
         * Constructs a new ParticipantToSfu.
         * @param [properties] Properties to set
         */
        constructor(properties?: groupcall.IParticipantToSfu);
        /**
         * Encodes the specified ParticipantToSfu message. Does not implicitly {@link groupcall.ParticipantToSfu.verify|verify} messages.
         * @param message ParticipantToSfu message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: groupcall.ParticipantToSfuEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a ParticipantToSfu message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ParticipantToSfu
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToSfu;
    }
    namespace ParticipantToSfu {
        /** Properties of an Envelope. */
        interface IEnvelope {
            /** Envelope padding */
            padding?: (Uint8Array | null);
            /** Envelope relay */
            relay?: (groupcall.ParticipantToParticipant.OuterEnvelope | null);
            /** Envelope updateCallState */
            updateCallState?: (groupcall.ParticipantToSfu.UpdateCallState | null);
            /** Envelope requestParticipantMicrophone */
            requestParticipantMicrophone?: (groupcall.ParticipantToSfu.ParticipantMicrophone | null);
            /** Envelope requestParticipantCamera */
            requestParticipantCamera?: (groupcall.ParticipantToSfu.ParticipantCamera | null);
            /** Envelope requestParticipantScreenShare */
            requestParticipantScreenShare?: (groupcall.ParticipantToSfu.ParticipantScreen | null);
        }
        type EnvelopeEncodable = types.WeakOpaque<IEnvelope, {
            readonly EnvelopeEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an Envelope. */
        class Envelope implements IEnvelope {
            /**
             * Constructs a new Envelope.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.ParticipantToSfu.IEnvelope);
            /** Envelope padding. */
            public padding: Uint8Array;
            /** Envelope relay. */
            public relay?: (groupcall.ParticipantToParticipant.OuterEnvelope | null);
            /** Envelope updateCallState. */
            public updateCallState?: (groupcall.ParticipantToSfu.UpdateCallState | null);
            /** Envelope requestParticipantMicrophone. */
            public requestParticipantMicrophone?: (groupcall.ParticipantToSfu.ParticipantMicrophone | null);
            /** Envelope requestParticipantCamera. */
            public requestParticipantCamera?: (groupcall.ParticipantToSfu.ParticipantCamera | null);
            /** Envelope requestParticipantScreenShare. */
            public requestParticipantScreenShare?: (groupcall.ParticipantToSfu.ParticipantScreen | null);
            /** Envelope content. */
            public content?: ("relay" | "updateCallState" | "requestParticipantMicrophone" | "requestParticipantCamera" | "requestParticipantScreenShare");
            /**
             * Encodes the specified Envelope message. Does not implicitly {@link groupcall.ParticipantToSfu.Envelope.verify|verify} messages.
             * @param message Envelope message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.ParticipantToSfu.EnvelopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an Envelope message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Envelope
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToSfu.Envelope;
        }
        /** Properties of an UpdateCallState. */
        interface IUpdateCallState {
            /** UpdateCallState encryptedCallState */
            encryptedCallState?: (Uint8Array | null);
        }
        type UpdateCallStateEncodable = types.WeakOpaque<IUpdateCallState, {
            readonly UpdateCallStateEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an UpdateCallState. */
        class UpdateCallState implements IUpdateCallState {
            /**
             * Constructs a new UpdateCallState.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.ParticipantToSfu.IUpdateCallState);
            /** UpdateCallState encryptedCallState. */
            public encryptedCallState: Uint8Array;
            /**
             * Encodes the specified UpdateCallState message. Does not implicitly {@link groupcall.ParticipantToSfu.UpdateCallState.verify|verify} messages.
             * @param message UpdateCallState message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.ParticipantToSfu.UpdateCallStateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an UpdateCallState message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns UpdateCallState
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToSfu.UpdateCallState;
        }
        /** Properties of a ParticipantMicrophone. */
        interface IParticipantMicrophone {
            /** ParticipantMicrophone participantId */
            participantId?: (number | null);
            /** ParticipantMicrophone subscribe */
            subscribe?: (groupcall.ParticipantToSfu.ParticipantMicrophone.Subscribe | null);
            /** ParticipantMicrophone unsubscribe */
            unsubscribe?: (groupcall.ParticipantToSfu.ParticipantMicrophone.Unsubscribe | null);
        }
        type ParticipantMicrophoneEncodable = types.WeakOpaque<IParticipantMicrophone, {
            readonly ParticipantMicrophoneEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a ParticipantMicrophone. */
        class ParticipantMicrophone implements IParticipantMicrophone {
            /**
             * Constructs a new ParticipantMicrophone.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.ParticipantToSfu.IParticipantMicrophone);
            /** ParticipantMicrophone participantId. */
            public participantId: number;
            /** ParticipantMicrophone subscribe. */
            public subscribe?: (groupcall.ParticipantToSfu.ParticipantMicrophone.Subscribe | null);
            /** ParticipantMicrophone unsubscribe. */
            public unsubscribe?: (groupcall.ParticipantToSfu.ParticipantMicrophone.Unsubscribe | null);
            /** ParticipantMicrophone action. */
            public action?: ("subscribe" | "unsubscribe");
            /**
             * Encodes the specified ParticipantMicrophone message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantMicrophone.verify|verify} messages.
             * @param message ParticipantMicrophone message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.ParticipantToSfu.ParticipantMicrophoneEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a ParticipantMicrophone message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ParticipantMicrophone
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToSfu.ParticipantMicrophone;
        }
        namespace ParticipantMicrophone {
            /** Properties of a Subscribe. */
            interface ISubscribe {
            }
            type SubscribeEncodable = types.WeakOpaque<ISubscribe, {
                readonly SubscribeEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a Subscribe. */
            class Subscribe implements ISubscribe {
                /**
                 * Constructs a new Subscribe.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToSfu.ParticipantMicrophone.ISubscribe);
                /**
                 * Encodes the specified Subscribe message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantMicrophone.Subscribe.verify|verify} messages.
                 * @param message Subscribe message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToSfu.ParticipantMicrophone.SubscribeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a Subscribe message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Subscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToSfu.ParticipantMicrophone.Subscribe;
            }
            /** Properties of an Unsubscribe. */
            interface IUnsubscribe {
            }
            type UnsubscribeEncodable = types.WeakOpaque<IUnsubscribe, {
                readonly UnsubscribeEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents an Unsubscribe. */
            class Unsubscribe implements IUnsubscribe {
                /**
                 * Constructs a new Unsubscribe.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToSfu.ParticipantMicrophone.IUnsubscribe);
                /**
                 * Encodes the specified Unsubscribe message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantMicrophone.Unsubscribe.verify|verify} messages.
                 * @param message Unsubscribe message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToSfu.ParticipantMicrophone.UnsubscribeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes an Unsubscribe message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Unsubscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToSfu.ParticipantMicrophone.Unsubscribe;
            }
        }
        /** Properties of a ParticipantCamera. */
        interface IParticipantCamera {
            /** ParticipantCamera participantId */
            participantId?: (number | null);
            /** ParticipantCamera subscribe */
            subscribe?: (groupcall.ParticipantToSfu.ParticipantCamera.Subscribe | null);
            /** ParticipantCamera unsubscribe */
            unsubscribe?: (groupcall.ParticipantToSfu.ParticipantCamera.Unsubscribe | null);
        }
        type ParticipantCameraEncodable = types.WeakOpaque<IParticipantCamera, {
            readonly ParticipantCameraEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a ParticipantCamera. */
        class ParticipantCamera implements IParticipantCamera {
            /**
             * Constructs a new ParticipantCamera.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.ParticipantToSfu.IParticipantCamera);
            /** ParticipantCamera participantId. */
            public participantId: number;
            /** ParticipantCamera subscribe. */
            public subscribe?: (groupcall.ParticipantToSfu.ParticipantCamera.Subscribe | null);
            /** ParticipantCamera unsubscribe. */
            public unsubscribe?: (groupcall.ParticipantToSfu.ParticipantCamera.Unsubscribe | null);
            /** ParticipantCamera action. */
            public action?: ("subscribe" | "unsubscribe");
            /**
             * Encodes the specified ParticipantCamera message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantCamera.verify|verify} messages.
             * @param message ParticipantCamera message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.ParticipantToSfu.ParticipantCameraEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a ParticipantCamera message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ParticipantCamera
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToSfu.ParticipantCamera;
        }
        namespace ParticipantCamera {
            /** Properties of a Subscribe. */
            interface ISubscribe {
                /** Subscribe desiredResolution */
                desiredResolution?: (common.Resolution | null);
                /** Subscribe desiredFps */
                desiredFps?: (number | null);
            }
            type SubscribeEncodable = types.WeakOpaque<ISubscribe, {
                readonly SubscribeEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a Subscribe. */
            class Subscribe implements ISubscribe {
                /**
                 * Constructs a new Subscribe.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToSfu.ParticipantCamera.ISubscribe);
                /** Subscribe desiredResolution. */
                public desiredResolution?: (common.Resolution | null);
                /** Subscribe desiredFps. */
                public desiredFps: number;
                /**
                 * Encodes the specified Subscribe message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantCamera.Subscribe.verify|verify} messages.
                 * @param message Subscribe message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToSfu.ParticipantCamera.SubscribeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a Subscribe message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Subscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToSfu.ParticipantCamera.Subscribe;
            }
            /** Properties of an Unsubscribe. */
            interface IUnsubscribe {
            }
            type UnsubscribeEncodable = types.WeakOpaque<IUnsubscribe, {
                readonly UnsubscribeEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents an Unsubscribe. */
            class Unsubscribe implements IUnsubscribe {
                /**
                 * Constructs a new Unsubscribe.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToSfu.ParticipantCamera.IUnsubscribe);
                /**
                 * Encodes the specified Unsubscribe message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantCamera.Unsubscribe.verify|verify} messages.
                 * @param message Unsubscribe message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToSfu.ParticipantCamera.UnsubscribeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes an Unsubscribe message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Unsubscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToSfu.ParticipantCamera.Unsubscribe;
            }
        }
        /** Properties of a ParticipantScreen. */
        interface IParticipantScreen {
            /** ParticipantScreen participantId */
            participantId?: (number | null);
            /** ParticipantScreen subscribe */
            subscribe?: (groupcall.ParticipantToSfu.ParticipantScreen.Subscribe | null);
            /** ParticipantScreen unsubscribe */
            unsubscribe?: (groupcall.ParticipantToSfu.ParticipantScreen.Unsubscribe | null);
        }
        type ParticipantScreenEncodable = types.WeakOpaque<IParticipantScreen, {
            readonly ParticipantScreenEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a ParticipantScreen. */
        class ParticipantScreen implements IParticipantScreen {
            /**
             * Constructs a new ParticipantScreen.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.ParticipantToSfu.IParticipantScreen);
            /** ParticipantScreen participantId. */
            public participantId: number;
            /** ParticipantScreen subscribe. */
            public subscribe?: (groupcall.ParticipantToSfu.ParticipantScreen.Subscribe | null);
            /** ParticipantScreen unsubscribe. */
            public unsubscribe?: (groupcall.ParticipantToSfu.ParticipantScreen.Unsubscribe | null);
            /** ParticipantScreen action. */
            public action?: ("subscribe" | "unsubscribe");
            /**
             * Encodes the specified ParticipantScreen message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantScreen.verify|verify} messages.
             * @param message ParticipantScreen message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.ParticipantToSfu.ParticipantScreenEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a ParticipantScreen message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ParticipantScreen
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToSfu.ParticipantScreen;
        }
        namespace ParticipantScreen {
            /** Properties of a Subscribe. */
            interface ISubscribe {
            }
            type SubscribeEncodable = types.WeakOpaque<ISubscribe, {
                readonly SubscribeEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a Subscribe. */
            class Subscribe implements ISubscribe {
                /**
                 * Constructs a new Subscribe.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToSfu.ParticipantScreen.ISubscribe);
                /**
                 * Encodes the specified Subscribe message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantScreen.Subscribe.verify|verify} messages.
                 * @param message Subscribe message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToSfu.ParticipantScreen.SubscribeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a Subscribe message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Subscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToSfu.ParticipantScreen.Subscribe;
            }
            /** Properties of an Unsubscribe. */
            interface IUnsubscribe {
            }
            type UnsubscribeEncodable = types.WeakOpaque<IUnsubscribe, {
                readonly UnsubscribeEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents an Unsubscribe. */
            class Unsubscribe implements IUnsubscribe {
                /**
                 * Constructs a new Unsubscribe.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToSfu.ParticipantScreen.IUnsubscribe);
                /**
                 * Encodes the specified Unsubscribe message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantScreen.Unsubscribe.verify|verify} messages.
                 * @param message Unsubscribe message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToSfu.ParticipantScreen.UnsubscribeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes an Unsubscribe message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Unsubscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToSfu.ParticipantScreen.Unsubscribe;
            }
        }
    }
    /** Properties of a ParticipantToParticipant. */
    interface IParticipantToParticipant {
    }
    type ParticipantToParticipantEncodable = types.WeakOpaque<IParticipantToParticipant, {
        readonly ParticipantToParticipantEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a ParticipantToParticipant. */
    class ParticipantToParticipant implements IParticipantToParticipant {
        /**
         * Constructs a new ParticipantToParticipant.
         * @param [properties] Properties to set
         */
        constructor(properties?: groupcall.IParticipantToParticipant);
        /**
         * Encodes the specified ParticipantToParticipant message. Does not implicitly {@link groupcall.ParticipantToParticipant.verify|verify} messages.
         * @param message ParticipantToParticipant message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: groupcall.ParticipantToParticipantEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a ParticipantToParticipant message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ParticipantToParticipant
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant;
    }
    namespace ParticipantToParticipant {
        /** Properties of an OuterEnvelope. */
        interface IOuterEnvelope {
            /** OuterEnvelope sender */
            sender?: (number | null);
            /** OuterEnvelope receiver */
            receiver?: (number | null);
            /** OuterEnvelope encryptedData */
            encryptedData?: (Uint8Array | null);
        }
        type OuterEnvelopeEncodable = types.WeakOpaque<IOuterEnvelope, {
            readonly OuterEnvelopeEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an OuterEnvelope. */
        class OuterEnvelope implements IOuterEnvelope {
            /**
             * Constructs a new OuterEnvelope.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.ParticipantToParticipant.IOuterEnvelope);
            /** OuterEnvelope sender. */
            public sender: number;
            /** OuterEnvelope receiver. */
            public receiver: number;
            /** OuterEnvelope encryptedData. */
            public encryptedData: Uint8Array;
            /**
             * Encodes the specified OuterEnvelope message. Does not implicitly {@link groupcall.ParticipantToParticipant.OuterEnvelope.verify|verify} messages.
             * @param message OuterEnvelope message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.ParticipantToParticipant.OuterEnvelopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an OuterEnvelope message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns OuterEnvelope
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.OuterEnvelope;
        }
        /** Properties of a Handshake. */
        interface IHandshake {
        }
        type HandshakeEncodable = types.WeakOpaque<IHandshake, {
            readonly HandshakeEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Handshake. */
        class Handshake implements IHandshake {
            /**
             * Constructs a new Handshake.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.ParticipantToParticipant.IHandshake);
            /**
             * Encodes the specified Handshake message. Does not implicitly {@link groupcall.ParticipantToParticipant.Handshake.verify|verify} messages.
             * @param message Handshake message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.ParticipantToParticipant.HandshakeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Handshake message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Handshake
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.Handshake;
        }
        namespace Handshake {
            /** Properties of a HelloEnvelope. */
            interface IHelloEnvelope {
                /** HelloEnvelope padding */
                padding?: (Uint8Array | null);
                /** HelloEnvelope hello */
                hello?: (groupcall.ParticipantToParticipant.Handshake.Hello | null);
                /** HelloEnvelope guestHello */
                guestHello?: (groupcall.ParticipantToParticipant.Handshake.GuestHello | null);
            }
            type HelloEnvelopeEncodable = types.WeakOpaque<IHelloEnvelope, {
                readonly HelloEnvelopeEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a HelloEnvelope. */
            class HelloEnvelope implements IHelloEnvelope {
                /**
                 * Constructs a new HelloEnvelope.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToParticipant.Handshake.IHelloEnvelope);
                /** HelloEnvelope padding. */
                public padding: Uint8Array;
                /** HelloEnvelope hello. */
                public hello?: (groupcall.ParticipantToParticipant.Handshake.Hello | null);
                /** HelloEnvelope guestHello. */
                public guestHello?: (groupcall.ParticipantToParticipant.Handshake.GuestHello | null);
                /** HelloEnvelope content. */
                public content?: ("hello" | "guestHello");
                /**
                 * Encodes the specified HelloEnvelope message. Does not implicitly {@link groupcall.ParticipantToParticipant.Handshake.HelloEnvelope.verify|verify} messages.
                 * @param message HelloEnvelope message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToParticipant.Handshake.HelloEnvelopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a HelloEnvelope message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns HelloEnvelope
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.Handshake.HelloEnvelope;
            }
            /** Properties of an AuthEnvelope. */
            interface IAuthEnvelope {
                /** AuthEnvelope padding */
                padding?: (Uint8Array | null);
                /** AuthEnvelope auth */
                auth?: (groupcall.ParticipantToParticipant.Handshake.Auth | null);
                /** AuthEnvelope guestAuth */
                guestAuth?: (groupcall.ParticipantToParticipant.Handshake.GuestAuth | null);
            }
            type AuthEnvelopeEncodable = types.WeakOpaque<IAuthEnvelope, {
                readonly AuthEnvelopeEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents an AuthEnvelope. */
            class AuthEnvelope implements IAuthEnvelope {
                /**
                 * Constructs a new AuthEnvelope.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToParticipant.Handshake.IAuthEnvelope);
                /** AuthEnvelope padding. */
                public padding: Uint8Array;
                /** AuthEnvelope auth. */
                public auth?: (groupcall.ParticipantToParticipant.Handshake.Auth | null);
                /** AuthEnvelope guestAuth. */
                public guestAuth?: (groupcall.ParticipantToParticipant.Handshake.GuestAuth | null);
                /** AuthEnvelope content. */
                public content?: ("auth" | "guestAuth");
                /**
                 * Encodes the specified AuthEnvelope message. Does not implicitly {@link groupcall.ParticipantToParticipant.Handshake.AuthEnvelope.verify|verify} messages.
                 * @param message AuthEnvelope message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToParticipant.Handshake.AuthEnvelopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes an AuthEnvelope message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns AuthEnvelope
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.Handshake.AuthEnvelope;
            }
            /** Properties of a Hello. */
            interface IHello {
                /** Hello identity */
                identity?: (string | null);
                /** Hello nickname */
                nickname?: (string | null);
                /** Hello pck */
                pck?: (Uint8Array | null);
                /** Hello pcck */
                pcck?: (Uint8Array | null);
            }
            type HelloEncodable = types.WeakOpaque<IHello, {
                readonly HelloEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a Hello. */
            class Hello implements IHello {
                /**
                 * Constructs a new Hello.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToParticipant.Handshake.IHello);
                /** Hello identity. */
                public identity: string;
                /** Hello nickname. */
                public nickname: string;
                /** Hello pck. */
                public pck: Uint8Array;
                /** Hello pcck. */
                public pcck: Uint8Array;
                /**
                 * Encodes the specified Hello message. Does not implicitly {@link groupcall.ParticipantToParticipant.Handshake.Hello.verify|verify} messages.
                 * @param message Hello message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToParticipant.Handshake.HelloEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a Hello message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Hello
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.Handshake.Hello;
            }
            /** Properties of an Auth. */
            interface IAuth {
                /** Auth pck */
                pck?: (Uint8Array | null);
                /** Auth pcck */
                pcck?: (Uint8Array | null);
                /** Auth mediaKeys */
                mediaKeys?: (readonly groupcall.ParticipantToParticipant.MediaKey[] | null);
            }
            type AuthEncodable = types.WeakOpaque<IAuth, {
                readonly AuthEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents an Auth. */
            class Auth implements IAuth {
                /**
                 * Constructs a new Auth.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToParticipant.Handshake.IAuth);
                /** Auth pck. */
                public pck: Uint8Array;
                /** Auth pcck. */
                public pcck: Uint8Array;
                /** Auth mediaKeys. */
                public mediaKeys: readonly groupcall.ParticipantToParticipant.MediaKey[];
                /**
                 * Encodes the specified Auth message. Does not implicitly {@link groupcall.ParticipantToParticipant.Handshake.Auth.verify|verify} messages.
                 * @param message Auth message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToParticipant.Handshake.AuthEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes an Auth message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Auth
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.Handshake.Auth;
            }
            /** Properties of a GuestHello. */
            interface IGuestHello {
                /** GuestHello name */
                name?: (string | null);
                /** GuestHello pck */
                pck?: (Uint8Array | null);
                /** GuestHello pcck */
                pcck?: (Uint8Array | null);
            }
            type GuestHelloEncodable = types.WeakOpaque<IGuestHello, {
                readonly GuestHelloEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a GuestHello. */
            class GuestHello implements IGuestHello {
                /**
                 * Constructs a new GuestHello.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToParticipant.Handshake.IGuestHello);
                /** GuestHello name. */
                public name: string;
                /** GuestHello pck. */
                public pck: Uint8Array;
                /** GuestHello pcck. */
                public pcck: Uint8Array;
                /**
                 * Encodes the specified GuestHello message. Does not implicitly {@link groupcall.ParticipantToParticipant.Handshake.GuestHello.verify|verify} messages.
                 * @param message GuestHello message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToParticipant.Handshake.GuestHelloEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a GuestHello message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns GuestHello
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.Handshake.GuestHello;
            }
            /** Properties of a GuestAuth. */
            interface IGuestAuth {
                /** GuestAuth pck */
                pck?: (Uint8Array | null);
                /** GuestAuth pcck */
                pcck?: (Uint8Array | null);
                /** GuestAuth mediaKeys */
                mediaKeys?: (readonly groupcall.ParticipantToParticipant.MediaKey[] | null);
            }
            type GuestAuthEncodable = types.WeakOpaque<IGuestAuth, {
                readonly GuestAuthEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a GuestAuth. */
            class GuestAuth implements IGuestAuth {
                /**
                 * Constructs a new GuestAuth.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToParticipant.Handshake.IGuestAuth);
                /** GuestAuth pck. */
                public pck: Uint8Array;
                /** GuestAuth pcck. */
                public pcck: Uint8Array;
                /** GuestAuth mediaKeys. */
                public mediaKeys: readonly groupcall.ParticipantToParticipant.MediaKey[];
                /**
                 * Encodes the specified GuestAuth message. Does not implicitly {@link groupcall.ParticipantToParticipant.Handshake.GuestAuth.verify|verify} messages.
                 * @param message GuestAuth message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToParticipant.Handshake.GuestAuthEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a GuestAuth message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns GuestAuth
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.Handshake.GuestAuth;
            }
        }
        /** Properties of an Envelope. */
        interface IEnvelope {
            /** Envelope padding */
            padding?: (Uint8Array | null);
            /** Envelope encryptedAdminEnvelope */
            encryptedAdminEnvelope?: (Uint8Array | null);
            /** Envelope rekey */
            rekey?: (groupcall.ParticipantToParticipant.MediaKey | null);
            /** Envelope captureState */
            captureState?: (groupcall.ParticipantToParticipant.CaptureState | null);
            /** Envelope holdState */
            holdState?: (groupcall.ParticipantToParticipant.HoldState | null);
        }
        type EnvelopeEncodable = types.WeakOpaque<IEnvelope, {
            readonly EnvelopeEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an Envelope. */
        class Envelope implements IEnvelope {
            /**
             * Constructs a new Envelope.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.ParticipantToParticipant.IEnvelope);
            /** Envelope padding. */
            public padding: Uint8Array;
            /** Envelope encryptedAdminEnvelope. */
            public encryptedAdminEnvelope?: (Uint8Array | null);
            /** Envelope rekey. */
            public rekey?: (groupcall.ParticipantToParticipant.MediaKey | null);
            /** Envelope captureState. */
            public captureState?: (groupcall.ParticipantToParticipant.CaptureState | null);
            /** Envelope holdState. */
            public holdState?: (groupcall.ParticipantToParticipant.HoldState | null);
            /** Envelope content. */
            public content?: ("encryptedAdminEnvelope" | "rekey" | "captureState" | "holdState");
            /**
             * Encodes the specified Envelope message. Does not implicitly {@link groupcall.ParticipantToParticipant.Envelope.verify|verify} messages.
             * @param message Envelope message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.ParticipantToParticipant.EnvelopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an Envelope message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Envelope
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.Envelope;
        }
        /** Properties of an Admin. */
        interface IAdmin {
        }
        type AdminEncodable = types.WeakOpaque<IAdmin, {
            readonly AdminEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an Admin. */
        class Admin implements IAdmin {
            /**
             * Constructs a new Admin.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.ParticipantToParticipant.IAdmin);
            /**
             * Encodes the specified Admin message. Does not implicitly {@link groupcall.ParticipantToParticipant.Admin.verify|verify} messages.
             * @param message Admin message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.ParticipantToParticipant.AdminEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an Admin message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Admin
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.Admin;
        }
        namespace Admin {
            /** Properties of an Envelope. */
            interface IEnvelope {
                /** Envelope reportAsAdmin */
                reportAsAdmin?: (groupcall.ParticipantToParticipant.Admin.ReportAsAdmin | null);
                /** Envelope promoteToAdmin */
                promoteToAdmin?: (groupcall.ParticipantToParticipant.Admin.PromoteToAdmin | null);
                /** Envelope forceLeave */
                forceLeave?: (groupcall.ParticipantToParticipant.Admin.ForceLeave | null);
                /** Envelope forceCaptureStateOff */
                forceCaptureStateOff?: (groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff | null);
                /** Envelope forceFocus */
                forceFocus?: (groupcall.ParticipantToParticipant.Admin.ForceFocus | null);
            }
            type EnvelopeEncodable = types.WeakOpaque<IEnvelope, {
                readonly EnvelopeEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents an Envelope. */
            class Envelope implements IEnvelope {
                /**
                 * Constructs a new Envelope.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToParticipant.Admin.IEnvelope);
                /** Envelope reportAsAdmin. */
                public reportAsAdmin?: (groupcall.ParticipantToParticipant.Admin.ReportAsAdmin | null);
                /** Envelope promoteToAdmin. */
                public promoteToAdmin?: (groupcall.ParticipantToParticipant.Admin.PromoteToAdmin | null);
                /** Envelope forceLeave. */
                public forceLeave?: (groupcall.ParticipantToParticipant.Admin.ForceLeave | null);
                /** Envelope forceCaptureStateOff. */
                public forceCaptureStateOff?: (groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff | null);
                /** Envelope forceFocus. */
                public forceFocus?: (groupcall.ParticipantToParticipant.Admin.ForceFocus | null);
                /** Envelope content. */
                public content?: ("reportAsAdmin" | "promoteToAdmin" | "forceLeave" | "forceCaptureStateOff" | "forceFocus");
                /**
                 * Encodes the specified Envelope message. Does not implicitly {@link groupcall.ParticipantToParticipant.Admin.Envelope.verify|verify} messages.
                 * @param message Envelope message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToParticipant.Admin.EnvelopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes an Envelope message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Envelope
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.Admin.Envelope;
            }
            /** Properties of a ReportAsAdmin. */
            interface IReportAsAdmin {
            }
            type ReportAsAdminEncodable = types.WeakOpaque<IReportAsAdmin, {
                readonly ReportAsAdminEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a ReportAsAdmin. */
            class ReportAsAdmin implements IReportAsAdmin {
                /**
                 * Constructs a new ReportAsAdmin.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToParticipant.Admin.IReportAsAdmin);
                /**
                 * Encodes the specified ReportAsAdmin message. Does not implicitly {@link groupcall.ParticipantToParticipant.Admin.ReportAsAdmin.verify|verify} messages.
                 * @param message ReportAsAdmin message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToParticipant.Admin.ReportAsAdminEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a ReportAsAdmin message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns ReportAsAdmin
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.Admin.ReportAsAdmin;
            }
            /** Properties of a PromoteToAdmin. */
            interface IPromoteToAdmin {
                /** PromoteToAdmin gcak */
                gcak?: (Uint8Array | null);
            }
            type PromoteToAdminEncodable = types.WeakOpaque<IPromoteToAdmin, {
                readonly PromoteToAdminEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a PromoteToAdmin. */
            class PromoteToAdmin implements IPromoteToAdmin {
                /**
                 * Constructs a new PromoteToAdmin.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToParticipant.Admin.IPromoteToAdmin);
                /** PromoteToAdmin gcak. */
                public gcak: Uint8Array;
                /**
                 * Encodes the specified PromoteToAdmin message. Does not implicitly {@link groupcall.ParticipantToParticipant.Admin.PromoteToAdmin.verify|verify} messages.
                 * @param message PromoteToAdmin message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToParticipant.Admin.PromoteToAdminEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a PromoteToAdmin message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns PromoteToAdmin
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.Admin.PromoteToAdmin;
            }
            /** Properties of a ForceLeave. */
            interface IForceLeave {
            }
            type ForceLeaveEncodable = types.WeakOpaque<IForceLeave, {
                readonly ForceLeaveEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a ForceLeave. */
            class ForceLeave implements IForceLeave {
                /**
                 * Constructs a new ForceLeave.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToParticipant.Admin.IForceLeave);
                /**
                 * Encodes the specified ForceLeave message. Does not implicitly {@link groupcall.ParticipantToParticipant.Admin.ForceLeave.verify|verify} messages.
                 * @param message ForceLeave message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToParticipant.Admin.ForceLeaveEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a ForceLeave message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns ForceLeave
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.Admin.ForceLeave;
            }
            /** Properties of a ForceCaptureStateOff. */
            interface IForceCaptureStateOff {
                /** ForceCaptureStateOff device */
                device?: (groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff.Device | null);
            }
            type ForceCaptureStateOffEncodable = types.WeakOpaque<IForceCaptureStateOff, {
                readonly ForceCaptureStateOffEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a ForceCaptureStateOff. */
            class ForceCaptureStateOff implements IForceCaptureStateOff {
                /**
                 * Constructs a new ForceCaptureStateOff.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToParticipant.Admin.IForceCaptureStateOff);
                /** ForceCaptureStateOff device. */
                public device: groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff.Device;
                /**
                 * Encodes the specified ForceCaptureStateOff message. Does not implicitly {@link groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff.verify|verify} messages.
                 * @param message ForceCaptureStateOff message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOffEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a ForceCaptureStateOff message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns ForceCaptureStateOff
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff;
            }
            namespace ForceCaptureStateOff {
                /** Device enum. */
                enum Device {
                    ALL = 0,
                    MICROPHONE = 1,
                    CAMERA = 2,
                    SCREEN = 3
                }
            }
            /** Properties of a ForceFocus. */
            interface IForceFocus {
                /** ForceFocus participantId */
                participantId?: (number | null);
            }
            type ForceFocusEncodable = types.WeakOpaque<IForceFocus, {
                readonly ForceFocusEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a ForceFocus. */
            class ForceFocus implements IForceFocus {
                /**
                 * Constructs a new ForceFocus.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToParticipant.Admin.IForceFocus);
                /** ForceFocus participantId. */
                public participantId: number;
                /**
                 * Encodes the specified ForceFocus message. Does not implicitly {@link groupcall.ParticipantToParticipant.Admin.ForceFocus.verify|verify} messages.
                 * @param message ForceFocus message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToParticipant.Admin.ForceFocusEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a ForceFocus message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns ForceFocus
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.Admin.ForceFocus;
            }
        }
        /** Properties of a MediaKey. */
        interface IMediaKey {
            /** MediaKey epoch */
            epoch?: (number | null);
            /** MediaKey ratchetCounter */
            ratchetCounter?: (number | null);
            /** MediaKey pcmk */
            pcmk?: (Uint8Array | null);
        }
        type MediaKeyEncodable = types.WeakOpaque<IMediaKey, {
            readonly MediaKeyEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a MediaKey. */
        class MediaKey implements IMediaKey {
            /**
             * Constructs a new MediaKey.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.ParticipantToParticipant.IMediaKey);
            /** MediaKey epoch. */
            public epoch: number;
            /** MediaKey ratchetCounter. */
            public ratchetCounter: number;
            /** MediaKey pcmk. */
            public pcmk: Uint8Array;
            /**
             * Encodes the specified MediaKey message. Does not implicitly {@link groupcall.ParticipantToParticipant.MediaKey.verify|verify} messages.
             * @param message MediaKey message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.ParticipantToParticipant.MediaKeyEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a MediaKey message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns MediaKey
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.MediaKey;
        }
        /** Properties of a CaptureState. */
        interface ICaptureState {
            /** CaptureState microphone */
            microphone?: (groupcall.ParticipantToParticipant.CaptureState.Microphone | null);
            /** CaptureState camera */
            camera?: (groupcall.ParticipantToParticipant.CaptureState.Camera | null);
        }
        type CaptureStateEncodable = types.WeakOpaque<ICaptureState, {
            readonly CaptureStateEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a CaptureState. */
        class CaptureState implements ICaptureState {
            /**
             * Constructs a new CaptureState.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.ParticipantToParticipant.ICaptureState);
            /** CaptureState microphone. */
            public microphone?: (groupcall.ParticipantToParticipant.CaptureState.Microphone | null);
            /** CaptureState camera. */
            public camera?: (groupcall.ParticipantToParticipant.CaptureState.Camera | null);
            /** CaptureState state. */
            public state?: ("microphone" | "camera");
            /**
             * Encodes the specified CaptureState message. Does not implicitly {@link groupcall.ParticipantToParticipant.CaptureState.verify|verify} messages.
             * @param message CaptureState message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.ParticipantToParticipant.CaptureStateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a CaptureState message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns CaptureState
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.CaptureState;
        }
        namespace CaptureState {
            /** Properties of a Microphone. */
            interface IMicrophone {
                /** Microphone on */
                on?: (common.Unit | null);
                /** Microphone off */
                off?: (common.Unit | null);
            }
            type MicrophoneEncodable = types.WeakOpaque<IMicrophone, {
                readonly MicrophoneEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a Microphone. */
            class Microphone implements IMicrophone {
                /**
                 * Constructs a new Microphone.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToParticipant.CaptureState.IMicrophone);
                /** Microphone on. */
                public on?: (common.Unit | null);
                /** Microphone off. */
                public off?: (common.Unit | null);
                /** Microphone state. */
                public state?: ("on" | "off");
                /**
                 * Encodes the specified Microphone message. Does not implicitly {@link groupcall.ParticipantToParticipant.CaptureState.Microphone.verify|verify} messages.
                 * @param message Microphone message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToParticipant.CaptureState.MicrophoneEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a Microphone message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Microphone
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.CaptureState.Microphone;
            }
            /** Properties of a Camera. */
            interface ICamera {
                /** Camera on */
                on?: (common.Unit | null);
                /** Camera off */
                off?: (common.Unit | null);
            }
            type CameraEncodable = types.WeakOpaque<ICamera, {
                readonly CameraEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a Camera. */
            class Camera implements ICamera {
                /**
                 * Constructs a new Camera.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToParticipant.CaptureState.ICamera);
                /** Camera on. */
                public on?: (common.Unit | null);
                /** Camera off. */
                public off?: (common.Unit | null);
                /** Camera state. */
                public state?: ("on" | "off");
                /**
                 * Encodes the specified Camera message. Does not implicitly {@link groupcall.ParticipantToParticipant.CaptureState.Camera.verify|verify} messages.
                 * @param message Camera message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToParticipant.CaptureState.CameraEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a Camera message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Camera
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.CaptureState.Camera;
            }
            /** Properties of a Screen. */
            interface IScreen {
                /** Screen on */
                on?: (common.Unit | null);
                /** Screen off */
                off?: (common.Unit | null);
            }
            type ScreenEncodable = types.WeakOpaque<IScreen, {
                readonly ScreenEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a Screen. */
            class Screen implements IScreen {
                /**
                 * Constructs a new Screen.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: groupcall.ParticipantToParticipant.CaptureState.IScreen);
                /** Screen on. */
                public on?: (common.Unit | null);
                /** Screen off. */
                public off?: (common.Unit | null);
                /** Screen state. */
                public state?: ("on" | "off");
                /**
                 * Encodes the specified Screen message. Does not implicitly {@link groupcall.ParticipantToParticipant.CaptureState.Screen.verify|verify} messages.
                 * @param message Screen message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: groupcall.ParticipantToParticipant.CaptureState.ScreenEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a Screen message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Screen
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.CaptureState.Screen;
            }
        }
        /** Properties of a HoldState. */
        interface IHoldState {
        }
        type HoldStateEncodable = types.WeakOpaque<IHoldState, {
            readonly HoldStateEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a HoldState. */
        class HoldState implements IHoldState {
            /**
             * Constructs a new HoldState.
             * @param [properties] Properties to set
             */
            constructor(properties?: groupcall.ParticipantToParticipant.IHoldState);
            /**
             * Encodes the specified HoldState message. Does not implicitly {@link groupcall.ParticipantToParticipant.HoldState.verify|verify} messages.
             * @param message HoldState message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: groupcall.ParticipantToParticipant.HoldStateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a HoldState message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns HoldState
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): groupcall.ParticipantToParticipant.HoldState;
        }
    }
}
/** Namespace history. */
export namespace history {
    /** Properties of a DdToSd. */
    interface IDdToSd {
        /** DdToSd getSummary */
        getSummary?: (history.GetSummary | null);
        /** DdToSd beginTransfer */
        beginTransfer?: (history.BeginTransfer | null);
    }
    type DdToSdEncodable = types.WeakOpaque<IDdToSd, {
        readonly DdToSdEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a DdToSd. */
    class DdToSd implements IDdToSd {
        /**
         * Constructs a new DdToSd.
         * @param [properties] Properties to set
         */
        constructor(properties?: history.IDdToSd);
        /** DdToSd getSummary. */
        public getSummary?: (history.GetSummary | null);
        /** DdToSd beginTransfer. */
        public beginTransfer?: (history.BeginTransfer | null);
        /** DdToSd content. */
        public content?: ("getSummary" | "beginTransfer");
        /**
         * Encodes the specified DdToSd message. Does not implicitly {@link history.DdToSd.verify|verify} messages.
         * @param message DdToSd message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: history.DdToSdEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a DdToSd message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DdToSd
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): history.DdToSd;
    }
    /** Properties of a SdToDd. */
    interface ISdToDd {
        /** SdToDd summary */
        summary?: (history.Summary | null);
        /** SdToDd blobData */
        blobData?: (common.BlobData | null);
        /** SdToDd data */
        data?: (history.Data | null);
    }
    type SdToDdEncodable = types.WeakOpaque<ISdToDd, {
        readonly SdToDdEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a SdToDd. */
    class SdToDd implements ISdToDd {
        /**
         * Constructs a new SdToDd.
         * @param [properties] Properties to set
         */
        constructor(properties?: history.ISdToDd);
        /** SdToDd summary. */
        public summary?: (history.Summary | null);
        /** SdToDd blobData. */
        public blobData?: (common.BlobData | null);
        /** SdToDd data. */
        public data?: (history.Data | null);
        /** SdToDd content. */
        public content?: ("summary" | "blobData" | "data");
        /**
         * Encodes the specified SdToDd message. Does not implicitly {@link history.SdToDd.verify|verify} messages.
         * @param message SdToDd message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: history.SdToDdEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a SdToDd message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SdToDd
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): history.SdToDd;
    }
    /** MediaType enum. */
    enum MediaType {
        ALL = 0
    }
    /** Properties of a GetSummary. */
    interface IGetSummary {
        /** GetSummary id */
        id?: (number | null);
        /** GetSummary timespan */
        timespan?: (common.Timespan | null);
        /** GetSummary media */
        media?: (readonly history.MediaType[] | null);
    }
    type GetSummaryEncodable = types.WeakOpaque<IGetSummary, {
        readonly GetSummaryEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a GetSummary. */
    class GetSummary implements IGetSummary {
        /**
         * Constructs a new GetSummary.
         * @param [properties] Properties to set
         */
        constructor(properties?: history.IGetSummary);
        /** GetSummary id. */
        public id: number;
        /** GetSummary timespan. */
        public timespan?: (common.Timespan | null);
        /** GetSummary media. */
        public media: readonly history.MediaType[];
        /**
         * Encodes the specified GetSummary message. Does not implicitly {@link history.GetSummary.verify|verify} messages.
         * @param message GetSummary message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: history.GetSummaryEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a GetSummary message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetSummary
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): history.GetSummary;
    }
    /** Properties of a Summary. */
    interface ISummary {
        /** Summary id */
        id?: (number | null);
        /** Summary messages */
        messages?: (number | null);
        /** Summary size */
        size?: (Long | null);
    }
    type SummaryEncodable = types.WeakOpaque<ISummary, {
        readonly SummaryEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a Summary. */
    class Summary implements ISummary {
        /**
         * Constructs a new Summary.
         * @param [properties] Properties to set
         */
        constructor(properties?: history.ISummary);
        /** Summary id. */
        public id: number;
        /** Summary messages. */
        public messages: number;
        /** Summary size. */
        public size: Long;
        /**
         * Encodes the specified Summary message. Does not implicitly {@link history.Summary.verify|verify} messages.
         * @param message Summary message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: history.SummaryEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Summary message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Summary
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): history.Summary;
    }
    /** Properties of a BeginTransfer. */
    interface IBeginTransfer {
        /** BeginTransfer id */
        id?: (number | null);
    }
    type BeginTransferEncodable = types.WeakOpaque<IBeginTransfer, {
        readonly BeginTransferEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a BeginTransfer. */
    class BeginTransfer implements IBeginTransfer {
        /**
         * Constructs a new BeginTransfer.
         * @param [properties] Properties to set
         */
        constructor(properties?: history.IBeginTransfer);
        /** BeginTransfer id. */
        public id: number;
        /**
         * Encodes the specified BeginTransfer message. Does not implicitly {@link history.BeginTransfer.verify|verify} messages.
         * @param message BeginTransfer message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: history.BeginTransferEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a BeginTransfer message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BeginTransfer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): history.BeginTransfer;
    }
    /** Properties of a Data. */
    interface IData {
        /** Data messages */
        messages?: (readonly history.PastMessage[] | null);
        /** Data remaining */
        remaining?: (Long | null);
    }
    type DataEncodable = types.WeakOpaque<IData, {
        readonly DataEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a Data. */
    class Data implements IData {
        /**
         * Constructs a new Data.
         * @param [properties] Properties to set
         */
        constructor(properties?: history.IData);
        /** Data messages. */
        public messages: readonly history.PastMessage[];
        /** Data remaining. */
        public remaining: Long;
        /**
         * Encodes the specified Data message. Does not implicitly {@link history.Data.verify|verify} messages.
         * @param message Data message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: history.DataEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Data message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Data
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): history.Data;
    }
    /** Properties of a PastMessage. */
    interface IPastMessage {
        /** PastMessage incoming */
        incoming?: (history.PastIncomingMessage | null);
        /** PastMessage outgoing */
        outgoing?: (history.PastOutgoingMessage | null);
    }
    type PastMessageEncodable = types.WeakOpaque<IPastMessage, {
        readonly PastMessageEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a PastMessage. */
    class PastMessage implements IPastMessage {
        /**
         * Constructs a new PastMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: history.IPastMessage);
        /** PastMessage incoming. */
        public incoming?: (history.PastIncomingMessage | null);
        /** PastMessage outgoing. */
        public outgoing?: (history.PastOutgoingMessage | null);
        /** PastMessage message. */
        public message?: ("incoming" | "outgoing");
        /**
         * Encodes the specified PastMessage message. Does not implicitly {@link history.PastMessage.verify|verify} messages.
         * @param message PastMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: history.PastMessageEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a PastMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PastMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): history.PastMessage;
    }
    /** Properties of a Reaction. */
    interface IReaction {
        /** Reaction at */
        at?: (Long | null);
        /** Reaction type */
        type?: (history.Reaction.Type | null);
    }
    type ReactionEncodable = types.WeakOpaque<IReaction, {
        readonly ReactionEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a Reaction. */
    class Reaction implements IReaction {
        /**
         * Constructs a new Reaction.
         * @param [properties] Properties to set
         */
        constructor(properties?: history.IReaction);
        /** Reaction at. */
        public at: Long;
        /** Reaction type. */
        public type: history.Reaction.Type;
        /**
         * Encodes the specified Reaction message. Does not implicitly {@link history.Reaction.verify|verify} messages.
         * @param message Reaction message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: history.ReactionEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Reaction message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Reaction
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): history.Reaction;
    }
    namespace Reaction {
        /** Type enum. */
        enum Type {
            ACKNOWLEDGE = 0,
            DECLINE = 1
        }
    }
    /** Properties of a PastOutgoingMessage. */
    interface IPastOutgoingMessage {
        /** PastOutgoingMessage message */
        message?: (d2d.OutgoingMessage | null);
        /** PastOutgoingMessage sentAt */
        sentAt?: (Long | null);
        /** PastOutgoingMessage readAt */
        readAt?: (Long | null);
        /** PastOutgoingMessage lastReactionAt */
        lastReactionAt?: (history.Reaction | null);
    }
    type PastOutgoingMessageEncodable = types.WeakOpaque<IPastOutgoingMessage, {
        readonly PastOutgoingMessageEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a PastOutgoingMessage. */
    class PastOutgoingMessage implements IPastOutgoingMessage {
        /**
         * Constructs a new PastOutgoingMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: history.IPastOutgoingMessage);
        /** PastOutgoingMessage message. */
        public message?: (d2d.OutgoingMessage | null);
        /** PastOutgoingMessage sentAt. */
        public sentAt: Long;
        /** PastOutgoingMessage readAt. */
        public readAt?: (Long | null);
        /** PastOutgoingMessage lastReactionAt. */
        public lastReactionAt?: (history.Reaction | null);
        /** PastOutgoingMessage _readAt. */
        public _readAt?: "readAt";
        /**
         * Encodes the specified PastOutgoingMessage message. Does not implicitly {@link history.PastOutgoingMessage.verify|verify} messages.
         * @param message PastOutgoingMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: history.PastOutgoingMessageEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a PastOutgoingMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PastOutgoingMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): history.PastOutgoingMessage;
    }
    /** Properties of a PastIncomingMessage. */
    interface IPastIncomingMessage {
        /** PastIncomingMessage message */
        message?: (d2d.IncomingMessage | null);
        /** PastIncomingMessage receivedAt */
        receivedAt?: (Long | null);
        /** PastIncomingMessage readAt */
        readAt?: (Long | null);
        /** PastIncomingMessage lastReactionAt */
        lastReactionAt?: (history.Reaction | null);
    }
    type PastIncomingMessageEncodable = types.WeakOpaque<IPastIncomingMessage, {
        readonly PastIncomingMessageEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a PastIncomingMessage. */
    class PastIncomingMessage implements IPastIncomingMessage {
        /**
         * Constructs a new PastIncomingMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: history.IPastIncomingMessage);
        /** PastIncomingMessage message. */
        public message?: (d2d.IncomingMessage | null);
        /** PastIncomingMessage receivedAt. */
        public receivedAt: Long;
        /** PastIncomingMessage readAt. */
        public readAt?: (Long | null);
        /** PastIncomingMessage lastReactionAt. */
        public lastReactionAt?: (history.Reaction | null);
        /** PastIncomingMessage _readAt. */
        public _readAt?: "readAt";
        /**
         * Encodes the specified PastIncomingMessage message. Does not implicitly {@link history.PastIncomingMessage.verify|verify} messages.
         * @param message PastIncomingMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: history.PastIncomingMessageEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a PastIncomingMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PastIncomingMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): history.PastIncomingMessage;
    }
}
/** Namespace d2d. */
export namespace d2d {
    /** Properties of a SharedDeviceData. */
    interface ISharedDeviceData {
        /** SharedDeviceData padding */
        padding?: (Uint8Array | null);
        /** SharedDeviceData version */
        version?: (number | null);
    }
    type SharedDeviceDataEncodable = types.WeakOpaque<ISharedDeviceData, {
        readonly SharedDeviceDataEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a SharedDeviceData. */
    class SharedDeviceData implements ISharedDeviceData {
        /**
         * Constructs a new SharedDeviceData.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2d.ISharedDeviceData);
        /** SharedDeviceData padding. */
        public padding: Uint8Array;
        /** SharedDeviceData version. */
        public version: number;
        /**
         * Encodes the specified SharedDeviceData message. Does not implicitly {@link d2d.SharedDeviceData.verify|verify} messages.
         * @param message SharedDeviceData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2d.SharedDeviceDataEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a SharedDeviceData message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SharedDeviceData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.SharedDeviceData;
    }
    /** Properties of a DeviceInfo. */
    interface IDeviceInfo {
        /** DeviceInfo padding */
        padding?: (Uint8Array | null);
        /** DeviceInfo platform */
        platform?: (d2d.DeviceInfo.Platform | null);
        /** DeviceInfo platformDetails */
        platformDetails?: (string | null);
        /** DeviceInfo appVersion */
        appVersion?: (string | null);
        /** DeviceInfo label */
        label?: (string | null);
    }
    type DeviceInfoEncodable = types.WeakOpaque<IDeviceInfo, {
        readonly DeviceInfoEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a DeviceInfo. */
    class DeviceInfo implements IDeviceInfo {
        /**
         * Constructs a new DeviceInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2d.IDeviceInfo);
        /** DeviceInfo padding. */
        public padding: Uint8Array;
        /** DeviceInfo platform. */
        public platform: d2d.DeviceInfo.Platform;
        /** DeviceInfo platformDetails. */
        public platformDetails: string;
        /** DeviceInfo appVersion. */
        public appVersion: string;
        /** DeviceInfo label. */
        public label: string;
        /**
         * Encodes the specified DeviceInfo message. Does not implicitly {@link d2d.DeviceInfo.verify|verify} messages.
         * @param message DeviceInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2d.DeviceInfoEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a DeviceInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DeviceInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.DeviceInfo;
    }
    namespace DeviceInfo {
        /** Platform enum. */
        enum Platform {
            UNSPECIFIED = 0,
            ANDROID = 1,
            IOS = 2,
            DESKTOP = 3,
            WEB = 4
        }
    }
    /** Properties of a TransactionScope. */
    interface ITransactionScope {
        /** TransactionScope scope */
        scope?: (d2d.TransactionScope.Scope | null);
    }
    type TransactionScopeEncodable = types.WeakOpaque<ITransactionScope, {
        readonly TransactionScopeEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a TransactionScope. */
    class TransactionScope implements ITransactionScope {
        /**
         * Constructs a new TransactionScope.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2d.ITransactionScope);
        /** TransactionScope scope. */
        public scope: d2d.TransactionScope.Scope;
        /**
         * Encodes the specified TransactionScope message. Does not implicitly {@link d2d.TransactionScope.verify|verify} messages.
         * @param message TransactionScope message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2d.TransactionScopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a TransactionScope message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TransactionScope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.TransactionScope;
    }
    namespace TransactionScope {
        /** Scope enum. */
        enum Scope {
            USER_PROFILE_SYNC = 0,
            CONTACT_SYNC = 1,
            GROUP_SYNC = 2,
            DISTRIBUTION_LIST_SYNC = 3,
            SETTINGS_SYNC = 4,
            MDM_PARAMETER_SYNC = 5,
            NEW_DEVICE_SYNC = 6
        }
    }
    /** Properties of an Envelope. */
    interface IEnvelope {
        /** Envelope padding */
        padding?: (Uint8Array | null);
        /** Envelope deviceId */
        deviceId?: (Long | null);
        /** Envelope outgoingMessage */
        outgoingMessage?: (d2d.OutgoingMessage | null);
        /** Envelope outgoingMessageUpdate */
        outgoingMessageUpdate?: (d2d.OutgoingMessageUpdate | null);
        /** Envelope incomingMessage */
        incomingMessage?: (d2d.IncomingMessage | null);
        /** Envelope incomingMessageUpdate */
        incomingMessageUpdate?: (d2d.IncomingMessageUpdate | null);
        /** Envelope userProfileSync */
        userProfileSync?: (d2d.UserProfileSync | null);
        /** Envelope contactSync */
        contactSync?: (d2d.ContactSync | null);
        /** Envelope groupSync */
        groupSync?: (d2d.GroupSync | null);
        /** Envelope distributionListSync */
        distributionListSync?: (d2d.DistributionListSync | null);
        /** Envelope settingsSync */
        settingsSync?: (d2d.SettingsSync | null);
        /** Envelope mdmParameterSync */
        mdmParameterSync?: (d2d.MdmParameterSync | null);
    }
    type EnvelopeEncodable = types.WeakOpaque<IEnvelope, {
        readonly EnvelopeEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an Envelope. */
    class Envelope implements IEnvelope {
        /**
         * Constructs a new Envelope.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2d.IEnvelope);
        /** Envelope padding. */
        public padding: Uint8Array;
        /** Envelope deviceId. */
        public deviceId: Long;
        /** Envelope outgoingMessage. */
        public outgoingMessage?: (d2d.OutgoingMessage | null);
        /** Envelope outgoingMessageUpdate. */
        public outgoingMessageUpdate?: (d2d.OutgoingMessageUpdate | null);
        /** Envelope incomingMessage. */
        public incomingMessage?: (d2d.IncomingMessage | null);
        /** Envelope incomingMessageUpdate. */
        public incomingMessageUpdate?: (d2d.IncomingMessageUpdate | null);
        /** Envelope userProfileSync. */
        public userProfileSync?: (d2d.UserProfileSync | null);
        /** Envelope contactSync. */
        public contactSync?: (d2d.ContactSync | null);
        /** Envelope groupSync. */
        public groupSync?: (d2d.GroupSync | null);
        /** Envelope distributionListSync. */
        public distributionListSync?: (d2d.DistributionListSync | null);
        /** Envelope settingsSync. */
        public settingsSync?: (d2d.SettingsSync | null);
        /** Envelope mdmParameterSync. */
        public mdmParameterSync?: (d2d.MdmParameterSync | null);
        /** Envelope content. */
        public content?: ("outgoingMessage" | "outgoingMessageUpdate" | "incomingMessage" | "incomingMessageUpdate" | "userProfileSync" | "contactSync" | "groupSync" | "distributionListSync" | "settingsSync" | "mdmParameterSync");
        /**
         * Encodes the specified Envelope message. Does not implicitly {@link d2d.Envelope.verify|verify} messages.
         * @param message Envelope message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2d.EnvelopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an Envelope message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Envelope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.Envelope;
    }
    /** Properties of a ConversationId. */
    interface IConversationId {
        /** ConversationId contact */
        contact?: (string | null);
        /** ConversationId distributionList */
        distributionList?: (Long | null);
        /** ConversationId group */
        group?: (common.GroupIdentity | null);
    }
    type ConversationIdEncodable = types.WeakOpaque<IConversationId, {
        readonly ConversationIdEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a ConversationId. */
    class ConversationId implements IConversationId {
        /**
         * Constructs a new ConversationId.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2d.IConversationId);
        /** ConversationId contact. */
        public contact?: (string | null);
        /** ConversationId distributionList. */
        public distributionList?: (Long | null);
        /** ConversationId group. */
        public group?: (common.GroupIdentity | null);
        /** ConversationId id. */
        public id?: ("contact" | "distributionList" | "group");
        /**
         * Encodes the specified ConversationId message. Does not implicitly {@link d2d.ConversationId.verify|verify} messages.
         * @param message ConversationId message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2d.ConversationIdEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a ConversationId message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ConversationId
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.ConversationId;
    }
    /** Properties of an OutgoingMessage. */
    interface IOutgoingMessage {
        /** OutgoingMessage conversation */
        conversation?: (d2d.ConversationId | null);
        /** OutgoingMessage messageId */
        messageId?: (Long | null);
        /** OutgoingMessage threadMessageId */
        threadMessageId?: (Long | null);
        /** OutgoingMessage createdAt */
        createdAt?: (Long | null);
        /** OutgoingMessage type */
        type?: (common.CspE2eMessageType | null);
        /** OutgoingMessage body */
        body?: (Uint8Array | null);
        /** OutgoingMessage nonces */
        nonces?: (readonly Uint8Array[] | null);
    }
    type OutgoingMessageEncodable = types.WeakOpaque<IOutgoingMessage, {
        readonly OutgoingMessageEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an OutgoingMessage. */
    class OutgoingMessage implements IOutgoingMessage {
        /**
         * Constructs a new OutgoingMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2d.IOutgoingMessage);
        /** OutgoingMessage conversation. */
        public conversation?: (d2d.ConversationId | null);
        /** OutgoingMessage messageId. */
        public messageId: Long;
        /** OutgoingMessage threadMessageId. */
        public threadMessageId?: (Long | null);
        /** OutgoingMessage createdAt. */
        public createdAt: Long;
        /** OutgoingMessage type. */
        public type: common.CspE2eMessageType;
        /** OutgoingMessage body. */
        public body: Uint8Array;
        /** OutgoingMessage nonces. */
        public nonces: readonly Uint8Array[];
        /** OutgoingMessage _threadMessageId. */
        public _threadMessageId?: "threadMessageId";
        /**
         * Encodes the specified OutgoingMessage message. Does not implicitly {@link d2d.OutgoingMessage.verify|verify} messages.
         * @param message OutgoingMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2d.OutgoingMessageEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an OutgoingMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns OutgoingMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.OutgoingMessage;
    }
    /** Properties of an OutgoingMessageUpdate. */
    interface IOutgoingMessageUpdate {
        /** OutgoingMessageUpdate updates */
        updates?: (readonly d2d.OutgoingMessageUpdate.Update[] | null);
    }
    type OutgoingMessageUpdateEncodable = types.WeakOpaque<IOutgoingMessageUpdate, {
        readonly OutgoingMessageUpdateEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an OutgoingMessageUpdate. */
    class OutgoingMessageUpdate implements IOutgoingMessageUpdate {
        /**
         * Constructs a new OutgoingMessageUpdate.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2d.IOutgoingMessageUpdate);
        /** OutgoingMessageUpdate updates. */
        public updates: readonly d2d.OutgoingMessageUpdate.Update[];
        /**
         * Encodes the specified OutgoingMessageUpdate message. Does not implicitly {@link d2d.OutgoingMessageUpdate.verify|verify} messages.
         * @param message OutgoingMessageUpdate message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2d.OutgoingMessageUpdateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an OutgoingMessageUpdate message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns OutgoingMessageUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.OutgoingMessageUpdate;
    }
    namespace OutgoingMessageUpdate {
        /** Properties of a Sent. */
        interface ISent {
        }
        type SentEncodable = types.WeakOpaque<ISent, {
            readonly SentEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Sent. */
        class Sent implements ISent {
            /**
             * Constructs a new Sent.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.OutgoingMessageUpdate.ISent);
            /**
             * Encodes the specified Sent message. Does not implicitly {@link d2d.OutgoingMessageUpdate.Sent.verify|verify} messages.
             * @param message Sent message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.OutgoingMessageUpdate.SentEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Sent message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Sent
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.OutgoingMessageUpdate.Sent;
        }
        /** Properties of an Update. */
        interface IUpdate {
            /** Update conversation */
            conversation?: (d2d.ConversationId | null);
            /** Update messageId */
            messageId?: (Long | null);
            /** Update sent */
            sent?: (d2d.OutgoingMessageUpdate.Sent | null);
        }
        type UpdateEncodable = types.WeakOpaque<IUpdate, {
            readonly UpdateEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an Update. */
        class Update implements IUpdate {
            /**
             * Constructs a new Update.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.OutgoingMessageUpdate.IUpdate);
            /** Update conversation. */
            public conversation?: (d2d.ConversationId | null);
            /** Update messageId. */
            public messageId: Long;
            /** Update sent. */
            public sent?: (d2d.OutgoingMessageUpdate.Sent | null);
            /** Update update. */
            public update?: "sent";
            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.OutgoingMessageUpdate.Update.verify|verify} messages.
             * @param message Update message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.OutgoingMessageUpdate.UpdateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an Update message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.OutgoingMessageUpdate.Update;
        }
    }
    /** Properties of an IncomingMessage. */
    interface IIncomingMessage {
        /** IncomingMessage senderIdentity */
        senderIdentity?: (string | null);
        /** IncomingMessage messageId */
        messageId?: (Long | null);
        /** IncomingMessage createdAt */
        createdAt?: (Long | null);
        /** IncomingMessage type */
        type?: (common.CspE2eMessageType | null);
        /** IncomingMessage body */
        body?: (Uint8Array | null);
        /** IncomingMessage nonce */
        nonce?: (Uint8Array | null);
    }
    type IncomingMessageEncodable = types.WeakOpaque<IIncomingMessage, {
        readonly IncomingMessageEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an IncomingMessage. */
    class IncomingMessage implements IIncomingMessage {
        /**
         * Constructs a new IncomingMessage.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2d.IIncomingMessage);
        /** IncomingMessage senderIdentity. */
        public senderIdentity: string;
        /** IncomingMessage messageId. */
        public messageId: Long;
        /** IncomingMessage createdAt. */
        public createdAt: Long;
        /** IncomingMessage type. */
        public type: common.CspE2eMessageType;
        /** IncomingMessage body. */
        public body: Uint8Array;
        /** IncomingMessage nonce. */
        public nonce: Uint8Array;
        /**
         * Encodes the specified IncomingMessage message. Does not implicitly {@link d2d.IncomingMessage.verify|verify} messages.
         * @param message IncomingMessage message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2d.IncomingMessageEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an IncomingMessage message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns IncomingMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.IncomingMessage;
    }
    /** Properties of an IncomingMessageUpdate. */
    interface IIncomingMessageUpdate {
        /** IncomingMessageUpdate updates */
        updates?: (readonly d2d.IncomingMessageUpdate.Update[] | null);
    }
    type IncomingMessageUpdateEncodable = types.WeakOpaque<IIncomingMessageUpdate, {
        readonly IncomingMessageUpdateEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an IncomingMessageUpdate. */
    class IncomingMessageUpdate implements IIncomingMessageUpdate {
        /**
         * Constructs a new IncomingMessageUpdate.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2d.IIncomingMessageUpdate);
        /** IncomingMessageUpdate updates. */
        public updates: readonly d2d.IncomingMessageUpdate.Update[];
        /**
         * Encodes the specified IncomingMessageUpdate message. Does not implicitly {@link d2d.IncomingMessageUpdate.verify|verify} messages.
         * @param message IncomingMessageUpdate message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2d.IncomingMessageUpdateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an IncomingMessageUpdate message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns IncomingMessageUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.IncomingMessageUpdate;
    }
    namespace IncomingMessageUpdate {
        /** Properties of a Read. */
        interface IRead {
            /** Read at */
            at?: (Long | null);
        }
        type ReadEncodable = types.WeakOpaque<IRead, {
            readonly ReadEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Read. */
        class Read implements IRead {
            /**
             * Constructs a new Read.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.IncomingMessageUpdate.IRead);
            /** Read at. */
            public at: Long;
            /**
             * Encodes the specified Read message. Does not implicitly {@link d2d.IncomingMessageUpdate.Read.verify|verify} messages.
             * @param message Read message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.IncomingMessageUpdate.ReadEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Read message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Read
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.IncomingMessageUpdate.Read;
        }
        /** Properties of an Update. */
        interface IUpdate {
            /** Update conversation */
            conversation?: (d2d.ConversationId | null);
            /** Update messageId */
            messageId?: (Long | null);
            /** Update read */
            read?: (d2d.IncomingMessageUpdate.Read | null);
        }
        type UpdateEncodable = types.WeakOpaque<IUpdate, {
            readonly UpdateEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an Update. */
        class Update implements IUpdate {
            /**
             * Constructs a new Update.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.IncomingMessageUpdate.IUpdate);
            /** Update conversation. */
            public conversation?: (d2d.ConversationId | null);
            /** Update messageId. */
            public messageId: Long;
            /** Update read. */
            public read?: (d2d.IncomingMessageUpdate.Read | null);
            /** Update update. */
            public update?: "read";
            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.IncomingMessageUpdate.Update.verify|verify} messages.
             * @param message Update message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.IncomingMessageUpdate.UpdateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an Update message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.IncomingMessageUpdate.Update;
        }
    }
    /** Properties of a UserProfileSync. */
    interface IUserProfileSync {
        /** UserProfileSync update */
        update?: (d2d.UserProfileSync.Update | null);
    }
    type UserProfileSyncEncodable = types.WeakOpaque<IUserProfileSync, {
        readonly UserProfileSyncEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a UserProfileSync. */
    class UserProfileSync implements IUserProfileSync {
        /**
         * Constructs a new UserProfileSync.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2d.IUserProfileSync);
        /** UserProfileSync update. */
        public update?: (d2d.UserProfileSync.Update | null);
        /** UserProfileSync action. */
        public action?: "update";
        /**
         * Encodes the specified UserProfileSync message. Does not implicitly {@link d2d.UserProfileSync.verify|verify} messages.
         * @param message UserProfileSync message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2d.UserProfileSyncEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a UserProfileSync message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns UserProfileSync
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.UserProfileSync;
    }
    namespace UserProfileSync {
        /** Properties of an Update. */
        interface IUpdate {
            /** Update userProfile */
            userProfile?: (sync.UserProfile | null);
        }
        type UpdateEncodable = types.WeakOpaque<IUpdate, {
            readonly UpdateEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an Update. */
        class Update implements IUpdate {
            /**
             * Constructs a new Update.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.UserProfileSync.IUpdate);
            /** Update userProfile. */
            public userProfile?: (sync.UserProfile | null);
            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.UserProfileSync.Update.verify|verify} messages.
             * @param message Update message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.UserProfileSync.UpdateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an Update message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.UserProfileSync.Update;
        }
    }
    /** Properties of a ContactSync. */
    interface IContactSync {
        /** ContactSync create */
        create?: (d2d.ContactSync.Create | null);
        /** ContactSync update */
        update?: (d2d.ContactSync.Update | null);
        /** ContactSync delete */
        "delete"?: (d2d.ContactSync.Delete | null);
    }
    type ContactSyncEncodable = types.WeakOpaque<IContactSync, {
        readonly ContactSyncEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a ContactSync. */
    class ContactSync implements IContactSync {
        /**
         * Constructs a new ContactSync.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2d.IContactSync);
        /** ContactSync create. */
        public create?: (d2d.ContactSync.Create | null);
        /** ContactSync update. */
        public update?: (d2d.ContactSync.Update | null);
        /** ContactSync delete. */
        public delete?: (d2d.ContactSync.Delete | null);
        /** ContactSync action. */
        public action?: ("create" | "update" | "delete");
        /**
         * Encodes the specified ContactSync message. Does not implicitly {@link d2d.ContactSync.verify|verify} messages.
         * @param message ContactSync message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2d.ContactSyncEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a ContactSync message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ContactSync
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.ContactSync;
    }
    namespace ContactSync {
        /** Properties of a Create. */
        interface ICreate {
            /** Create contact */
            contact?: (sync.Contact | null);
        }
        type CreateEncodable = types.WeakOpaque<ICreate, {
            readonly CreateEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Create. */
        class Create implements ICreate {
            /**
             * Constructs a new Create.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.ContactSync.ICreate);
            /** Create contact. */
            public contact?: (sync.Contact | null);
            /**
             * Encodes the specified Create message. Does not implicitly {@link d2d.ContactSync.Create.verify|verify} messages.
             * @param message Create message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.ContactSync.CreateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Create message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Create
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.ContactSync.Create;
        }
        /** Properties of an Update. */
        interface IUpdate {
            /** Update contact */
            contact?: (sync.Contact | null);
        }
        type UpdateEncodable = types.WeakOpaque<IUpdate, {
            readonly UpdateEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an Update. */
        class Update implements IUpdate {
            /**
             * Constructs a new Update.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.ContactSync.IUpdate);
            /** Update contact. */
            public contact?: (sync.Contact | null);
            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.ContactSync.Update.verify|verify} messages.
             * @param message Update message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.ContactSync.UpdateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an Update message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.ContactSync.Update;
        }
        /** Properties of a Delete. */
        interface IDelete {
            /** Delete deleteIdentity */
            deleteIdentity?: (string | null);
        }
        type DeleteEncodable = types.WeakOpaque<IDelete, {
            readonly DeleteEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Delete. */
        class Delete implements IDelete {
            /**
             * Constructs a new Delete.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.ContactSync.IDelete);
            /** Delete deleteIdentity. */
            public deleteIdentity: string;
            /**
             * Encodes the specified Delete message. Does not implicitly {@link d2d.ContactSync.Delete.verify|verify} messages.
             * @param message Delete message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.ContactSync.DeleteEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Delete message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Delete
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.ContactSync.Delete;
        }
    }
    /** Properties of a GroupSync. */
    interface IGroupSync {
        /** GroupSync create */
        create?: (d2d.GroupSync.Create | null);
        /** GroupSync update */
        update?: (d2d.GroupSync.Update | null);
        /** GroupSync delete */
        "delete"?: (d2d.GroupSync.Delete | null);
    }
    type GroupSyncEncodable = types.WeakOpaque<IGroupSync, {
        readonly GroupSyncEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a GroupSync. */
    class GroupSync implements IGroupSync {
        /**
         * Constructs a new GroupSync.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2d.IGroupSync);
        /** GroupSync create. */
        public create?: (d2d.GroupSync.Create | null);
        /** GroupSync update. */
        public update?: (d2d.GroupSync.Update | null);
        /** GroupSync delete. */
        public delete?: (d2d.GroupSync.Delete | null);
        /** GroupSync action. */
        public action?: ("create" | "update" | "delete");
        /**
         * Encodes the specified GroupSync message. Does not implicitly {@link d2d.GroupSync.verify|verify} messages.
         * @param message GroupSync message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2d.GroupSyncEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a GroupSync message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GroupSync
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.GroupSync;
    }
    namespace GroupSync {
        /** Properties of a Create. */
        interface ICreate {
            /** Create group */
            group?: (sync.Group | null);
        }
        type CreateEncodable = types.WeakOpaque<ICreate, {
            readonly CreateEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Create. */
        class Create implements ICreate {
            /**
             * Constructs a new Create.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.GroupSync.ICreate);
            /** Create group. */
            public group?: (sync.Group | null);
            /**
             * Encodes the specified Create message. Does not implicitly {@link d2d.GroupSync.Create.verify|verify} messages.
             * @param message Create message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.GroupSync.CreateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Create message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Create
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.GroupSync.Create;
        }
        /** Properties of an Update. */
        interface IUpdate {
            /** Update group */
            group?: (sync.Group | null);
        }
        type UpdateEncodable = types.WeakOpaque<IUpdate, {
            readonly UpdateEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an Update. */
        class Update implements IUpdate {
            /**
             * Constructs a new Update.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.GroupSync.IUpdate);
            /** Update group. */
            public group?: (sync.Group | null);
            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.GroupSync.Update.verify|verify} messages.
             * @param message Update message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.GroupSync.UpdateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an Update message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.GroupSync.Update;
        }
        /** Properties of a Delete. */
        interface IDelete {
            /** Delete groupIdentity */
            groupIdentity?: (common.GroupIdentity | null);
        }
        type DeleteEncodable = types.WeakOpaque<IDelete, {
            readonly DeleteEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Delete. */
        class Delete implements IDelete {
            /**
             * Constructs a new Delete.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.GroupSync.IDelete);
            /** Delete groupIdentity. */
            public groupIdentity?: (common.GroupIdentity | null);
            /**
             * Encodes the specified Delete message. Does not implicitly {@link d2d.GroupSync.Delete.verify|verify} messages.
             * @param message Delete message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.GroupSync.DeleteEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Delete message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Delete
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.GroupSync.Delete;
        }
    }
    /** Properties of a DistributionListSync. */
    interface IDistributionListSync {
        /** DistributionListSync create */
        create?: (d2d.DistributionListSync.Create | null);
        /** DistributionListSync update */
        update?: (d2d.DistributionListSync.Update | null);
        /** DistributionListSync delete */
        "delete"?: (d2d.DistributionListSync.Delete | null);
    }
    type DistributionListSyncEncodable = types.WeakOpaque<IDistributionListSync, {
        readonly DistributionListSyncEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a DistributionListSync. */
    class DistributionListSync implements IDistributionListSync {
        /**
         * Constructs a new DistributionListSync.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2d.IDistributionListSync);
        /** DistributionListSync create. */
        public create?: (d2d.DistributionListSync.Create | null);
        /** DistributionListSync update. */
        public update?: (d2d.DistributionListSync.Update | null);
        /** DistributionListSync delete. */
        public delete?: (d2d.DistributionListSync.Delete | null);
        /** DistributionListSync action. */
        public action?: ("create" | "update" | "delete");
        /**
         * Encodes the specified DistributionListSync message. Does not implicitly {@link d2d.DistributionListSync.verify|verify} messages.
         * @param message DistributionListSync message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2d.DistributionListSyncEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a DistributionListSync message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DistributionListSync
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.DistributionListSync;
    }
    namespace DistributionListSync {
        /** Properties of a Create. */
        interface ICreate {
            /** Create distributionList */
            distributionList?: (sync.DistributionList | null);
        }
        type CreateEncodable = types.WeakOpaque<ICreate, {
            readonly CreateEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Create. */
        class Create implements ICreate {
            /**
             * Constructs a new Create.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.DistributionListSync.ICreate);
            /** Create distributionList. */
            public distributionList?: (sync.DistributionList | null);
            /**
             * Encodes the specified Create message. Does not implicitly {@link d2d.DistributionListSync.Create.verify|verify} messages.
             * @param message Create message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.DistributionListSync.CreateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Create message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Create
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.DistributionListSync.Create;
        }
        /** Properties of an Update. */
        interface IUpdate {
            /** Update distributionList */
            distributionList?: (sync.DistributionList | null);
        }
        type UpdateEncodable = types.WeakOpaque<IUpdate, {
            readonly UpdateEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an Update. */
        class Update implements IUpdate {
            /**
             * Constructs a new Update.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.DistributionListSync.IUpdate);
            /** Update distributionList. */
            public distributionList?: (sync.DistributionList | null);
            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.DistributionListSync.Update.verify|verify} messages.
             * @param message Update message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.DistributionListSync.UpdateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an Update message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.DistributionListSync.Update;
        }
        /** Properties of a Delete. */
        interface IDelete {
            /** Delete distributionListId */
            distributionListId?: (Long | null);
        }
        type DeleteEncodable = types.WeakOpaque<IDelete, {
            readonly DeleteEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Delete. */
        class Delete implements IDelete {
            /**
             * Constructs a new Delete.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.DistributionListSync.IDelete);
            /** Delete distributionListId. */
            public distributionListId: Long;
            /**
             * Encodes the specified Delete message. Does not implicitly {@link d2d.DistributionListSync.Delete.verify|verify} messages.
             * @param message Delete message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.DistributionListSync.DeleteEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Delete message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Delete
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.DistributionListSync.Delete;
        }
    }
    /** Properties of a SettingsSync. */
    interface ISettingsSync {
        /** SettingsSync update */
        update?: (d2d.SettingsSync.Update | null);
    }
    type SettingsSyncEncodable = types.WeakOpaque<ISettingsSync, {
        readonly SettingsSyncEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a SettingsSync. */
    class SettingsSync implements ISettingsSync {
        /**
         * Constructs a new SettingsSync.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2d.ISettingsSync);
        /** SettingsSync update. */
        public update?: (d2d.SettingsSync.Update | null);
        /** SettingsSync action. */
        public action?: "update";
        /**
         * Encodes the specified SettingsSync message. Does not implicitly {@link d2d.SettingsSync.verify|verify} messages.
         * @param message SettingsSync message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2d.SettingsSyncEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a SettingsSync message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SettingsSync
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.SettingsSync;
    }
    namespace SettingsSync {
        /** Properties of an Update. */
        interface IUpdate {
            /** Update settings */
            settings?: (sync.Settings | null);
        }
        type UpdateEncodable = types.WeakOpaque<IUpdate, {
            readonly UpdateEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an Update. */
        class Update implements IUpdate {
            /**
             * Constructs a new Update.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.SettingsSync.IUpdate);
            /** Update settings. */
            public settings?: (sync.Settings | null);
            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.SettingsSync.Update.verify|verify} messages.
             * @param message Update message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.SettingsSync.UpdateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an Update message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.SettingsSync.Update;
        }
    }
    /** Properties of a MdmParameterSync. */
    interface IMdmParameterSync {
        /** MdmParameterSync update */
        update?: (d2d.MdmParameterSync.Update | null);
    }
    type MdmParameterSyncEncodable = types.WeakOpaque<IMdmParameterSync, {
        readonly MdmParameterSyncEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a MdmParameterSync. */
    class MdmParameterSync implements IMdmParameterSync {
        /**
         * Constructs a new MdmParameterSync.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2d.IMdmParameterSync);
        /** MdmParameterSync update. */
        public update?: (d2d.MdmParameterSync.Update | null);
        /** MdmParameterSync action. */
        public action?: "update";
        /**
         * Encodes the specified MdmParameterSync message. Does not implicitly {@link d2d.MdmParameterSync.verify|verify} messages.
         * @param message MdmParameterSync message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2d.MdmParameterSyncEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a MdmParameterSync message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns MdmParameterSync
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.MdmParameterSync;
    }
    namespace MdmParameterSync {
        /** Properties of an Update. */
        interface IUpdate {
            /** Update parameters */
            parameters?: (sync.MdmParameters | null);
        }
        type UpdateEncodable = types.WeakOpaque<IUpdate, {
            readonly UpdateEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an Update. */
        class Update implements IUpdate {
            /**
             * Constructs a new Update.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2d.MdmParameterSync.IUpdate);
            /** Update parameters. */
            public parameters?: (sync.MdmParameters | null);
            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.MdmParameterSync.Update.verify|verify} messages.
             * @param message Update message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2d.MdmParameterSync.UpdateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an Update message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2d.MdmParameterSync.Update;
        }
    }
}
/** Namespace sync. */
export namespace sync {
    /** ReadReceiptPolicy enum. */
    enum ReadReceiptPolicy {
        SEND_READ_RECEIPT = 0,
        DONT_SEND_READ_RECEIPT = 1
    }
    /** TypingIndicatorPolicy enum. */
    enum TypingIndicatorPolicy {
        SEND_TYPING_INDICATOR = 0,
        DONT_SEND_TYPING_INDICATOR = 1
    }
    /** NotificationSoundPolicy enum. */
    enum NotificationSoundPolicy {
        MUTED = 0
    }
    /** ConversationVisibility enum. */
    enum ConversationVisibility {
        NORMAL = 0,
        PINNED = 2,
        ARCHIVED = 1
    }
    /** ConversationCategory enum. */
    enum ConversationCategory {
        DEFAULT = 0,
        PROTECTED = 1
    }
    /** Properties of a MdmParameters. */
    interface IMdmParameters {
        /** MdmParameters externalParameters */
        externalParameters?: ({
            [k: string]: sync.MdmParameters.Parameter;
        } | null);
        /** MdmParameters threemaParameters */
        threemaParameters?: ({
            [k: string]: sync.MdmParameters.Parameter;
        } | null);
        /** MdmParameters parameterPrecedence */
        parameterPrecedence?: (sync.MdmParameters.ParameterPrecedence | null);
    }
    type MdmParametersEncodable = types.WeakOpaque<IMdmParameters, {
        readonly MdmParametersEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a MdmParameters. */
    class MdmParameters implements IMdmParameters {
        /**
         * Constructs a new MdmParameters.
         * @param [properties] Properties to set
         */
        constructor(properties?: sync.IMdmParameters);
        /** MdmParameters externalParameters. */
        public externalParameters: {
            [k: string]: sync.MdmParameters.Parameter;
        };
        /** MdmParameters threemaParameters. */
        public threemaParameters: {
            [k: string]: sync.MdmParameters.Parameter;
        };
        /** MdmParameters parameterPrecedence. */
        public parameterPrecedence: sync.MdmParameters.ParameterPrecedence;
        /**
         * Encodes the specified MdmParameters message. Does not implicitly {@link sync.MdmParameters.verify|verify} messages.
         * @param message MdmParameters message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: sync.MdmParametersEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a MdmParameters message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns MdmParameters
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.MdmParameters;
    }
    namespace MdmParameters {
        /** Properties of a Parameter. */
        interface IParameter {
            /** Parameter stringValue */
            stringValue?: (string | null);
            /** Parameter integerValue */
            integerValue?: (Long | null);
            /** Parameter booleanValue */
            booleanValue?: (boolean | null);
        }
        type ParameterEncodable = types.WeakOpaque<IParameter, {
            readonly ParameterEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Parameter. */
        class Parameter implements IParameter {
            /**
             * Constructs a new Parameter.
             * @param [properties] Properties to set
             */
            constructor(properties?: sync.MdmParameters.IParameter);
            /** Parameter stringValue. */
            public stringValue?: (string | null);
            /** Parameter integerValue. */
            public integerValue?: (Long | null);
            /** Parameter booleanValue. */
            public booleanValue?: (boolean | null);
            /** Parameter value. */
            public value?: ("stringValue" | "integerValue" | "booleanValue");
            /**
             * Encodes the specified Parameter message. Does not implicitly {@link sync.MdmParameters.Parameter.verify|verify} messages.
             * @param message Parameter message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: sync.MdmParameters.ParameterEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Parameter message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Parameter
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.MdmParameters.Parameter;
        }
        /** ParameterPrecedence enum. */
        enum ParameterPrecedence {
            THREEMA = 0,
            EXTERNAL = 1
        }
    }
    /** Properties of a ThreemaWorkCredentials. */
    interface IThreemaWorkCredentials {
        /** ThreemaWorkCredentials username */
        username?: (string | null);
        /** ThreemaWorkCredentials password */
        password?: (string | null);
    }
    type ThreemaWorkCredentialsEncodable = types.WeakOpaque<IThreemaWorkCredentials, {
        readonly ThreemaWorkCredentialsEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a ThreemaWorkCredentials. */
    class ThreemaWorkCredentials implements IThreemaWorkCredentials {
        /**
         * Constructs a new ThreemaWorkCredentials.
         * @param [properties] Properties to set
         */
        constructor(properties?: sync.IThreemaWorkCredentials);
        /** ThreemaWorkCredentials username. */
        public username: string;
        /** ThreemaWorkCredentials password. */
        public password: string;
        /**
         * Encodes the specified ThreemaWorkCredentials message. Does not implicitly {@link sync.ThreemaWorkCredentials.verify|verify} messages.
         * @param message ThreemaWorkCredentials message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: sync.ThreemaWorkCredentialsEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a ThreemaWorkCredentials message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ThreemaWorkCredentials
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.ThreemaWorkCredentials;
    }
    /** Properties of a UserProfile. */
    interface IUserProfile {
        /** UserProfile nickname */
        nickname?: (string | null);
        /** UserProfile profilePicture */
        profilePicture?: (common.DeltaImage | null);
        /** UserProfile profilePictureShareWith */
        profilePictureShareWith?: (sync.UserProfile.ProfilePictureShareWith | null);
        /** UserProfile identityLinks */
        identityLinks?: (sync.UserProfile.IdentityLinks | null);
    }
    type UserProfileEncodable = types.WeakOpaque<IUserProfile, {
        readonly UserProfileEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a UserProfile. */
    class UserProfile implements IUserProfile {
        /**
         * Constructs a new UserProfile.
         * @param [properties] Properties to set
         */
        constructor(properties?: sync.IUserProfile);
        /** UserProfile nickname. */
        public nickname?: (string | null);
        /** UserProfile profilePicture. */
        public profilePicture?: (common.DeltaImage | null);
        /** UserProfile profilePictureShareWith. */
        public profilePictureShareWith?: (sync.UserProfile.ProfilePictureShareWith | null);
        /** UserProfile identityLinks. */
        public identityLinks?: (sync.UserProfile.IdentityLinks | null);
        /** UserProfile _nickname. */
        public _nickname?: "nickname";
        /**
         * Encodes the specified UserProfile message. Does not implicitly {@link sync.UserProfile.verify|verify} messages.
         * @param message UserProfile message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: sync.UserProfileEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a UserProfile message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns UserProfile
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.UserProfile;
    }
    namespace UserProfile {
        /** Properties of a ProfilePictureShareWith. */
        interface IProfilePictureShareWith {
            /** ProfilePictureShareWith nobody */
            nobody?: (common.Unit | null);
            /** ProfilePictureShareWith everyone */
            everyone?: (common.Unit | null);
            /** ProfilePictureShareWith allowList */
            allowList?: (common.Identities | null);
        }
        type ProfilePictureShareWithEncodable = types.WeakOpaque<IProfilePictureShareWith, {
            readonly ProfilePictureShareWithEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a ProfilePictureShareWith. */
        class ProfilePictureShareWith implements IProfilePictureShareWith {
            /**
             * Constructs a new ProfilePictureShareWith.
             * @param [properties] Properties to set
             */
            constructor(properties?: sync.UserProfile.IProfilePictureShareWith);
            /** ProfilePictureShareWith nobody. */
            public nobody?: (common.Unit | null);
            /** ProfilePictureShareWith everyone. */
            public everyone?: (common.Unit | null);
            /** ProfilePictureShareWith allowList. */
            public allowList?: (common.Identities | null);
            /** ProfilePictureShareWith policy. */
            public policy?: ("nobody" | "everyone" | "allowList");
            /**
             * Encodes the specified ProfilePictureShareWith message. Does not implicitly {@link sync.UserProfile.ProfilePictureShareWith.verify|verify} messages.
             * @param message ProfilePictureShareWith message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: sync.UserProfile.ProfilePictureShareWithEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a ProfilePictureShareWith message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ProfilePictureShareWith
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.UserProfile.ProfilePictureShareWith;
        }
        /** Properties of an IdentityLinks. */
        interface IIdentityLinks {
            /** IdentityLinks links */
            links?: (readonly sync.UserProfile.IdentityLinks.IdentityLink[] | null);
        }
        type IdentityLinksEncodable = types.WeakOpaque<IIdentityLinks, {
            readonly IdentityLinksEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an IdentityLinks. */
        class IdentityLinks implements IIdentityLinks {
            /**
             * Constructs a new IdentityLinks.
             * @param [properties] Properties to set
             */
            constructor(properties?: sync.UserProfile.IIdentityLinks);
            /** IdentityLinks links. */
            public links: readonly sync.UserProfile.IdentityLinks.IdentityLink[];
            /**
             * Encodes the specified IdentityLinks message. Does not implicitly {@link sync.UserProfile.IdentityLinks.verify|verify} messages.
             * @param message IdentityLinks message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: sync.UserProfile.IdentityLinksEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an IdentityLinks message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns IdentityLinks
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.UserProfile.IdentityLinks;
        }
        namespace IdentityLinks {
            /** Properties of an IdentityLink. */
            interface IIdentityLink {
                /** IdentityLink phoneNumber */
                phoneNumber?: (string | null);
                /** IdentityLink email */
                email?: (string | null);
                /** IdentityLink description */
                description?: (string | null);
            }
            type IdentityLinkEncodable = types.WeakOpaque<IIdentityLink, {
                readonly IdentityLinkEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents an IdentityLink. */
            class IdentityLink implements IIdentityLink {
                /**
                 * Constructs a new IdentityLink.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: sync.UserProfile.IdentityLinks.IIdentityLink);
                /** IdentityLink phoneNumber. */
                public phoneNumber?: (string | null);
                /** IdentityLink email. */
                public email?: (string | null);
                /** IdentityLink description. */
                public description: string;
                /** IdentityLink type. */
                public type?: ("phoneNumber" | "email");
                /**
                 * Encodes the specified IdentityLink message. Does not implicitly {@link sync.UserProfile.IdentityLinks.IdentityLink.verify|verify} messages.
                 * @param message IdentityLink message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: sync.UserProfile.IdentityLinks.IdentityLinkEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes an IdentityLink message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns IdentityLink
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.UserProfile.IdentityLinks.IdentityLink;
            }
        }
    }
    /** Properties of a Contact. */
    interface IContact {
        /** Contact identity */
        identity?: (string | null);
        /** Contact publicKey */
        publicKey?: (Uint8Array | null);
        /** Contact createdAt */
        createdAt?: (Long | null);
        /** Contact firstName */
        firstName?: (string | null);
        /** Contact lastName */
        lastName?: (string | null);
        /** Contact nickname */
        nickname?: (string | null);
        /** Contact verificationLevel */
        verificationLevel?: (sync.Contact.VerificationLevel | null);
        /** Contact workVerificationLevel */
        workVerificationLevel?: (sync.Contact.WorkVerificationLevel | null);
        /** Contact identityType */
        identityType?: (sync.Contact.IdentityType | null);
        /** Contact acquaintanceLevel */
        acquaintanceLevel?: (sync.Contact.AcquaintanceLevel | null);
        /** Contact activityState */
        activityState?: (sync.Contact.ActivityState | null);
        /** Contact featureMask */
        featureMask?: (Long | null);
        /** Contact syncState */
        syncState?: (sync.Contact.SyncState | null);
        /** Contact readReceiptPolicyOverride */
        readReceiptPolicyOverride?: (sync.Contact.ReadReceiptPolicyOverride | null);
        /** Contact typingIndicatorPolicyOverride */
        typingIndicatorPolicyOverride?: (sync.Contact.TypingIndicatorPolicyOverride | null);
        /** Contact notificationTriggerPolicyOverride */
        notificationTriggerPolicyOverride?: (sync.Contact.NotificationTriggerPolicyOverride | null);
        /** Contact notificationSoundPolicyOverride */
        notificationSoundPolicyOverride?: (sync.Contact.NotificationSoundPolicyOverride | null);
        /** Contact contactDefinedProfilePicture */
        contactDefinedProfilePicture?: (common.DeltaImage | null);
        /** Contact userDefinedProfilePicture */
        userDefinedProfilePicture?: (common.DeltaImage | null);
        /** Contact conversationCategory */
        conversationCategory?: (sync.ConversationCategory | null);
        /** Contact conversationVisibility */
        conversationVisibility?: (sync.ConversationVisibility | null);
    }
    type ContactEncodable = types.WeakOpaque<IContact, {
        readonly ContactEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a Contact. */
    class Contact implements IContact {
        /**
         * Constructs a new Contact.
         * @param [properties] Properties to set
         */
        constructor(properties?: sync.IContact);
        /** Contact identity. */
        public identity: string;
        /** Contact publicKey. */
        public publicKey?: (Uint8Array | null);
        /** Contact createdAt. */
        public createdAt?: (Long | null);
        /** Contact firstName. */
        public firstName?: (string | null);
        /** Contact lastName. */
        public lastName?: (string | null);
        /** Contact nickname. */
        public nickname?: (string | null);
        /** Contact verificationLevel. */
        public verificationLevel?: (sync.Contact.VerificationLevel | null);
        /** Contact workVerificationLevel. */
        public workVerificationLevel?: (sync.Contact.WorkVerificationLevel | null);
        /** Contact identityType. */
        public identityType?: (sync.Contact.IdentityType | null);
        /** Contact acquaintanceLevel. */
        public acquaintanceLevel?: (sync.Contact.AcquaintanceLevel | null);
        /** Contact activityState. */
        public activityState?: (sync.Contact.ActivityState | null);
        /** Contact featureMask. */
        public featureMask?: (Long | null);
        /** Contact syncState. */
        public syncState?: (sync.Contact.SyncState | null);
        /** Contact readReceiptPolicyOverride. */
        public readReceiptPolicyOverride?: (sync.Contact.ReadReceiptPolicyOverride | null);
        /** Contact typingIndicatorPolicyOverride. */
        public typingIndicatorPolicyOverride?: (sync.Contact.TypingIndicatorPolicyOverride | null);
        /** Contact notificationTriggerPolicyOverride. */
        public notificationTriggerPolicyOverride?: (sync.Contact.NotificationTriggerPolicyOverride | null);
        /** Contact notificationSoundPolicyOverride. */
        public notificationSoundPolicyOverride?: (sync.Contact.NotificationSoundPolicyOverride | null);
        /** Contact contactDefinedProfilePicture. */
        public contactDefinedProfilePicture?: (common.DeltaImage | null);
        /** Contact userDefinedProfilePicture. */
        public userDefinedProfilePicture?: (common.DeltaImage | null);
        /** Contact conversationCategory. */
        public conversationCategory?: (sync.ConversationCategory | null);
        /** Contact conversationVisibility. */
        public conversationVisibility?: (sync.ConversationVisibility | null);
        /** Contact _publicKey. */
        public _publicKey?: "publicKey";
        /** Contact _createdAt. */
        public _createdAt?: "createdAt";
        /** Contact _firstName. */
        public _firstName?: "firstName";
        /** Contact _lastName. */
        public _lastName?: "lastName";
        /** Contact _nickname. */
        public _nickname?: "nickname";
        /** Contact _verificationLevel. */
        public _verificationLevel?: "verificationLevel";
        /** Contact _workVerificationLevel. */
        public _workVerificationLevel?: "workVerificationLevel";
        /** Contact _identityType. */
        public _identityType?: "identityType";
        /** Contact _acquaintanceLevel. */
        public _acquaintanceLevel?: "acquaintanceLevel";
        /** Contact _activityState. */
        public _activityState?: "activityState";
        /** Contact _featureMask. */
        public _featureMask?: "featureMask";
        /** Contact _syncState. */
        public _syncState?: "syncState";
        /** Contact _conversationCategory. */
        public _conversationCategory?: "conversationCategory";
        /** Contact _conversationVisibility. */
        public _conversationVisibility?: "conversationVisibility";
        /**
         * Encodes the specified Contact message. Does not implicitly {@link sync.Contact.verify|verify} messages.
         * @param message Contact message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: sync.ContactEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Contact message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Contact
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.Contact;
    }
    namespace Contact {
        /** VerificationLevel enum. */
        enum VerificationLevel {
            UNVERIFIED = 0,
            SERVER_VERIFIED = 1,
            FULLY_VERIFIED = 2
        }
        /** WorkVerificationLevel enum. */
        enum WorkVerificationLevel {
            NONE = 0,
            WORK_SUBSCRIPTION_VERIFIED = 1
        }
        /** IdentityType enum. */
        enum IdentityType {
            REGULAR = 0,
            WORK = 1
        }
        /** AcquaintanceLevel enum. */
        enum AcquaintanceLevel {
            DIRECT = 0,
            GROUP = 1
        }
        /** ActivityState enum. */
        enum ActivityState {
            ACTIVE = 0,
            INACTIVE = 1,
            INVALID = 2
        }
        /** SyncState enum. */
        enum SyncState {
            INITIAL = 0,
            IMPORTED = 1,
            CUSTOM = 2
        }
        /** Properties of a ReadReceiptPolicyOverride. */
        interface IReadReceiptPolicyOverride {
            /** ReadReceiptPolicyOverride default */
            "default"?: (common.Unit | null);
            /** ReadReceiptPolicyOverride policy */
            policy?: (sync.ReadReceiptPolicy | null);
        }
        type ReadReceiptPolicyOverrideEncodable = types.WeakOpaque<IReadReceiptPolicyOverride, {
            readonly ReadReceiptPolicyOverrideEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a ReadReceiptPolicyOverride. */
        class ReadReceiptPolicyOverride implements IReadReceiptPolicyOverride {
            /**
             * Constructs a new ReadReceiptPolicyOverride.
             * @param [properties] Properties to set
             */
            constructor(properties?: sync.Contact.IReadReceiptPolicyOverride);
            /** ReadReceiptPolicyOverride default. */
            public default?: (common.Unit | null);
            /** ReadReceiptPolicyOverride policy. */
            public policy?: (sync.ReadReceiptPolicy | null);
            /** ReadReceiptPolicyOverride override. */
            public override?: ("default" | "policy");
            /**
             * Encodes the specified ReadReceiptPolicyOverride message. Does not implicitly {@link sync.Contact.ReadReceiptPolicyOverride.verify|verify} messages.
             * @param message ReadReceiptPolicyOverride message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: sync.Contact.ReadReceiptPolicyOverrideEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a ReadReceiptPolicyOverride message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns ReadReceiptPolicyOverride
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.Contact.ReadReceiptPolicyOverride;
        }
        /** Properties of a TypingIndicatorPolicyOverride. */
        interface ITypingIndicatorPolicyOverride {
            /** TypingIndicatorPolicyOverride default */
            "default"?: (common.Unit | null);
            /** TypingIndicatorPolicyOverride policy */
            policy?: (sync.TypingIndicatorPolicy | null);
        }
        type TypingIndicatorPolicyOverrideEncodable = types.WeakOpaque<ITypingIndicatorPolicyOverride, {
            readonly TypingIndicatorPolicyOverrideEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a TypingIndicatorPolicyOverride. */
        class TypingIndicatorPolicyOverride implements ITypingIndicatorPolicyOverride {
            /**
             * Constructs a new TypingIndicatorPolicyOverride.
             * @param [properties] Properties to set
             */
            constructor(properties?: sync.Contact.ITypingIndicatorPolicyOverride);
            /** TypingIndicatorPolicyOverride default. */
            public default?: (common.Unit | null);
            /** TypingIndicatorPolicyOverride policy. */
            public policy?: (sync.TypingIndicatorPolicy | null);
            /** TypingIndicatorPolicyOverride override. */
            public override?: ("default" | "policy");
            /**
             * Encodes the specified TypingIndicatorPolicyOverride message. Does not implicitly {@link sync.Contact.TypingIndicatorPolicyOverride.verify|verify} messages.
             * @param message TypingIndicatorPolicyOverride message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: sync.Contact.TypingIndicatorPolicyOverrideEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a TypingIndicatorPolicyOverride message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns TypingIndicatorPolicyOverride
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.Contact.TypingIndicatorPolicyOverride;
        }
        /** Properties of a NotificationTriggerPolicyOverride. */
        interface INotificationTriggerPolicyOverride {
            /** NotificationTriggerPolicyOverride default */
            "default"?: (common.Unit | null);
            /** NotificationTriggerPolicyOverride policy */
            policy?: (sync.Contact.NotificationTriggerPolicyOverride.Policy | null);
        }
        type NotificationTriggerPolicyOverrideEncodable = types.WeakOpaque<INotificationTriggerPolicyOverride, {
            readonly NotificationTriggerPolicyOverrideEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a NotificationTriggerPolicyOverride. */
        class NotificationTriggerPolicyOverride implements INotificationTriggerPolicyOverride {
            /**
             * Constructs a new NotificationTriggerPolicyOverride.
             * @param [properties] Properties to set
             */
            constructor(properties?: sync.Contact.INotificationTriggerPolicyOverride);
            /** NotificationTriggerPolicyOverride default. */
            public default?: (common.Unit | null);
            /** NotificationTriggerPolicyOverride policy. */
            public policy?: (sync.Contact.NotificationTriggerPolicyOverride.Policy | null);
            /** NotificationTriggerPolicyOverride override. */
            public override?: ("default" | "policy");
            /**
             * Encodes the specified NotificationTriggerPolicyOverride message. Does not implicitly {@link sync.Contact.NotificationTriggerPolicyOverride.verify|verify} messages.
             * @param message NotificationTriggerPolicyOverride message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: sync.Contact.NotificationTriggerPolicyOverrideEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a NotificationTriggerPolicyOverride message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns NotificationTriggerPolicyOverride
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.Contact.NotificationTriggerPolicyOverride;
        }
        namespace NotificationTriggerPolicyOverride {
            /** Properties of a Policy. */
            interface IPolicy {
                /** Policy policy */
                policy?: (sync.Contact.NotificationTriggerPolicyOverride.Policy.NotificationTriggerPolicy | null);
                /** Policy expiresAt */
                expiresAt?: (Long | null);
            }
            type PolicyEncodable = types.WeakOpaque<IPolicy, {
                readonly PolicyEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a Policy. */
            class Policy implements IPolicy {
                /**
                 * Constructs a new Policy.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: sync.Contact.NotificationTriggerPolicyOverride.IPolicy);
                /** Policy policy. */
                public policy: sync.Contact.NotificationTriggerPolicyOverride.Policy.NotificationTriggerPolicy;
                /** Policy expiresAt. */
                public expiresAt?: (Long | null);
                /** Policy _expiresAt. */
                public _expiresAt?: "expiresAt";
                /**
                 * Encodes the specified Policy message. Does not implicitly {@link sync.Contact.NotificationTriggerPolicyOverride.Policy.verify|verify} messages.
                 * @param message Policy message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: sync.Contact.NotificationTriggerPolicyOverride.PolicyEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a Policy message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Policy
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.Contact.NotificationTriggerPolicyOverride.Policy;
            }
            namespace Policy {
                /** NotificationTriggerPolicy enum. */
                enum NotificationTriggerPolicy {
                    NEVER = 0
                }
            }
        }
        /** Properties of a NotificationSoundPolicyOverride. */
        interface INotificationSoundPolicyOverride {
            /** NotificationSoundPolicyOverride default */
            "default"?: (common.Unit | null);
            /** NotificationSoundPolicyOverride policy */
            policy?: (sync.NotificationSoundPolicy | null);
        }
        type NotificationSoundPolicyOverrideEncodable = types.WeakOpaque<INotificationSoundPolicyOverride, {
            readonly NotificationSoundPolicyOverrideEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a NotificationSoundPolicyOverride. */
        class NotificationSoundPolicyOverride implements INotificationSoundPolicyOverride {
            /**
             * Constructs a new NotificationSoundPolicyOverride.
             * @param [properties] Properties to set
             */
            constructor(properties?: sync.Contact.INotificationSoundPolicyOverride);
            /** NotificationSoundPolicyOverride default. */
            public default?: (common.Unit | null);
            /** NotificationSoundPolicyOverride policy. */
            public policy?: (sync.NotificationSoundPolicy | null);
            /** NotificationSoundPolicyOverride override. */
            public override?: ("default" | "policy");
            /**
             * Encodes the specified NotificationSoundPolicyOverride message. Does not implicitly {@link sync.Contact.NotificationSoundPolicyOverride.verify|verify} messages.
             * @param message NotificationSoundPolicyOverride message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: sync.Contact.NotificationSoundPolicyOverrideEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a NotificationSoundPolicyOverride message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns NotificationSoundPolicyOverride
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.Contact.NotificationSoundPolicyOverride;
        }
    }
    /** Properties of a Group. */
    interface IGroup {
        /** Group groupIdentity */
        groupIdentity?: (common.GroupIdentity | null);
        /** Group name */
        name?: (string | null);
        /** Group createdAt */
        createdAt?: (Long | null);
        /** Group userState */
        userState?: (sync.Group.UserState | null);
        /** Group notificationTriggerPolicyOverride */
        notificationTriggerPolicyOverride?: (sync.Group.NotificationTriggerPolicyOverride | null);
        /** Group notificationSoundPolicyOverride */
        notificationSoundPolicyOverride?: (sync.Group.NotificationSoundPolicyOverride | null);
        /** Group profilePicture */
        profilePicture?: (common.DeltaImage | null);
        /** Group memberIdentities */
        memberIdentities?: (common.Identities | null);
        /** Group conversationCategory */
        conversationCategory?: (sync.ConversationCategory | null);
        /** Group conversationVisibility */
        conversationVisibility?: (sync.ConversationVisibility | null);
    }
    type GroupEncodable = types.WeakOpaque<IGroup, {
        readonly GroupEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a Group. */
    class Group implements IGroup {
        /**
         * Constructs a new Group.
         * @param [properties] Properties to set
         */
        constructor(properties?: sync.IGroup);
        /** Group groupIdentity. */
        public groupIdentity?: (common.GroupIdentity | null);
        /** Group name. */
        public name?: (string | null);
        /** Group createdAt. */
        public createdAt?: (Long | null);
        /** Group userState. */
        public userState?: (sync.Group.UserState | null);
        /** Group notificationTriggerPolicyOverride. */
        public notificationTriggerPolicyOverride?: (sync.Group.NotificationTriggerPolicyOverride | null);
        /** Group notificationSoundPolicyOverride. */
        public notificationSoundPolicyOverride?: (sync.Group.NotificationSoundPolicyOverride | null);
        /** Group profilePicture. */
        public profilePicture?: (common.DeltaImage | null);
        /** Group memberIdentities. */
        public memberIdentities?: (common.Identities | null);
        /** Group conversationCategory. */
        public conversationCategory?: (sync.ConversationCategory | null);
        /** Group conversationVisibility. */
        public conversationVisibility?: (sync.ConversationVisibility | null);
        /** Group _name. */
        public _name?: "name";
        /** Group _createdAt. */
        public _createdAt?: "createdAt";
        /** Group _userState. */
        public _userState?: "userState";
        /** Group _conversationCategory. */
        public _conversationCategory?: "conversationCategory";
        /** Group _conversationVisibility. */
        public _conversationVisibility?: "conversationVisibility";
        /**
         * Encodes the specified Group message. Does not implicitly {@link sync.Group.verify|verify} messages.
         * @param message Group message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: sync.GroupEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Group message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Group
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.Group;
    }
    namespace Group {
        /** UserState enum. */
        enum UserState {
            MEMBER = 0,
            KICKED = 1,
            LEFT = 2
        }
        /** Properties of a NotificationTriggerPolicyOverride. */
        interface INotificationTriggerPolicyOverride {
            /** NotificationTriggerPolicyOverride default */
            "default"?: (common.Unit | null);
            /** NotificationTriggerPolicyOverride policy */
            policy?: (sync.Group.NotificationTriggerPolicyOverride.Policy | null);
        }
        type NotificationTriggerPolicyOverrideEncodable = types.WeakOpaque<INotificationTriggerPolicyOverride, {
            readonly NotificationTriggerPolicyOverrideEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a NotificationTriggerPolicyOverride. */
        class NotificationTriggerPolicyOverride implements INotificationTriggerPolicyOverride {
            /**
             * Constructs a new NotificationTriggerPolicyOverride.
             * @param [properties] Properties to set
             */
            constructor(properties?: sync.Group.INotificationTriggerPolicyOverride);
            /** NotificationTriggerPolicyOverride default. */
            public default?: (common.Unit | null);
            /** NotificationTriggerPolicyOverride policy. */
            public policy?: (sync.Group.NotificationTriggerPolicyOverride.Policy | null);
            /** NotificationTriggerPolicyOverride override. */
            public override?: ("default" | "policy");
            /**
             * Encodes the specified NotificationTriggerPolicyOverride message. Does not implicitly {@link sync.Group.NotificationTriggerPolicyOverride.verify|verify} messages.
             * @param message NotificationTriggerPolicyOverride message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: sync.Group.NotificationTriggerPolicyOverrideEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a NotificationTriggerPolicyOverride message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns NotificationTriggerPolicyOverride
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.Group.NotificationTriggerPolicyOverride;
        }
        namespace NotificationTriggerPolicyOverride {
            /** Properties of a Policy. */
            interface IPolicy {
                /** Policy policy */
                policy?: (sync.Group.NotificationTriggerPolicyOverride.Policy.NotificationTriggerPolicy | null);
                /** Policy expiresAt */
                expiresAt?: (Long | null);
            }
            type PolicyEncodable = types.WeakOpaque<IPolicy, {
                readonly PolicyEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a Policy. */
            class Policy implements IPolicy {
                /**
                 * Constructs a new Policy.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: sync.Group.NotificationTriggerPolicyOverride.IPolicy);
                /** Policy policy. */
                public policy: sync.Group.NotificationTriggerPolicyOverride.Policy.NotificationTriggerPolicy;
                /** Policy expiresAt. */
                public expiresAt?: (Long | null);
                /** Policy _expiresAt. */
                public _expiresAt?: "expiresAt";
                /**
                 * Encodes the specified Policy message. Does not implicitly {@link sync.Group.NotificationTriggerPolicyOverride.Policy.verify|verify} messages.
                 * @param message Policy message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: sync.Group.NotificationTriggerPolicyOverride.PolicyEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a Policy message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Policy
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.Group.NotificationTriggerPolicyOverride.Policy;
            }
            namespace Policy {
                /** NotificationTriggerPolicy enum. */
                enum NotificationTriggerPolicy {
                    MENTIONED = 0,
                    NEVER = 1
                }
            }
        }
        /** Properties of a NotificationSoundPolicyOverride. */
        interface INotificationSoundPolicyOverride {
            /** NotificationSoundPolicyOverride default */
            "default"?: (common.Unit | null);
            /** NotificationSoundPolicyOverride policy */
            policy?: (sync.NotificationSoundPolicy | null);
        }
        type NotificationSoundPolicyOverrideEncodable = types.WeakOpaque<INotificationSoundPolicyOverride, {
            readonly NotificationSoundPolicyOverrideEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a NotificationSoundPolicyOverride. */
        class NotificationSoundPolicyOverride implements INotificationSoundPolicyOverride {
            /**
             * Constructs a new NotificationSoundPolicyOverride.
             * @param [properties] Properties to set
             */
            constructor(properties?: sync.Group.INotificationSoundPolicyOverride);
            /** NotificationSoundPolicyOverride default. */
            public default?: (common.Unit | null);
            /** NotificationSoundPolicyOverride policy. */
            public policy?: (sync.NotificationSoundPolicy | null);
            /** NotificationSoundPolicyOverride override. */
            public override?: ("default" | "policy");
            /**
             * Encodes the specified NotificationSoundPolicyOverride message. Does not implicitly {@link sync.Group.NotificationSoundPolicyOverride.verify|verify} messages.
             * @param message NotificationSoundPolicyOverride message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: sync.Group.NotificationSoundPolicyOverrideEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a NotificationSoundPolicyOverride message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns NotificationSoundPolicyOverride
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.Group.NotificationSoundPolicyOverride;
        }
    }
    /** Properties of a DistributionList. */
    interface IDistributionList {
        /** DistributionList distributionListId */
        distributionListId?: (Long | null);
        /** DistributionList name */
        name?: (string | null);
        /** DistributionList createdAt */
        createdAt?: (Long | null);
        /** DistributionList memberIdentities */
        memberIdentities?: (common.Identities | null);
        /** DistributionList conversationCategory */
        conversationCategory?: (sync.ConversationCategory | null);
        /** DistributionList conversationVisibility */
        conversationVisibility?: (sync.ConversationVisibility | null);
    }
    type DistributionListEncodable = types.WeakOpaque<IDistributionList, {
        readonly DistributionListEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a DistributionList. */
    class DistributionList implements IDistributionList {
        /**
         * Constructs a new DistributionList.
         * @param [properties] Properties to set
         */
        constructor(properties?: sync.IDistributionList);
        /** DistributionList distributionListId. */
        public distributionListId: Long;
        /** DistributionList name. */
        public name?: (string | null);
        /** DistributionList createdAt. */
        public createdAt?: (Long | null);
        /** DistributionList memberIdentities. */
        public memberIdentities?: (common.Identities | null);
        /** DistributionList conversationCategory. */
        public conversationCategory?: (sync.ConversationCategory | null);
        /** DistributionList conversationVisibility. */
        public conversationVisibility?: (sync.ConversationVisibility | null);
        /** DistributionList _name. */
        public _name?: "name";
        /** DistributionList _createdAt. */
        public _createdAt?: "createdAt";
        /** DistributionList _conversationCategory. */
        public _conversationCategory?: "conversationCategory";
        /** DistributionList _conversationVisibility. */
        public _conversationVisibility?: "conversationVisibility";
        /**
         * Encodes the specified DistributionList message. Does not implicitly {@link sync.DistributionList.verify|verify} messages.
         * @param message DistributionList message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: sync.DistributionListEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a DistributionList message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DistributionList
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.DistributionList;
    }
    /** Properties of a Settings. */
    interface ISettings {
        /** Settings contactSyncPolicy */
        contactSyncPolicy?: (sync.Settings.ContactSyncPolicy | null);
        /** Settings unknownContactPolicy */
        unknownContactPolicy?: (sync.Settings.UnknownContactPolicy | null);
        /** Settings readReceiptPolicy */
        readReceiptPolicy?: (sync.ReadReceiptPolicy | null);
        /** Settings typingIndicatorPolicy */
        typingIndicatorPolicy?: (sync.TypingIndicatorPolicy | null);
        /** Settings o2oCallPolicy */
        o2oCallPolicy?: (sync.Settings.O2oCallPolicy | null);
        /** Settings o2oCallConnectionPolicy */
        o2oCallConnectionPolicy?: (sync.Settings.O2oCallConnectionPolicy | null);
        /** Settings o2oCallVideoPolicy */
        o2oCallVideoPolicy?: (sync.Settings.O2oCallVideoPolicy | null);
        /** Settings groupCallPolicy */
        groupCallPolicy?: (sync.Settings.GroupCallPolicy | null);
        /** Settings screenshotPolicy */
        screenshotPolicy?: (sync.Settings.ScreenshotPolicy | null);
        /** Settings keyboardDataCollectionPolicy */
        keyboardDataCollectionPolicy?: (sync.Settings.KeyboardDataCollectionPolicy | null);
        /** Settings blockedIdentities */
        blockedIdentities?: (common.Identities | null);
        /** Settings excludeFromSyncIdentities */
        excludeFromSyncIdentities?: (common.Identities | null);
    }
    type SettingsEncodable = types.WeakOpaque<ISettings, {
        readonly SettingsEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a Settings. */
    class Settings implements ISettings {
        /**
         * Constructs a new Settings.
         * @param [properties] Properties to set
         */
        constructor(properties?: sync.ISettings);
        /** Settings contactSyncPolicy. */
        public contactSyncPolicy?: (sync.Settings.ContactSyncPolicy | null);
        /** Settings unknownContactPolicy. */
        public unknownContactPolicy?: (sync.Settings.UnknownContactPolicy | null);
        /** Settings readReceiptPolicy. */
        public readReceiptPolicy?: (sync.ReadReceiptPolicy | null);
        /** Settings typingIndicatorPolicy. */
        public typingIndicatorPolicy?: (sync.TypingIndicatorPolicy | null);
        /** Settings o2oCallPolicy. */
        public o2oCallPolicy?: (sync.Settings.O2oCallPolicy | null);
        /** Settings o2oCallConnectionPolicy. */
        public o2oCallConnectionPolicy?: (sync.Settings.O2oCallConnectionPolicy | null);
        /** Settings o2oCallVideoPolicy. */
        public o2oCallVideoPolicy?: (sync.Settings.O2oCallVideoPolicy | null);
        /** Settings groupCallPolicy. */
        public groupCallPolicy?: (sync.Settings.GroupCallPolicy | null);
        /** Settings screenshotPolicy. */
        public screenshotPolicy?: (sync.Settings.ScreenshotPolicy | null);
        /** Settings keyboardDataCollectionPolicy. */
        public keyboardDataCollectionPolicy?: (sync.Settings.KeyboardDataCollectionPolicy | null);
        /** Settings blockedIdentities. */
        public blockedIdentities?: (common.Identities | null);
        /** Settings excludeFromSyncIdentities. */
        public excludeFromSyncIdentities?: (common.Identities | null);
        /** Settings _contactSyncPolicy. */
        public _contactSyncPolicy?: "contactSyncPolicy";
        /** Settings _unknownContactPolicy. */
        public _unknownContactPolicy?: "unknownContactPolicy";
        /** Settings _readReceiptPolicy. */
        public _readReceiptPolicy?: "readReceiptPolicy";
        /** Settings _typingIndicatorPolicy. */
        public _typingIndicatorPolicy?: "typingIndicatorPolicy";
        /** Settings _o2oCallPolicy. */
        public _o2oCallPolicy?: "o2oCallPolicy";
        /** Settings _o2oCallConnectionPolicy. */
        public _o2oCallConnectionPolicy?: "o2oCallConnectionPolicy";
        /** Settings _o2oCallVideoPolicy. */
        public _o2oCallVideoPolicy?: "o2oCallVideoPolicy";
        /** Settings _groupCallPolicy. */
        public _groupCallPolicy?: "groupCallPolicy";
        /** Settings _screenshotPolicy. */
        public _screenshotPolicy?: "screenshotPolicy";
        /** Settings _keyboardDataCollectionPolicy. */
        public _keyboardDataCollectionPolicy?: "keyboardDataCollectionPolicy";
        /**
         * Encodes the specified Settings message. Does not implicitly {@link sync.Settings.verify|verify} messages.
         * @param message Settings message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: sync.SettingsEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Settings message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Settings
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): sync.Settings;
    }
    namespace Settings {
        /** ContactSyncPolicy enum. */
        enum ContactSyncPolicy {
            NOT_SYNCED = 0,
            SYNC = 1
        }
        /** UnknownContactPolicy enum. */
        enum UnknownContactPolicy {
            ALLOW_UNKNOWN = 0,
            BLOCK_UNKNOWN = 1
        }
        /** O2oCallPolicy enum. */
        enum O2oCallPolicy {
            ALLOW_O2O_CALL = 0,
            DENY_O2O_CALL = 1
        }
        /** O2oCallConnectionPolicy enum. */
        enum O2oCallConnectionPolicy {
            ALLOW_DIRECT_CONNECTION = 0,
            REQUIRE_RELAYED_CONNECTION = 1
        }
        /** O2oCallVideoPolicy enum. */
        enum O2oCallVideoPolicy {
            ALLOW_VIDEO = 0,
            DENY_VIDEO = 1
        }
        /** GroupCallPolicy enum. */
        enum GroupCallPolicy {
            ALLOW_GROUP_CALL = 0,
            DENY_GROUP_CALL = 1
        }
        /** ScreenshotPolicy enum. */
        enum ScreenshotPolicy {
            ALLOW_SCREENSHOT = 0,
            DENY_SCREENSHOT = 1
        }
        /** KeyboardDataCollectionPolicy enum. */
        enum KeyboardDataCollectionPolicy {
            ALLOW_DATA_COLLECTION = 0,
            DENY_DATA_COLLECTION = 1
        }
    }
}
/** Namespace join. */
export namespace join {
    /** Properties of a NdToEd. */
    interface INdToEd {
        /** NdToEd registered */
        registered?: (join.Registered | null);
    }
    type NdToEdEncodable = types.WeakOpaque<INdToEd, {
        readonly NdToEdEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a NdToEd. */
    class NdToEd implements INdToEd {
        /**
         * Constructs a new NdToEd.
         * @param [properties] Properties to set
         */
        constructor(properties?: join.INdToEd);
        /** NdToEd registered. */
        public registered?: (join.Registered | null);
        /** NdToEd content. */
        public content?: "registered";
        /**
         * Encodes the specified NdToEd message. Does not implicitly {@link join.NdToEd.verify|verify} messages.
         * @param message NdToEd message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: join.NdToEdEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a NdToEd message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns NdToEd
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): join.NdToEd;
    }
    /** Properties of an EdToNd. */
    interface IEdToNd {
        /** EdToNd begin */
        begin?: (join.Begin | null);
        /** EdToNd blobData */
        blobData?: (common.BlobData | null);
        /** EdToNd essentialData */
        essentialData?: (join.EssentialData | null);
    }
    type EdToNdEncodable = types.WeakOpaque<IEdToNd, {
        readonly EdToNdEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an EdToNd. */
    class EdToNd implements IEdToNd {
        /**
         * Constructs a new EdToNd.
         * @param [properties] Properties to set
         */
        constructor(properties?: join.IEdToNd);
        /** EdToNd begin. */
        public begin?: (join.Begin | null);
        /** EdToNd blobData. */
        public blobData?: (common.BlobData | null);
        /** EdToNd essentialData. */
        public essentialData?: (join.EssentialData | null);
        /** EdToNd content. */
        public content?: ("begin" | "blobData" | "essentialData");
        /**
         * Encodes the specified EdToNd message. Does not implicitly {@link join.EdToNd.verify|verify} messages.
         * @param message EdToNd message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: join.EdToNdEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an EdToNd message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns EdToNd
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): join.EdToNd;
    }
    /** Properties of a Begin. */
    interface IBegin {
    }
    type BeginEncodable = types.WeakOpaque<IBegin, {
        readonly BeginEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a Begin. */
    class Begin implements IBegin {
        /**
         * Constructs a new Begin.
         * @param [properties] Properties to set
         */
        constructor(properties?: join.IBegin);
        /**
         * Encodes the specified Begin message. Does not implicitly {@link join.Begin.verify|verify} messages.
         * @param message Begin message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: join.BeginEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Begin message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Begin
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): join.Begin;
    }
    /** Properties of an EssentialData. */
    interface IEssentialData {
        /** EssentialData identityData */
        identityData?: (join.EssentialData.IdentityData | null);
        /** EssentialData workCredentials */
        workCredentials?: (sync.ThreemaWorkCredentials | null);
        /** EssentialData deviceGroupData */
        deviceGroupData?: (join.EssentialData.DeviceGroupData | null);
        /** EssentialData userProfile */
        userProfile?: (sync.UserProfile | null);
        /** EssentialData settings */
        settings?: (sync.Settings | null);
        /** EssentialData mdmParameters */
        mdmParameters?: (sync.MdmParameters | null);
        /** EssentialData contacts */
        contacts?: (readonly join.EssentialData.AugmentedContact[] | null);
        /** EssentialData groups */
        groups?: (readonly join.EssentialData.AugmentedGroup[] | null);
        /** EssentialData distributionLists */
        distributionLists?: (readonly join.EssentialData.AugmentedDistributionList[] | null);
        /** EssentialData cspHashedNonces */
        cspHashedNonces?: (readonly Uint8Array[] | null);
        /** EssentialData d2dHashedNonces */
        d2dHashedNonces?: (readonly Uint8Array[] | null);
    }
    type EssentialDataEncodable = types.WeakOpaque<IEssentialData, {
        readonly EssentialDataEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an EssentialData. */
    class EssentialData implements IEssentialData {
        /**
         * Constructs a new EssentialData.
         * @param [properties] Properties to set
         */
        constructor(properties?: join.IEssentialData);
        /** EssentialData identityData. */
        public identityData?: (join.EssentialData.IdentityData | null);
        /** EssentialData workCredentials. */
        public workCredentials?: (sync.ThreemaWorkCredentials | null);
        /** EssentialData deviceGroupData. */
        public deviceGroupData?: (join.EssentialData.DeviceGroupData | null);
        /** EssentialData userProfile. */
        public userProfile?: (sync.UserProfile | null);
        /** EssentialData settings. */
        public settings?: (sync.Settings | null);
        /** EssentialData mdmParameters. */
        public mdmParameters?: (sync.MdmParameters | null);
        /** EssentialData contacts. */
        public contacts: readonly join.EssentialData.AugmentedContact[];
        /** EssentialData groups. */
        public groups: readonly join.EssentialData.AugmentedGroup[];
        /** EssentialData distributionLists. */
        public distributionLists: readonly join.EssentialData.AugmentedDistributionList[];
        /** EssentialData cspHashedNonces. */
        public cspHashedNonces: readonly Uint8Array[];
        /** EssentialData d2dHashedNonces. */
        public d2dHashedNonces: readonly Uint8Array[];
        /**
         * Encodes the specified EssentialData message. Does not implicitly {@link join.EssentialData.verify|verify} messages.
         * @param message EssentialData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: join.EssentialDataEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an EssentialData message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns EssentialData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): join.EssentialData;
    }
    namespace EssentialData {
        /** Properties of an IdentityData. */
        interface IIdentityData {
            /** IdentityData identity */
            identity?: (string | null);
            /** IdentityData ck */
            ck?: (Uint8Array | null);
            /** IdentityData cspDeviceCookie */
            cspDeviceCookie?: (Uint8Array | null);
            /** IdentityData cspServerGroup */
            cspServerGroup?: (string | null);
        }
        type IdentityDataEncodable = types.WeakOpaque<IIdentityData, {
            readonly IdentityDataEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an IdentityData. */
        class IdentityData implements IIdentityData {
            /**
             * Constructs a new IdentityData.
             * @param [properties] Properties to set
             */
            constructor(properties?: join.EssentialData.IIdentityData);
            /** IdentityData identity. */
            public identity: string;
            /** IdentityData ck. */
            public ck: Uint8Array;
            /** IdentityData cspDeviceCookie. */
            public cspDeviceCookie: Uint8Array;
            /** IdentityData cspServerGroup. */
            public cspServerGroup: string;
            /**
             * Encodes the specified IdentityData message. Does not implicitly {@link join.EssentialData.IdentityData.verify|verify} messages.
             * @param message IdentityData message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: join.EssentialData.IdentityDataEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an IdentityData message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns IdentityData
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): join.EssentialData.IdentityData;
        }
        /** Properties of a DeviceGroupData. */
        interface IDeviceGroupData {
            /** DeviceGroupData dgk */
            dgk?: (Uint8Array | null);
        }
        type DeviceGroupDataEncodable = types.WeakOpaque<IDeviceGroupData, {
            readonly DeviceGroupDataEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a DeviceGroupData. */
        class DeviceGroupData implements IDeviceGroupData {
            /**
             * Constructs a new DeviceGroupData.
             * @param [properties] Properties to set
             */
            constructor(properties?: join.EssentialData.IDeviceGroupData);
            /** DeviceGroupData dgk. */
            public dgk: Uint8Array;
            /**
             * Encodes the specified DeviceGroupData message. Does not implicitly {@link join.EssentialData.DeviceGroupData.verify|verify} messages.
             * @param message DeviceGroupData message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: join.EssentialData.DeviceGroupDataEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a DeviceGroupData message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns DeviceGroupData
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): join.EssentialData.DeviceGroupData;
        }
        /** Properties of an AugmentedContact. */
        interface IAugmentedContact {
            /** AugmentedContact contact */
            contact?: (sync.Contact | null);
            /** AugmentedContact lastUpdateAt */
            lastUpdateAt?: (Long | null);
        }
        type AugmentedContactEncodable = types.WeakOpaque<IAugmentedContact, {
            readonly AugmentedContactEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an AugmentedContact. */
        class AugmentedContact implements IAugmentedContact {
            /**
             * Constructs a new AugmentedContact.
             * @param [properties] Properties to set
             */
            constructor(properties?: join.EssentialData.IAugmentedContact);
            /** AugmentedContact contact. */
            public contact?: (sync.Contact | null);
            /** AugmentedContact lastUpdateAt. */
            public lastUpdateAt?: (Long | null);
            /** AugmentedContact _lastUpdateAt. */
            public _lastUpdateAt?: "lastUpdateAt";
            /**
             * Encodes the specified AugmentedContact message. Does not implicitly {@link join.EssentialData.AugmentedContact.verify|verify} messages.
             * @param message AugmentedContact message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: join.EssentialData.AugmentedContactEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an AugmentedContact message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns AugmentedContact
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): join.EssentialData.AugmentedContact;
        }
        /** Properties of an AugmentedGroup. */
        interface IAugmentedGroup {
            /** AugmentedGroup group */
            group?: (sync.Group | null);
            /** AugmentedGroup lastUpdateAt */
            lastUpdateAt?: (Long | null);
        }
        type AugmentedGroupEncodable = types.WeakOpaque<IAugmentedGroup, {
            readonly AugmentedGroupEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an AugmentedGroup. */
        class AugmentedGroup implements IAugmentedGroup {
            /**
             * Constructs a new AugmentedGroup.
             * @param [properties] Properties to set
             */
            constructor(properties?: join.EssentialData.IAugmentedGroup);
            /** AugmentedGroup group. */
            public group?: (sync.Group | null);
            /** AugmentedGroup lastUpdateAt. */
            public lastUpdateAt: Long;
            /**
             * Encodes the specified AugmentedGroup message. Does not implicitly {@link join.EssentialData.AugmentedGroup.verify|verify} messages.
             * @param message AugmentedGroup message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: join.EssentialData.AugmentedGroupEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an AugmentedGroup message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns AugmentedGroup
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): join.EssentialData.AugmentedGroup;
        }
        /** Properties of an AugmentedDistributionList. */
        interface IAugmentedDistributionList {
            /** AugmentedDistributionList distributionList */
            distributionList?: (sync.DistributionList | null);
            /** AugmentedDistributionList lastUpdateAt */
            lastUpdateAt?: (Long | null);
        }
        type AugmentedDistributionListEncodable = types.WeakOpaque<IAugmentedDistributionList, {
            readonly AugmentedDistributionListEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an AugmentedDistributionList. */
        class AugmentedDistributionList implements IAugmentedDistributionList {
            /**
             * Constructs a new AugmentedDistributionList.
             * @param [properties] Properties to set
             */
            constructor(properties?: join.EssentialData.IAugmentedDistributionList);
            /** AugmentedDistributionList distributionList. */
            public distributionList?: (sync.DistributionList | null);
            /** AugmentedDistributionList lastUpdateAt. */
            public lastUpdateAt: Long;
            /**
             * Encodes the specified AugmentedDistributionList message. Does not implicitly {@link join.EssentialData.AugmentedDistributionList.verify|verify} messages.
             * @param message AugmentedDistributionList message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: join.EssentialData.AugmentedDistributionListEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an AugmentedDistributionList message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns AugmentedDistributionList
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): join.EssentialData.AugmentedDistributionList;
        }
    }
    /** Properties of a Registered. */
    interface IRegistered {
    }
    type RegisteredEncodable = types.WeakOpaque<IRegistered, {
        readonly RegisteredEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a Registered. */
    class Registered implements IRegistered {
        /**
         * Constructs a new Registered.
         * @param [properties] Properties to set
         */
        constructor(properties?: join.IRegistered);
        /**
         * Encodes the specified Registered message. Does not implicitly {@link join.Registered.verify|verify} messages.
         * @param message Registered message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: join.RegisteredEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Registered message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Registered
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): join.Registered;
    }
}
/** Namespace rendezvous. */
export namespace rendezvous {
    /** Properties of a RendezvousInit. */
    interface IRendezvousInit {
        /** RendezvousInit version */
        version?: (rendezvous.RendezvousInit.Version | null);
        /** RendezvousInit ak */
        ak?: (Uint8Array | null);
        /** RendezvousInit relayedWebSocket */
        relayedWebSocket?: (rendezvous.RendezvousInit.RelayedWebSocket | null);
        /** RendezvousInit directTcpServer */
        directTcpServer?: (rendezvous.RendezvousInit.DirectTcpServer | null);
    }
    type RendezvousInitEncodable = types.WeakOpaque<IRendezvousInit, {
        readonly RendezvousInitEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a RendezvousInit. */
    class RendezvousInit implements IRendezvousInit {
        /**
         * Constructs a new RendezvousInit.
         * @param [properties] Properties to set
         */
        constructor(properties?: rendezvous.IRendezvousInit);
        /** RendezvousInit version. */
        public version: rendezvous.RendezvousInit.Version;
        /** RendezvousInit ak. */
        public ak: Uint8Array;
        /** RendezvousInit relayedWebSocket. */
        public relayedWebSocket?: (rendezvous.RendezvousInit.RelayedWebSocket | null);
        /** RendezvousInit directTcpServer. */
        public directTcpServer?: (rendezvous.RendezvousInit.DirectTcpServer | null);
        /**
         * Encodes the specified RendezvousInit message. Does not implicitly {@link rendezvous.RendezvousInit.verify|verify} messages.
         * @param message RendezvousInit message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: rendezvous.RendezvousInitEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a RendezvousInit message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RendezvousInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): rendezvous.RendezvousInit;
    }
    namespace RendezvousInit {
        /** Version enum. */
        enum Version {
            V1_0 = 0
        }
        /** NetworkCost enum. */
        enum NetworkCost {
            UNKNOWN = 0,
            UNMETERED = 1,
            METERED = 2
        }
        /** Properties of a RelayedWebSocket. */
        interface IRelayedWebSocket {
            /** RelayedWebSocket pathId */
            pathId?: (number | null);
            /** RelayedWebSocket networkCost */
            networkCost?: (rendezvous.RendezvousInit.NetworkCost | null);
            /** RelayedWebSocket url */
            url?: (string | null);
        }
        type RelayedWebSocketEncodable = types.WeakOpaque<IRelayedWebSocket, {
            readonly RelayedWebSocketEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a RelayedWebSocket. */
        class RelayedWebSocket implements IRelayedWebSocket {
            /**
             * Constructs a new RelayedWebSocket.
             * @param [properties] Properties to set
             */
            constructor(properties?: rendezvous.RendezvousInit.IRelayedWebSocket);
            /** RelayedWebSocket pathId. */
            public pathId: number;
            /** RelayedWebSocket networkCost. */
            public networkCost: rendezvous.RendezvousInit.NetworkCost;
            /** RelayedWebSocket url. */
            public url: string;
            /**
             * Encodes the specified RelayedWebSocket message. Does not implicitly {@link rendezvous.RendezvousInit.RelayedWebSocket.verify|verify} messages.
             * @param message RelayedWebSocket message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: rendezvous.RendezvousInit.RelayedWebSocketEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a RelayedWebSocket message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns RelayedWebSocket
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): rendezvous.RendezvousInit.RelayedWebSocket;
        }
        /** Properties of a DirectTcpServer. */
        interface IDirectTcpServer {
            /** DirectTcpServer port */
            port?: (number | null);
            /** DirectTcpServer ipAddresses */
            ipAddresses?: (readonly rendezvous.RendezvousInit.DirectTcpServer.IpAddress[] | null);
        }
        type DirectTcpServerEncodable = types.WeakOpaque<IDirectTcpServer, {
            readonly DirectTcpServerEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a DirectTcpServer. */
        class DirectTcpServer implements IDirectTcpServer {
            /**
             * Constructs a new DirectTcpServer.
             * @param [properties] Properties to set
             */
            constructor(properties?: rendezvous.RendezvousInit.IDirectTcpServer);
            /** DirectTcpServer port. */
            public port: number;
            /** DirectTcpServer ipAddresses. */
            public ipAddresses: readonly rendezvous.RendezvousInit.DirectTcpServer.IpAddress[];
            /**
             * Encodes the specified DirectTcpServer message. Does not implicitly {@link rendezvous.RendezvousInit.DirectTcpServer.verify|verify} messages.
             * @param message DirectTcpServer message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: rendezvous.RendezvousInit.DirectTcpServerEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a DirectTcpServer message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns DirectTcpServer
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): rendezvous.RendezvousInit.DirectTcpServer;
        }
        namespace DirectTcpServer {
            /** Properties of an IpAddress. */
            interface IIpAddress {
                /** IpAddress pathId */
                pathId?: (number | null);
                /** IpAddress networkCost */
                networkCost?: (rendezvous.RendezvousInit.NetworkCost | null);
                /** IpAddress ip */
                ip?: (string | null);
            }
            type IpAddressEncodable = types.WeakOpaque<IIpAddress, {
                readonly IpAddressEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents an IpAddress. */
            class IpAddress implements IIpAddress {
                /**
                 * Constructs a new IpAddress.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: rendezvous.RendezvousInit.DirectTcpServer.IIpAddress);
                /** IpAddress pathId. */
                public pathId: number;
                /** IpAddress networkCost. */
                public networkCost: rendezvous.RendezvousInit.NetworkCost;
                /** IpAddress ip. */
                public ip: string;
                /**
                 * Encodes the specified IpAddress message. Does not implicitly {@link rendezvous.RendezvousInit.DirectTcpServer.IpAddress.verify|verify} messages.
                 * @param message IpAddress message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: rendezvous.RendezvousInit.DirectTcpServer.IpAddressEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes an IpAddress message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns IpAddress
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): rendezvous.RendezvousInit.DirectTcpServer.IpAddress;
            }
        }
    }
    /** Properties of a Handshake. */
    interface IHandshake {
    }
    type HandshakeEncodable = types.WeakOpaque<IHandshake, {
        readonly HandshakeEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a Handshake. */
    class Handshake implements IHandshake {
        /**
         * Constructs a new Handshake.
         * @param [properties] Properties to set
         */
        constructor(properties?: rendezvous.IHandshake);
        /**
         * Encodes the specified Handshake message. Does not implicitly {@link rendezvous.Handshake.verify|verify} messages.
         * @param message Handshake message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: rendezvous.HandshakeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Handshake message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Handshake
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): rendezvous.Handshake;
    }
    namespace Handshake {
        /** Properties of a RrdToRid. */
        interface IRrdToRid {
        }
        type RrdToRidEncodable = types.WeakOpaque<IRrdToRid, {
            readonly RrdToRidEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a RrdToRid. */
        class RrdToRid implements IRrdToRid {
            /**
             * Constructs a new RrdToRid.
             * @param [properties] Properties to set
             */
            constructor(properties?: rendezvous.Handshake.IRrdToRid);
            /**
             * Encodes the specified RrdToRid message. Does not implicitly {@link rendezvous.Handshake.RrdToRid.verify|verify} messages.
             * @param message RrdToRid message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: rendezvous.Handshake.RrdToRidEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a RrdToRid message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns RrdToRid
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): rendezvous.Handshake.RrdToRid;
        }
        namespace RrdToRid {
            /** Properties of a Hello. */
            interface IHello {
                /** Hello challenge */
                challenge?: (Uint8Array | null);
                /** Hello etk */
                etk?: (Uint8Array | null);
            }
            type HelloEncodable = types.WeakOpaque<IHello, {
                readonly HelloEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents a Hello. */
            class Hello implements IHello {
                /**
                 * Constructs a new Hello.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: rendezvous.Handshake.RrdToRid.IHello);
                /** Hello challenge. */
                public challenge: Uint8Array;
                /** Hello etk. */
                public etk: Uint8Array;
                /**
                 * Encodes the specified Hello message. Does not implicitly {@link rendezvous.Handshake.RrdToRid.Hello.verify|verify} messages.
                 * @param message Hello message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: rendezvous.Handshake.RrdToRid.HelloEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes a Hello message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Hello
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): rendezvous.Handshake.RrdToRid.Hello;
            }
            /** Properties of an Auth. */
            interface IAuth {
                /** Auth response */
                response?: (Uint8Array | null);
            }
            type AuthEncodable = types.WeakOpaque<IAuth, {
                readonly AuthEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents an Auth. */
            class Auth implements IAuth {
                /**
                 * Constructs a new Auth.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: rendezvous.Handshake.RrdToRid.IAuth);
                /** Auth response. */
                public response: Uint8Array;
                /**
                 * Encodes the specified Auth message. Does not implicitly {@link rendezvous.Handshake.RrdToRid.Auth.verify|verify} messages.
                 * @param message Auth message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: rendezvous.Handshake.RrdToRid.AuthEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes an Auth message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns Auth
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): rendezvous.Handshake.RrdToRid.Auth;
            }
        }
        /** Properties of a RidToRrd. */
        interface IRidToRrd {
        }
        type RidToRrdEncodable = types.WeakOpaque<IRidToRrd, {
            readonly RidToRrdEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a RidToRrd. */
        class RidToRrd implements IRidToRrd {
            /**
             * Constructs a new RidToRrd.
             * @param [properties] Properties to set
             */
            constructor(properties?: rendezvous.Handshake.IRidToRrd);
            /**
             * Encodes the specified RidToRrd message. Does not implicitly {@link rendezvous.Handshake.RidToRrd.verify|verify} messages.
             * @param message RidToRrd message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: rendezvous.Handshake.RidToRrdEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a RidToRrd message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns RidToRrd
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): rendezvous.Handshake.RidToRrd;
        }
        namespace RidToRrd {
            /** Properties of an AuthHello. */
            interface IAuthHello {
                /** AuthHello response */
                response?: (Uint8Array | null);
                /** AuthHello challenge */
                challenge?: (Uint8Array | null);
                /** AuthHello etk */
                etk?: (Uint8Array | null);
            }
            type AuthHelloEncodable = types.WeakOpaque<IAuthHello, {
                readonly AuthHelloEncodable: unique symbol;
            } & tag.ProtobufMessage>;
            /** Represents an AuthHello. */
            class AuthHello implements IAuthHello {
                /**
                 * Constructs a new AuthHello.
                 * @param [properties] Properties to set
                 */
                constructor(properties?: rendezvous.Handshake.RidToRrd.IAuthHello);
                /** AuthHello response. */
                public response: Uint8Array;
                /** AuthHello challenge. */
                public challenge: Uint8Array;
                /** AuthHello etk. */
                public etk: Uint8Array;
                /**
                 * Encodes the specified AuthHello message. Does not implicitly {@link rendezvous.Handshake.RidToRrd.AuthHello.verify|verify} messages.
                 * @param message AuthHello message or plain object to encode
                 * @param [writer] Writer to encode to
                 * @returns Writer
                 */
                public static encode(message: rendezvous.Handshake.RidToRrd.AuthHelloEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
                /**
                 * Decodes an AuthHello message from the specified reader or buffer.
                 * @param reader Reader or buffer to decode from
                 * @param [length] Message length if known beforehand
                 * @returns AuthHello
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): rendezvous.Handshake.RidToRrd.AuthHello;
            }
        }
    }
    /** Properties of a Nominate. */
    interface INominate {
    }
    type NominateEncodable = types.WeakOpaque<INominate, {
        readonly NominateEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a Nominate. */
    class Nominate implements INominate {
        /**
         * Constructs a new Nominate.
         * @param [properties] Properties to set
         */
        constructor(properties?: rendezvous.INominate);
        /**
         * Encodes the specified Nominate message. Does not implicitly {@link rendezvous.Nominate.verify|verify} messages.
         * @param message Nominate message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: rendezvous.NominateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Nominate message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Nominate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): rendezvous.Nominate;
    }
}
/** Namespace d2m. */
export namespace d2m {
    /** ProtocolVersion enum. */
    enum ProtocolVersion {
        INITIAL = 0
    }
    /** Properties of a ClientUrlInfo. */
    interface IClientUrlInfo {
        /** ClientUrlInfo deviceGroupId */
        deviceGroupId?: (Uint8Array | null);
        /** ClientUrlInfo serverGroup */
        serverGroup?: (string | null);
    }
    type ClientUrlInfoEncodable = types.WeakOpaque<IClientUrlInfo, {
        readonly ClientUrlInfoEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a ClientUrlInfo. */
    class ClientUrlInfo implements IClientUrlInfo {
        /**
         * Constructs a new ClientUrlInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.IClientUrlInfo);
        /** ClientUrlInfo deviceGroupId. */
        public deviceGroupId: Uint8Array;
        /** ClientUrlInfo serverGroup. */
        public serverGroup: string;
        /**
         * Encodes the specified ClientUrlInfo message. Does not implicitly {@link d2m.ClientUrlInfo.verify|verify} messages.
         * @param message ClientUrlInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.ClientUrlInfoEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a ClientUrlInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ClientUrlInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.ClientUrlInfo;
    }
    /** Properties of a ServerHello. */
    interface IServerHello {
        /** ServerHello version */
        version?: (number | null);
        /** ServerHello esk */
        esk?: (Uint8Array | null);
        /** ServerHello challenge */
        challenge?: (Uint8Array | null);
    }
    type ServerHelloEncodable = types.WeakOpaque<IServerHello, {
        readonly ServerHelloEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a ServerHello. */
    class ServerHello implements IServerHello {
        /**
         * Constructs a new ServerHello.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.IServerHello);
        /** ServerHello version. */
        public version: number;
        /** ServerHello esk. */
        public esk: Uint8Array;
        /** ServerHello challenge. */
        public challenge: Uint8Array;
        /**
         * Encodes the specified ServerHello message. Does not implicitly {@link d2m.ServerHello.verify|verify} messages.
         * @param message ServerHello message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.ServerHelloEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a ServerHello message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ServerHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.ServerHello;
    }
    /** DeviceSlotExpirationPolicy enum. */
    enum DeviceSlotExpirationPolicy {
        VOLATILE = 0,
        PERSISTENT = 1
    }
    /** DeviceSlotState enum. */
    enum DeviceSlotState {
        NEW = 0,
        EXISTING = 1
    }
    /** Properties of a ClientHello. */
    interface IClientHello {
        /** ClientHello version */
        version?: (number | null);
        /** ClientHello response */
        response?: (Uint8Array | null);
        /** ClientHello deviceId */
        deviceId?: (Long | null);
        /** ClientHello deviceSlotsExhaustedPolicy */
        deviceSlotsExhaustedPolicy?: (d2m.ClientHello.DeviceSlotsExhaustedPolicy | null);
        /** ClientHello deviceSlotExpirationPolicy */
        deviceSlotExpirationPolicy?: (d2m.DeviceSlotExpirationPolicy | null);
        /** ClientHello expectedDeviceSlotState */
        expectedDeviceSlotState?: (d2m.DeviceSlotState | null);
        /** ClientHello encryptedDeviceInfo */
        encryptedDeviceInfo?: (Uint8Array | null);
    }
    type ClientHelloEncodable = types.WeakOpaque<IClientHello, {
        readonly ClientHelloEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a ClientHello. */
    class ClientHello implements IClientHello {
        /**
         * Constructs a new ClientHello.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.IClientHello);
        /** ClientHello version. */
        public version: number;
        /** ClientHello response. */
        public response: Uint8Array;
        /** ClientHello deviceId. */
        public deviceId: Long;
        /** ClientHello deviceSlotsExhaustedPolicy. */
        public deviceSlotsExhaustedPolicy: d2m.ClientHello.DeviceSlotsExhaustedPolicy;
        /** ClientHello deviceSlotExpirationPolicy. */
        public deviceSlotExpirationPolicy: d2m.DeviceSlotExpirationPolicy;
        /** ClientHello expectedDeviceSlotState. */
        public expectedDeviceSlotState: d2m.DeviceSlotState;
        /** ClientHello encryptedDeviceInfo. */
        public encryptedDeviceInfo: Uint8Array;
        /**
         * Encodes the specified ClientHello message. Does not implicitly {@link d2m.ClientHello.verify|verify} messages.
         * @param message ClientHello message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.ClientHelloEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a ClientHello message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ClientHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.ClientHello;
    }
    namespace ClientHello {
        /** DeviceSlotsExhaustedPolicy enum. */
        enum DeviceSlotsExhaustedPolicy {
            REJECT = 0,
            DROP_LEAST_RECENT = 1
        }
    }
    /** Properties of a ServerInfo. */
    interface IServerInfo {
        /** ServerInfo currentTime */
        currentTime?: (Long | null);
        /** ServerInfo maxDeviceSlots */
        maxDeviceSlots?: (number | null);
        /** ServerInfo deviceSlotState */
        deviceSlotState?: (d2m.DeviceSlotState | null);
        /** ServerInfo encryptedSharedDeviceData */
        encryptedSharedDeviceData?: (Uint8Array | null);
        /** ServerInfo reflectionQueueLength */
        reflectionQueueLength?: (number | null);
    }
    type ServerInfoEncodable = types.WeakOpaque<IServerInfo, {
        readonly ServerInfoEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a ServerInfo. */
    class ServerInfo implements IServerInfo {
        /**
         * Constructs a new ServerInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.IServerInfo);
        /** ServerInfo currentTime. */
        public currentTime: Long;
        /** ServerInfo maxDeviceSlots. */
        public maxDeviceSlots: number;
        /** ServerInfo deviceSlotState. */
        public deviceSlotState: d2m.DeviceSlotState;
        /** ServerInfo encryptedSharedDeviceData. */
        public encryptedSharedDeviceData: Uint8Array;
        /** ServerInfo reflectionQueueLength. */
        public reflectionQueueLength: number;
        /**
         * Encodes the specified ServerInfo message. Does not implicitly {@link d2m.ServerInfo.verify|verify} messages.
         * @param message ServerInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.ServerInfoEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a ServerInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ServerInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.ServerInfo;
    }
    /** Properties of a ReflectionQueueDry. */
    interface IReflectionQueueDry {
    }
    type ReflectionQueueDryEncodable = types.WeakOpaque<IReflectionQueueDry, {
        readonly ReflectionQueueDryEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a ReflectionQueueDry. */
    class ReflectionQueueDry implements IReflectionQueueDry {
        /**
         * Constructs a new ReflectionQueueDry.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.IReflectionQueueDry);
        /**
         * Encodes the specified ReflectionQueueDry message. Does not implicitly {@link d2m.ReflectionQueueDry.verify|verify} messages.
         * @param message ReflectionQueueDry message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.ReflectionQueueDryEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a ReflectionQueueDry message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ReflectionQueueDry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.ReflectionQueueDry;
    }
    /** Properties of a RolePromotedToLeader. */
    interface IRolePromotedToLeader {
    }
    type RolePromotedToLeaderEncodable = types.WeakOpaque<IRolePromotedToLeader, {
        readonly RolePromotedToLeaderEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a RolePromotedToLeader. */
    class RolePromotedToLeader implements IRolePromotedToLeader {
        /**
         * Constructs a new RolePromotedToLeader.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.IRolePromotedToLeader);
        /**
         * Encodes the specified RolePromotedToLeader message. Does not implicitly {@link d2m.RolePromotedToLeader.verify|verify} messages.
         * @param message RolePromotedToLeader message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.RolePromotedToLeaderEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a RolePromotedToLeader message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns RolePromotedToLeader
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.RolePromotedToLeader;
    }
    /** Properties of a GetDevicesInfo. */
    interface IGetDevicesInfo {
    }
    type GetDevicesInfoEncodable = types.WeakOpaque<IGetDevicesInfo, {
        readonly GetDevicesInfoEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a GetDevicesInfo. */
    class GetDevicesInfo implements IGetDevicesInfo {
        /**
         * Constructs a new GetDevicesInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.IGetDevicesInfo);
        /**
         * Encodes the specified GetDevicesInfo message. Does not implicitly {@link d2m.GetDevicesInfo.verify|verify} messages.
         * @param message GetDevicesInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.GetDevicesInfoEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a GetDevicesInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GetDevicesInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.GetDevicesInfo;
    }
    /** Properties of a DevicesInfo. */
    interface IDevicesInfo {
        /** DevicesInfo augmentedDeviceInfo */
        augmentedDeviceInfo?: ({
            [k: string]: d2m.DevicesInfo.AugmentedDeviceInfo;
        } | null);
    }
    type DevicesInfoEncodable = types.WeakOpaque<IDevicesInfo, {
        readonly DevicesInfoEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a DevicesInfo. */
    class DevicesInfo implements IDevicesInfo {
        /**
         * Constructs a new DevicesInfo.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.IDevicesInfo);
        /** DevicesInfo augmentedDeviceInfo. */
        public augmentedDeviceInfo: {
            [k: string]: d2m.DevicesInfo.AugmentedDeviceInfo;
        };
        /**
         * Encodes the specified DevicesInfo message. Does not implicitly {@link d2m.DevicesInfo.verify|verify} messages.
         * @param message DevicesInfo message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.DevicesInfoEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a DevicesInfo message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DevicesInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.DevicesInfo;
    }
    namespace DevicesInfo {
        /** Properties of an AugmentedDeviceInfo. */
        interface IAugmentedDeviceInfo {
            /** AugmentedDeviceInfo encryptedDeviceInfo */
            encryptedDeviceInfo?: (Uint8Array | null);
            /** AugmentedDeviceInfo connectedSince */
            connectedSince?: (Long | null);
            /** AugmentedDeviceInfo lastDisconnectAt */
            lastDisconnectAt?: (Long | null);
            /** AugmentedDeviceInfo deviceSlotExpirationPolicy */
            deviceSlotExpirationPolicy?: (d2m.DeviceSlotExpirationPolicy | null);
        }
        type AugmentedDeviceInfoEncodable = types.WeakOpaque<IAugmentedDeviceInfo, {
            readonly AugmentedDeviceInfoEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents an AugmentedDeviceInfo. */
        class AugmentedDeviceInfo implements IAugmentedDeviceInfo {
            /**
             * Constructs a new AugmentedDeviceInfo.
             * @param [properties] Properties to set
             */
            constructor(properties?: d2m.DevicesInfo.IAugmentedDeviceInfo);
            /** AugmentedDeviceInfo encryptedDeviceInfo. */
            public encryptedDeviceInfo: Uint8Array;
            /** AugmentedDeviceInfo connectedSince. */
            public connectedSince?: (Long | null);
            /** AugmentedDeviceInfo lastDisconnectAt. */
            public lastDisconnectAt?: (Long | null);
            /** AugmentedDeviceInfo deviceSlotExpirationPolicy. */
            public deviceSlotExpirationPolicy: d2m.DeviceSlotExpirationPolicy;
            /** AugmentedDeviceInfo connectionState. */
            public connectionState?: ("connectedSince" | "lastDisconnectAt");
            /**
             * Encodes the specified AugmentedDeviceInfo message. Does not implicitly {@link d2m.DevicesInfo.AugmentedDeviceInfo.verify|verify} messages.
             * @param message AugmentedDeviceInfo message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: d2m.DevicesInfo.AugmentedDeviceInfoEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an AugmentedDeviceInfo message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns AugmentedDeviceInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.DevicesInfo.AugmentedDeviceInfo;
        }
    }
    /** Properties of a DropDevice. */
    interface IDropDevice {
        /** DropDevice deviceId */
        deviceId?: (Long | null);
    }
    type DropDeviceEncodable = types.WeakOpaque<IDropDevice, {
        readonly DropDeviceEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a DropDevice. */
    class DropDevice implements IDropDevice {
        /**
         * Constructs a new DropDevice.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.IDropDevice);
        /** DropDevice deviceId. */
        public deviceId: Long;
        /**
         * Encodes the specified DropDevice message. Does not implicitly {@link d2m.DropDevice.verify|verify} messages.
         * @param message DropDevice message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.DropDeviceEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a DropDevice message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DropDevice
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.DropDevice;
    }
    /** Properties of a DropDeviceAck. */
    interface IDropDeviceAck {
        /** DropDeviceAck deviceId */
        deviceId?: (Long | null);
    }
    type DropDeviceAckEncodable = types.WeakOpaque<IDropDeviceAck, {
        readonly DropDeviceAckEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a DropDeviceAck. */
    class DropDeviceAck implements IDropDeviceAck {
        /**
         * Constructs a new DropDeviceAck.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.IDropDeviceAck);
        /** DropDeviceAck deviceId. */
        public deviceId: Long;
        /**
         * Encodes the specified DropDeviceAck message. Does not implicitly {@link d2m.DropDeviceAck.verify|verify} messages.
         * @param message DropDeviceAck message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.DropDeviceAckEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a DropDeviceAck message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DropDeviceAck
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.DropDeviceAck;
    }
    /** Properties of a SetSharedDeviceData. */
    interface ISetSharedDeviceData {
        /** SetSharedDeviceData encryptedSharedDeviceData */
        encryptedSharedDeviceData?: (Uint8Array | null);
    }
    type SetSharedDeviceDataEncodable = types.WeakOpaque<ISetSharedDeviceData, {
        readonly SetSharedDeviceDataEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a SetSharedDeviceData. */
    class SetSharedDeviceData implements ISetSharedDeviceData {
        /**
         * Constructs a new SetSharedDeviceData.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.ISetSharedDeviceData);
        /** SetSharedDeviceData encryptedSharedDeviceData. */
        public encryptedSharedDeviceData: Uint8Array;
        /**
         * Encodes the specified SetSharedDeviceData message. Does not implicitly {@link d2m.SetSharedDeviceData.verify|verify} messages.
         * @param message SetSharedDeviceData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.SetSharedDeviceDataEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a SetSharedDeviceData message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SetSharedDeviceData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.SetSharedDeviceData;
    }
    /** Properties of a BeginTransaction. */
    interface IBeginTransaction {
        /** BeginTransaction encryptedScope */
        encryptedScope?: (Uint8Array | null);
        /** BeginTransaction ttl */
        ttl?: (number | null);
    }
    type BeginTransactionEncodable = types.WeakOpaque<IBeginTransaction, {
        readonly BeginTransactionEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a BeginTransaction. */
    class BeginTransaction implements IBeginTransaction {
        /**
         * Constructs a new BeginTransaction.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.IBeginTransaction);
        /** BeginTransaction encryptedScope. */
        public encryptedScope: Uint8Array;
        /** BeginTransaction ttl. */
        public ttl: number;
        /**
         * Encodes the specified BeginTransaction message. Does not implicitly {@link d2m.BeginTransaction.verify|verify} messages.
         * @param message BeginTransaction message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.BeginTransactionEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a BeginTransaction message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BeginTransaction
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.BeginTransaction;
    }
    /** Properties of a BeginTransactionAck. */
    interface IBeginTransactionAck {
    }
    type BeginTransactionAckEncodable = types.WeakOpaque<IBeginTransactionAck, {
        readonly BeginTransactionAckEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a BeginTransactionAck. */
    class BeginTransactionAck implements IBeginTransactionAck {
        /**
         * Constructs a new BeginTransactionAck.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.IBeginTransactionAck);
        /**
         * Encodes the specified BeginTransactionAck message. Does not implicitly {@link d2m.BeginTransactionAck.verify|verify} messages.
         * @param message BeginTransactionAck message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.BeginTransactionAckEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a BeginTransactionAck message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns BeginTransactionAck
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.BeginTransactionAck;
    }
    /** Properties of a CommitTransaction. */
    interface ICommitTransaction {
    }
    type CommitTransactionEncodable = types.WeakOpaque<ICommitTransaction, {
        readonly CommitTransactionEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a CommitTransaction. */
    class CommitTransaction implements ICommitTransaction {
        /**
         * Constructs a new CommitTransaction.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.ICommitTransaction);
        /**
         * Encodes the specified CommitTransaction message. Does not implicitly {@link d2m.CommitTransaction.verify|verify} messages.
         * @param message CommitTransaction message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.CommitTransactionEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a CommitTransaction message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CommitTransaction
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.CommitTransaction;
    }
    /** Properties of a CommitTransactionAck. */
    interface ICommitTransactionAck {
    }
    type CommitTransactionAckEncodable = types.WeakOpaque<ICommitTransactionAck, {
        readonly CommitTransactionAckEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a CommitTransactionAck. */
    class CommitTransactionAck implements ICommitTransactionAck {
        /**
         * Constructs a new CommitTransactionAck.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.ICommitTransactionAck);
        /**
         * Encodes the specified CommitTransactionAck message. Does not implicitly {@link d2m.CommitTransactionAck.verify|verify} messages.
         * @param message CommitTransactionAck message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.CommitTransactionAckEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a CommitTransactionAck message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CommitTransactionAck
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.CommitTransactionAck;
    }
    /** Properties of a TransactionRejected. */
    interface ITransactionRejected {
        /** TransactionRejected deviceId */
        deviceId?: (Long | null);
        /** TransactionRejected encryptedScope */
        encryptedScope?: (Uint8Array | null);
    }
    type TransactionRejectedEncodable = types.WeakOpaque<ITransactionRejected, {
        readonly TransactionRejectedEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a TransactionRejected. */
    class TransactionRejected implements ITransactionRejected {
        /**
         * Constructs a new TransactionRejected.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.ITransactionRejected);
        /** TransactionRejected deviceId. */
        public deviceId: Long;
        /** TransactionRejected encryptedScope. */
        public encryptedScope: Uint8Array;
        /**
         * Encodes the specified TransactionRejected message. Does not implicitly {@link d2m.TransactionRejected.verify|verify} messages.
         * @param message TransactionRejected message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.TransactionRejectedEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a TransactionRejected message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TransactionRejected
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.TransactionRejected;
    }
    /** Properties of a TransactionEnded. */
    interface ITransactionEnded {
        /** TransactionEnded deviceId */
        deviceId?: (Long | null);
        /** TransactionEnded encryptedScope */
        encryptedScope?: (Uint8Array | null);
    }
    type TransactionEndedEncodable = types.WeakOpaque<ITransactionEnded, {
        readonly TransactionEndedEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a TransactionEnded. */
    class TransactionEnded implements ITransactionEnded {
        /**
         * Constructs a new TransactionEnded.
         * @param [properties] Properties to set
         */
        constructor(properties?: d2m.ITransactionEnded);
        /** TransactionEnded deviceId. */
        public deviceId: Long;
        /** TransactionEnded encryptedScope. */
        public encryptedScope: Uint8Array;
        /**
         * Encodes the specified TransactionEnded message. Does not implicitly {@link d2m.TransactionEnded.verify|verify} messages.
         * @param message TransactionEnded message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: d2m.TransactionEndedEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a TransactionEnded message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TransactionEnded
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): d2m.TransactionEnded;
    }
}
/** Namespace callsignaling. */
export namespace callsignaling {
    /** Properties of an Envelope. */
    interface IEnvelope {
        /** Envelope padding */
        padding?: (Uint8Array | null);
        /** Envelope videoQualityProfile */
        videoQualityProfile?: (callsignaling.VideoQualityProfile | null);
        /** Envelope captureStateChange */
        captureStateChange?: (callsignaling.CaptureState | null);
    }
    type EnvelopeEncodable = types.WeakOpaque<IEnvelope, {
        readonly EnvelopeEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents an Envelope. */
    class Envelope implements IEnvelope {
        /**
         * Constructs a new Envelope.
         * @param [properties] Properties to set
         */
        constructor(properties?: callsignaling.IEnvelope);
        /** Envelope padding. */
        public padding: Uint8Array;
        /** Envelope videoQualityProfile. */
        public videoQualityProfile?: (callsignaling.VideoQualityProfile | null);
        /** Envelope captureStateChange. */
        public captureStateChange?: (callsignaling.CaptureState | null);
        /** Envelope content. */
        public content?: ("videoQualityProfile" | "captureStateChange");
        /**
         * Encodes the specified Envelope message. Does not implicitly {@link callsignaling.Envelope.verify|verify} messages.
         * @param message Envelope message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: callsignaling.EnvelopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes an Envelope message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Envelope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): callsignaling.Envelope;
    }
    /** Properties of a VideoQualityProfile. */
    interface IVideoQualityProfile {
        /** VideoQualityProfile profile */
        profile?: (callsignaling.VideoQualityProfile.QualityProfile | null);
        /** VideoQualityProfile maxBitrateKbps */
        maxBitrateKbps?: (number | null);
        /** VideoQualityProfile maxResolution */
        maxResolution?: (common.Resolution | null);
        /** VideoQualityProfile maxFps */
        maxFps?: (number | null);
    }
    type VideoQualityProfileEncodable = types.WeakOpaque<IVideoQualityProfile, {
        readonly VideoQualityProfileEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a VideoQualityProfile. */
    class VideoQualityProfile implements IVideoQualityProfile {
        /**
         * Constructs a new VideoQualityProfile.
         * @param [properties] Properties to set
         */
        constructor(properties?: callsignaling.IVideoQualityProfile);
        /** VideoQualityProfile profile. */
        public profile: callsignaling.VideoQualityProfile.QualityProfile;
        /** VideoQualityProfile maxBitrateKbps. */
        public maxBitrateKbps: number;
        /** VideoQualityProfile maxResolution. */
        public maxResolution?: (common.Resolution | null);
        /** VideoQualityProfile maxFps. */
        public maxFps: number;
        /**
         * Encodes the specified VideoQualityProfile message. Does not implicitly {@link callsignaling.VideoQualityProfile.verify|verify} messages.
         * @param message VideoQualityProfile message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: callsignaling.VideoQualityProfileEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a VideoQualityProfile message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns VideoQualityProfile
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): callsignaling.VideoQualityProfile;
    }
    namespace VideoQualityProfile {
        /** QualityProfile enum. */
        enum QualityProfile {
            MAX = 0,
            HIGH = 1,
            LOW = 2
        }
    }
    /** Properties of a CaptureState. */
    interface ICaptureState {
        /** CaptureState state */
        state?: (callsignaling.CaptureState.Mode | null);
        /** CaptureState device */
        device?: (callsignaling.CaptureState.CaptureDevice | null);
    }
    type CaptureStateEncodable = types.WeakOpaque<ICaptureState, {
        readonly CaptureStateEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a CaptureState. */
    class CaptureState implements ICaptureState {
        /**
         * Constructs a new CaptureState.
         * @param [properties] Properties to set
         */
        constructor(properties?: callsignaling.ICaptureState);
        /** CaptureState state. */
        public state: callsignaling.CaptureState.Mode;
        /** CaptureState device. */
        public device: callsignaling.CaptureState.CaptureDevice;
        /**
         * Encodes the specified CaptureState message. Does not implicitly {@link callsignaling.CaptureState.verify|verify} messages.
         * @param message CaptureState message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: callsignaling.CaptureStateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a CaptureState message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CaptureState
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): callsignaling.CaptureState;
    }
    namespace CaptureState {
        /** Mode enum. */
        enum Mode {
            OFF = 0,
            ON = 1
        }
        /** CaptureDevice enum. */
        enum CaptureDevice {
            CAMERA = 0,
            RESERVED_FOR_SCREEN_SHARE = 1,
            MICROPHONE = 2
        }
    }
}
/** Namespace url. */
export namespace url {
    /** Properties of a GroupInvite. */
    interface IGroupInvite {
        /** GroupInvite adminIdentity */
        adminIdentity?: (string | null);
        /** GroupInvite token */
        token?: (Uint8Array | null);
        /** GroupInvite confirmationMode */
        confirmationMode?: (url.GroupInvite.ConfirmationMode | null);
        /** GroupInvite groupName */
        groupName?: (string | null);
    }
    type GroupInviteEncodable = types.WeakOpaque<IGroupInvite, {
        readonly GroupInviteEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a GroupInvite. */
    class GroupInvite implements IGroupInvite {
        /**
         * Constructs a new GroupInvite.
         * @param [properties] Properties to set
         */
        constructor(properties?: url.IGroupInvite);
        /** GroupInvite adminIdentity. */
        public adminIdentity: string;
        /** GroupInvite token. */
        public token: Uint8Array;
        /** GroupInvite confirmationMode. */
        public confirmationMode: url.GroupInvite.ConfirmationMode;
        /** GroupInvite groupName. */
        public groupName: string;
        /**
         * Encodes the specified GroupInvite message. Does not implicitly {@link url.GroupInvite.verify|verify} messages.
         * @param message GroupInvite message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: url.GroupInviteEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a GroupInvite message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns GroupInvite
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): url.GroupInvite;
    }
    namespace GroupInvite {
        /** ConfirmationMode enum. */
        enum ConfirmationMode {
            AUTOMATIC = 0,
            MANUAL = 1
        }
    }
    /** Properties of a DeviceGroupJoinRequestOrOffer. */
    interface IDeviceGroupJoinRequestOrOffer {
        /** DeviceGroupJoinRequestOrOffer version */
        version?: (url.DeviceGroupJoinRequestOrOffer.Version | null);
        /** DeviceGroupJoinRequestOrOffer variant */
        variant?: (url.DeviceGroupJoinRequestOrOffer.Variant | null);
        /** DeviceGroupJoinRequestOrOffer rendezvousInit */
        rendezvousInit?: (rendezvous.RendezvousInit | null);
    }
    type DeviceGroupJoinRequestOrOfferEncodable = types.WeakOpaque<IDeviceGroupJoinRequestOrOffer, {
        readonly DeviceGroupJoinRequestOrOfferEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a DeviceGroupJoinRequestOrOffer. */
    class DeviceGroupJoinRequestOrOffer implements IDeviceGroupJoinRequestOrOffer {
        /**
         * Constructs a new DeviceGroupJoinRequestOrOffer.
         * @param [properties] Properties to set
         */
        constructor(properties?: url.IDeviceGroupJoinRequestOrOffer);
        /** DeviceGroupJoinRequestOrOffer version. */
        public version: url.DeviceGroupJoinRequestOrOffer.Version;
        /** DeviceGroupJoinRequestOrOffer variant. */
        public variant?: (url.DeviceGroupJoinRequestOrOffer.Variant | null);
        /** DeviceGroupJoinRequestOrOffer rendezvousInit. */
        public rendezvousInit?: (rendezvous.RendezvousInit | null);
        /**
         * Encodes the specified DeviceGroupJoinRequestOrOffer message. Does not implicitly {@link url.DeviceGroupJoinRequestOrOffer.verify|verify} messages.
         * @param message DeviceGroupJoinRequestOrOffer message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: url.DeviceGroupJoinRequestOrOfferEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a DeviceGroupJoinRequestOrOffer message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DeviceGroupJoinRequestOrOffer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): url.DeviceGroupJoinRequestOrOffer;
    }
    namespace DeviceGroupJoinRequestOrOffer {
        /** Version enum. */
        enum Version {
            V1_0 = 0
        }
        /** Properties of a Variant. */
        interface IVariant {
            /** Variant requestToJoin */
            requestToJoin?: (common.Unit | null);
            /** Variant offerToJoin */
            offerToJoin?: (common.Unit | null);
        }
        type VariantEncodable = types.WeakOpaque<IVariant, {
            readonly VariantEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Variant. */
        class Variant implements IVariant {
            /**
             * Constructs a new Variant.
             * @param [properties] Properties to set
             */
            constructor(properties?: url.DeviceGroupJoinRequestOrOffer.IVariant);
            /** Variant requestToJoin. */
            public requestToJoin?: (common.Unit | null);
            /** Variant offerToJoin. */
            public offerToJoin?: (common.Unit | null);
            /** Variant type. */
            public type?: ("requestToJoin" | "offerToJoin");
            /**
             * Encodes the specified Variant message. Does not implicitly {@link url.DeviceGroupJoinRequestOrOffer.Variant.verify|verify} messages.
             * @param message Variant message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: url.DeviceGroupJoinRequestOrOffer.VariantEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Variant message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Variant
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): url.DeviceGroupJoinRequestOrOffer.Variant;
        }
    }
}
