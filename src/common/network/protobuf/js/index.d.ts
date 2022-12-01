import type Long from "long";
import type * as types from "~/common/types";
import type * as tag from "../tag";
import * as $protobuf from "protobufjs";
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
        constructor(properties?: callsignaling.IResolution);
        /** Resolution width. */
        public width: number;
        /** Resolution height. */
        public height: number;
        /**
         * Encodes the specified Resolution message. Does not implicitly {@link callsignaling.Resolution.verify|verify} messages.
         * @param message Resolution message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: callsignaling.ResolutionEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a Resolution message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Resolution
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): callsignaling.Resolution;
    }
    /** Properties of a VideoQualityProfile. */
    interface IVideoQualityProfile {
        /** VideoQualityProfile profile */
        profile?: (callsignaling.VideoQualityProfile.QualityProfile | null);
        /** VideoQualityProfile maxBitrateKbps */
        maxBitrateKbps?: (number | null);
        /** VideoQualityProfile maxResolution */
        maxResolution?: (callsignaling.Resolution | null);
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
        public maxResolution?: (callsignaling.Resolution | null);
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
            SCREEN_SHARING = 1,
            MICROPHONE = 2
        }
    }
}
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
}
/** Namespace csp_e2e_fs. */
export namespace csp_e2e_fs {
    /** Properties of a ForwardSecurityEnvelope. */
    interface IForwardSecurityEnvelope {
        /** ForwardSecurityEnvelope sessionId */
        sessionId?: (Uint8Array | null);
        /** ForwardSecurityEnvelope init */
        init?: (csp_e2e_fs.ForwardSecurityEnvelope.Init | null);
        /** ForwardSecurityEnvelope accept */
        accept?: (csp_e2e_fs.ForwardSecurityEnvelope.Accept | null);
        /** ForwardSecurityEnvelope reject */
        reject?: (csp_e2e_fs.ForwardSecurityEnvelope.Reject | null);
        /** ForwardSecurityEnvelope terminate */
        terminate?: (csp_e2e_fs.ForwardSecurityEnvelope.Terminate | null);
        /** ForwardSecurityEnvelope message */
        message?: (csp_e2e_fs.ForwardSecurityEnvelope.Message | null);
    }
    type ForwardSecurityEnvelopeEncodable = types.WeakOpaque<IForwardSecurityEnvelope, {
        readonly ForwardSecurityEnvelopeEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a ForwardSecurityEnvelope. */
    class ForwardSecurityEnvelope implements IForwardSecurityEnvelope {
        /**
         * Constructs a new ForwardSecurityEnvelope.
         * @param [properties] Properties to set
         */
        constructor(properties?: csp_e2e_fs.IForwardSecurityEnvelope);
        /** ForwardSecurityEnvelope sessionId. */
        public sessionId: Uint8Array;
        /** ForwardSecurityEnvelope init. */
        public init?: (csp_e2e_fs.ForwardSecurityEnvelope.Init | null);
        /** ForwardSecurityEnvelope accept. */
        public accept?: (csp_e2e_fs.ForwardSecurityEnvelope.Accept | null);
        /** ForwardSecurityEnvelope reject. */
        public reject?: (csp_e2e_fs.ForwardSecurityEnvelope.Reject | null);
        /** ForwardSecurityEnvelope terminate. */
        public terminate?: (csp_e2e_fs.ForwardSecurityEnvelope.Terminate | null);
        /** ForwardSecurityEnvelope message. */
        public message?: (csp_e2e_fs.ForwardSecurityEnvelope.Message | null);
        /** ForwardSecurityEnvelope content. */
        public content?: ("init" | "accept" | "reject" | "terminate" | "message");
        /**
         * Encodes the specified ForwardSecurityEnvelope message. Does not implicitly {@link csp_e2e_fs.ForwardSecurityEnvelope.verify|verify} messages.
         * @param message ForwardSecurityEnvelope message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: csp_e2e_fs.ForwardSecurityEnvelopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a ForwardSecurityEnvelope message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ForwardSecurityEnvelope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e_fs.ForwardSecurityEnvelope;
    }
    namespace ForwardSecurityEnvelope {
        /** Properties of an Init. */
        interface IInit {
            /** Init ephemeralPublicKey */
            ephemeralPublicKey?: (Uint8Array | null);
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
            constructor(properties?: csp_e2e_fs.ForwardSecurityEnvelope.IInit);
            /** Init ephemeralPublicKey. */
            public ephemeralPublicKey: Uint8Array;
            /**
             * Encodes the specified Init message. Does not implicitly {@link csp_e2e_fs.ForwardSecurityEnvelope.Init.verify|verify} messages.
             * @param message Init message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: csp_e2e_fs.ForwardSecurityEnvelope.InitEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an Init message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Init
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e_fs.ForwardSecurityEnvelope.Init;
        }
        /** Properties of an Accept. */
        interface IAccept {
            /** Accept ephemeralPublicKey */
            ephemeralPublicKey?: (Uint8Array | null);
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
            constructor(properties?: csp_e2e_fs.ForwardSecurityEnvelope.IAccept);
            /** Accept ephemeralPublicKey. */
            public ephemeralPublicKey: Uint8Array;
            /**
             * Encodes the specified Accept message. Does not implicitly {@link csp_e2e_fs.ForwardSecurityEnvelope.Accept.verify|verify} messages.
             * @param message Accept message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: csp_e2e_fs.ForwardSecurityEnvelope.AcceptEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes an Accept message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Accept
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e_fs.ForwardSecurityEnvelope.Accept;
        }
        /** Properties of a Reject. */
        interface IReject {
            /** Reject rejectedMessageId */
            rejectedMessageId?: (Long | null);
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
            constructor(properties?: csp_e2e_fs.ForwardSecurityEnvelope.IReject);
            /** Reject rejectedMessageId. */
            public rejectedMessageId: Long;
            /**
             * Encodes the specified Reject message. Does not implicitly {@link csp_e2e_fs.ForwardSecurityEnvelope.Reject.verify|verify} messages.
             * @param message Reject message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: csp_e2e_fs.ForwardSecurityEnvelope.RejectEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Reject message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Reject
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e_fs.ForwardSecurityEnvelope.Reject;
        }
        /** Properties of a Terminate. */
        interface ITerminate {
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
            constructor(properties?: csp_e2e_fs.ForwardSecurityEnvelope.ITerminate);
            /**
             * Encodes the specified Terminate message. Does not implicitly {@link csp_e2e_fs.ForwardSecurityEnvelope.Terminate.verify|verify} messages.
             * @param message Terminate message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: csp_e2e_fs.ForwardSecurityEnvelope.TerminateEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Terminate message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Terminate
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e_fs.ForwardSecurityEnvelope.Terminate;
        }
        /** Properties of a Message. */
        interface IMessage {
            /** Message dhType */
            dhType?: (csp_e2e_fs.ForwardSecurityEnvelope.Message.DHType | null);
            /** Message counter */
            counter?: (Long | null);
            /** Message message */
            message?: (Uint8Array | null);
        }
        type MessageEncodable = types.WeakOpaque<IMessage, {
            readonly MessageEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a Message. */
        class Message implements IMessage {
            /**
             * Constructs a new Message.
             * @param [properties] Properties to set
             */
            constructor(properties?: csp_e2e_fs.ForwardSecurityEnvelope.IMessage);
            /** Message dhType. */
            public dhType: csp_e2e_fs.ForwardSecurityEnvelope.Message.DHType;
            /** Message counter. */
            public counter: Long;
            /** Message message. */
            public message: Uint8Array;
            /**
             * Encodes the specified Message message. Does not implicitly {@link csp_e2e_fs.ForwardSecurityEnvelope.Message.verify|verify} messages.
             * @param message Message message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: csp_e2e_fs.ForwardSecurityEnvelope.MessageEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Message message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Message
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): csp_e2e_fs.ForwardSecurityEnvelope.Message;
        }
        namespace Message {
            /** DHType enum. */
            enum DHType {
                TWODH = 0,
                FOURDH = 1
            }
        }
    }
}
/** Namespace csp_e2e. */
export namespace csp_e2e {
    /** Properties of a MessageMetadata. */
    interface IMessageMetadata {
        /** MessageMetadata padding */
        padding?: (Uint8Array | null);
        /** MessageMetadata nickname */
        nickname?: (string | null);
        /** MessageMetadata messageId */
        messageId?: (Long | null);
        /** MessageMetadata createdAt */
        createdAt?: (Long | null);
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
        /** MessageMetadata nickname. */
        public nickname: string;
        /** MessageMetadata messageId. */
        public messageId: Long;
        /** MessageMetadata createdAt. */
        public createdAt: Long;
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
/** Namespace history. */
export namespace history {
    /** Properties of a FromDestinationDeviceEnvelope. */
    interface IFromDestinationDeviceEnvelope {
        /** FromDestinationDeviceEnvelope getSummary */
        getSummary?: (history.GetSummary | null);
        /** FromDestinationDeviceEnvelope beginTransfer */
        beginTransfer?: (history.BeginTransfer | null);
    }
    type FromDestinationDeviceEnvelopeEncodable = types.WeakOpaque<IFromDestinationDeviceEnvelope, {
        readonly FromDestinationDeviceEnvelopeEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a FromDestinationDeviceEnvelope. */
    class FromDestinationDeviceEnvelope implements IFromDestinationDeviceEnvelope {
        /**
         * Constructs a new FromDestinationDeviceEnvelope.
         * @param [properties] Properties to set
         */
        constructor(properties?: history.IFromDestinationDeviceEnvelope);
        /** FromDestinationDeviceEnvelope getSummary. */
        public getSummary?: (history.GetSummary | null);
        /** FromDestinationDeviceEnvelope beginTransfer. */
        public beginTransfer?: (history.BeginTransfer | null);
        /** FromDestinationDeviceEnvelope content. */
        public content?: ("getSummary" | "beginTransfer");
        /**
         * Encodes the specified FromDestinationDeviceEnvelope message. Does not implicitly {@link history.FromDestinationDeviceEnvelope.verify|verify} messages.
         * @param message FromDestinationDeviceEnvelope message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: history.FromDestinationDeviceEnvelopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a FromDestinationDeviceEnvelope message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns FromDestinationDeviceEnvelope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): history.FromDestinationDeviceEnvelope;
    }
    /** Properties of a FromSourceDeviceEnvelope. */
    interface IFromSourceDeviceEnvelope {
        /** FromSourceDeviceEnvelope summary */
        summary?: (history.Summary | null);
        /** FromSourceDeviceEnvelope blobData */
        blobData?: (common.BlobData | null);
        /** FromSourceDeviceEnvelope data */
        data?: (history.Data | null);
    }
    type FromSourceDeviceEnvelopeEncodable = types.WeakOpaque<IFromSourceDeviceEnvelope, {
        readonly FromSourceDeviceEnvelopeEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a FromSourceDeviceEnvelope. */
    class FromSourceDeviceEnvelope implements IFromSourceDeviceEnvelope {
        /**
         * Constructs a new FromSourceDeviceEnvelope.
         * @param [properties] Properties to set
         */
        constructor(properties?: history.IFromSourceDeviceEnvelope);
        /** FromSourceDeviceEnvelope summary. */
        public summary?: (history.Summary | null);
        /** FromSourceDeviceEnvelope blobData. */
        public blobData?: (common.BlobData | null);
        /** FromSourceDeviceEnvelope data. */
        public data?: (history.Data | null);
        /** FromSourceDeviceEnvelope content. */
        public content?: ("summary" | "blobData" | "data");
        /**
         * Encodes the specified FromSourceDeviceEnvelope message. Does not implicitly {@link history.FromSourceDeviceEnvelope.verify|verify} messages.
         * @param message FromSourceDeviceEnvelope message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: history.FromSourceDeviceEnvelopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a FromSourceDeviceEnvelope message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns FromSourceDeviceEnvelope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): history.FromSourceDeviceEnvelope;
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
        /** SharedDeviceData mdmParameters */
        mdmParameters?: (sync.MdmParameters | null);
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
        /** SharedDeviceData mdmParameters. */
        public mdmParameters?: (sync.MdmParameters | null);
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
            NEW_DEVICE_SYNC = 5
        }
    }
    /** Properties of an Envelope. */
    interface IEnvelope {
        /** Envelope padding */
        padding?: (Uint8Array | null);
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
        /** Envelope content. */
        public content?: ("outgoingMessage" | "outgoingMessageUpdate" | "incomingMessage" | "incomingMessageUpdate" | "userProfileSync" | "contactSync" | "groupSync" | "distributionListSync" | "settingsSync");
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
    /** MessageType enum. */
    enum MessageType {
        INVALID = 0,
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
        CONTACT_SET_PROFILE_PICTURE = 24,
        CONTACT_DELETE_PROFILE_PICTURE = 25,
        CONTACT_REQUEST_PROFILE_PICTURE = 26,
        GROUP_SETUP = 74,
        GROUP_NAME = 75,
        GROUP_LEAVE = 76,
        GROUP_SET_PROFILE_PICTURE = 80,
        GROUP_DELETE_PROFILE_PICTURE = 84,
        GROUP_REQUEST_SYNC = 81,
        GROUP_TEXT = 65,
        GROUP_LOCATION = 66,
        GROUP_IMAGE = 67,
        GROUP_AUDIO = 69,
        GROUP_VIDEO = 68,
        GROUP_FILE = 70,
        GROUP_POLL_SETUP = 82,
        GROUP_POLL_VOTE = 83,
        GROUP_DELIVERY_RECEIPT = 129
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
        type?: (d2d.MessageType | null);
        /** OutgoingMessage body */
        body?: (Uint8Array | null);
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
        public type: d2d.MessageType;
        /** OutgoingMessage body. */
        public body: Uint8Array;
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
        type?: (d2d.MessageType | null);
        /** IncomingMessage body */
        body?: (Uint8Array | null);
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
        public type: d2d.MessageType;
        /** IncomingMessage body. */
        public body: Uint8Array;
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
        /** MdmParameters licenseUsername */
        licenseUsername?: (string | null);
        /** MdmParameters licensePassword */
        licensePassword?: (string | null);
        /** MdmParameters nickname */
        nickname?: (string | null);
        /** MdmParameters firstName */
        firstName?: (string | null);
        /** MdmParameters lastName */
        lastName?: (string | null);
        /** MdmParameters customerSpecificId */
        customerSpecificId?: (string | null);
        /** MdmParameters category */
        category?: (string | null);
        /** MdmParameters linkedEmail */
        linkedEmail?: (string | null);
        /** MdmParameters linkedPhone */
        linkedPhone?: (string | null);
        /** MdmParameters identityRestore */
        identityRestore?: (string | null);
        /** MdmParameters identityRestorePassword */
        identityRestorePassword?: (string | null);
        /** MdmParameters threemaSafePolicy */
        threemaSafePolicy?: (sync.MdmParameters.ThreemaSafePolicy | null);
        /** MdmParameters threemaSafePassword */
        threemaSafePassword?: (string | null);
        /** MdmParameters threemaSafePasswordPattern */
        threemaSafePasswordPattern?: (string | null);
        /** MdmParameters threemaSafePasswordPatternErrorMessage */
        threemaSafePasswordPatternErrorMessage?: (string | null);
        /** MdmParameters threemaSafeServerUrl */
        threemaSafeServerUrl?: (string | null);
        /** MdmParameters threemaSafeServerUsername */
        threemaSafeServerUsername?: (string | null);
        /** MdmParameters threemaSafeServerPassword */
        threemaSafeServerPassword?: (string | null);
        /** MdmParameters threemaSafeRestorePolicy */
        threemaSafeRestorePolicy?: (sync.MdmParameters.ThreemaSafeRestorePolicy | null);
        /** MdmParameters threemaSafeRestoreIdentity */
        threemaSafeRestoreIdentity?: (string | null);
        /** MdmParameters overridePolicy */
        overridePolicy?: (sync.MdmParameters.OverridePolicy | null);
        /** MdmParameters contactSyncPolicy */
        contactSyncPolicy?: (sync.MdmParameters.ContactSyncPolicy | null);
        /** MdmParameters inactiveIdentityDisplayPolicy */
        inactiveIdentityDisplayPolicy?: (sync.MdmParameters.InactiveIdentityDisplayPolicy | null);
        /** MdmParameters unknownContactPolicy */
        unknownContactPolicy?: (sync.MdmParameters.UnknownContactPolicy | null);
        /** MdmParameters autoSaveMediaPolicy */
        autoSaveMediaPolicy?: (sync.MdmParameters.AutoSaveMediaPolicy | null);
        /** MdmParameters screenshotPolicy */
        screenshotPolicy?: (sync.MdmParameters.ScreenshotPolicy | null);
        /** MdmParameters addContactPolicy */
        addContactPolicy?: (sync.MdmParameters.AddContactPolicy | null);
        /** MdmParameters chatExportPolicy */
        chatExportPolicy?: (sync.MdmParameters.ChatExportPolicy | null);
        /** MdmParameters backupPolicy */
        backupPolicy?: (sync.MdmParameters.BackupPolicy | null);
        /** MdmParameters identityExportPolicy */
        identityExportPolicy?: (sync.MdmParameters.IdentityExportPolicy | null);
        /** MdmParameters dataBackupPolicy */
        dataBackupPolicy?: (sync.MdmParameters.DataBackupPolicy | null);
        /** MdmParameters systemBackupPolicy */
        systemBackupPolicy?: (sync.MdmParameters.SystemBackupPolicy | null);
        /** MdmParameters messagePreviewPolicy */
        messagePreviewPolicy?: (sync.MdmParameters.MessagePreviewPolicy | null);
        /** MdmParameters profilePictureSharePolicy */
        profilePictureSharePolicy?: (sync.MdmParameters.ProfilePictureSharePolicy | null);
        /** MdmParameters callPolicy */
        callPolicy?: (sync.MdmParameters.CallPolicy | null);
        /** MdmParameters setupWizardPolicy */
        setupWizardPolicy?: (sync.MdmParameters.SetupWizardPolicy | null);
        /** MdmParameters createGroupPolicy */
        createGroupPolicy?: (sync.MdmParameters.CreateGroupPolicy | null);
        /** MdmParameters shareMediaPolicy */
        shareMediaPolicy?: (sync.MdmParameters.ShareMediaPolicy | null);
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
        /** MdmParameters licenseUsername. */
        public licenseUsername?: (string | null);
        /** MdmParameters licensePassword. */
        public licensePassword?: (string | null);
        /** MdmParameters nickname. */
        public nickname?: (string | null);
        /** MdmParameters firstName. */
        public firstName?: (string | null);
        /** MdmParameters lastName. */
        public lastName?: (string | null);
        /** MdmParameters customerSpecificId. */
        public customerSpecificId?: (string | null);
        /** MdmParameters category. */
        public category?: (string | null);
        /** MdmParameters linkedEmail. */
        public linkedEmail?: (string | null);
        /** MdmParameters linkedPhone. */
        public linkedPhone?: (string | null);
        /** MdmParameters identityRestore. */
        public identityRestore?: (string | null);
        /** MdmParameters identityRestorePassword. */
        public identityRestorePassword?: (string | null);
        /** MdmParameters threemaSafePolicy. */
        public threemaSafePolicy?: (sync.MdmParameters.ThreemaSafePolicy | null);
        /** MdmParameters threemaSafePassword. */
        public threemaSafePassword?: (string | null);
        /** MdmParameters threemaSafePasswordPattern. */
        public threemaSafePasswordPattern?: (string | null);
        /** MdmParameters threemaSafePasswordPatternErrorMessage. */
        public threemaSafePasswordPatternErrorMessage?: (string | null);
        /** MdmParameters threemaSafeServerUrl. */
        public threemaSafeServerUrl?: (string | null);
        /** MdmParameters threemaSafeServerUsername. */
        public threemaSafeServerUsername?: (string | null);
        /** MdmParameters threemaSafeServerPassword. */
        public threemaSafeServerPassword?: (string | null);
        /** MdmParameters threemaSafeRestorePolicy. */
        public threemaSafeRestorePolicy?: (sync.MdmParameters.ThreemaSafeRestorePolicy | null);
        /** MdmParameters threemaSafeRestoreIdentity. */
        public threemaSafeRestoreIdentity?: (string | null);
        /** MdmParameters overridePolicy. */
        public overridePolicy?: (sync.MdmParameters.OverridePolicy | null);
        /** MdmParameters contactSyncPolicy. */
        public contactSyncPolicy?: (sync.MdmParameters.ContactSyncPolicy | null);
        /** MdmParameters inactiveIdentityDisplayPolicy. */
        public inactiveIdentityDisplayPolicy?: (sync.MdmParameters.InactiveIdentityDisplayPolicy | null);
        /** MdmParameters unknownContactPolicy. */
        public unknownContactPolicy?: (sync.MdmParameters.UnknownContactPolicy | null);
        /** MdmParameters autoSaveMediaPolicy. */
        public autoSaveMediaPolicy?: (sync.MdmParameters.AutoSaveMediaPolicy | null);
        /** MdmParameters screenshotPolicy. */
        public screenshotPolicy?: (sync.MdmParameters.ScreenshotPolicy | null);
        /** MdmParameters addContactPolicy. */
        public addContactPolicy?: (sync.MdmParameters.AddContactPolicy | null);
        /** MdmParameters chatExportPolicy. */
        public chatExportPolicy?: (sync.MdmParameters.ChatExportPolicy | null);
        /** MdmParameters backupPolicy. */
        public backupPolicy?: (sync.MdmParameters.BackupPolicy | null);
        /** MdmParameters identityExportPolicy. */
        public identityExportPolicy?: (sync.MdmParameters.IdentityExportPolicy | null);
        /** MdmParameters dataBackupPolicy. */
        public dataBackupPolicy?: (sync.MdmParameters.DataBackupPolicy | null);
        /** MdmParameters systemBackupPolicy. */
        public systemBackupPolicy?: (sync.MdmParameters.SystemBackupPolicy | null);
        /** MdmParameters messagePreviewPolicy. */
        public messagePreviewPolicy?: (sync.MdmParameters.MessagePreviewPolicy | null);
        /** MdmParameters profilePictureSharePolicy. */
        public profilePictureSharePolicy?: (sync.MdmParameters.ProfilePictureSharePolicy | null);
        /** MdmParameters callPolicy. */
        public callPolicy?: (sync.MdmParameters.CallPolicy | null);
        /** MdmParameters setupWizardPolicy. */
        public setupWizardPolicy?: (sync.MdmParameters.SetupWizardPolicy | null);
        /** MdmParameters createGroupPolicy. */
        public createGroupPolicy?: (sync.MdmParameters.CreateGroupPolicy | null);
        /** MdmParameters shareMediaPolicy. */
        public shareMediaPolicy?: (sync.MdmParameters.ShareMediaPolicy | null);
        /** MdmParameters _licenseUsername. */
        public _licenseUsername?: "licenseUsername";
        /** MdmParameters _licensePassword. */
        public _licensePassword?: "licensePassword";
        /** MdmParameters _nickname. */
        public _nickname?: "nickname";
        /** MdmParameters _firstName. */
        public _firstName?: "firstName";
        /** MdmParameters _lastName. */
        public _lastName?: "lastName";
        /** MdmParameters _customerSpecificId. */
        public _customerSpecificId?: "customerSpecificId";
        /** MdmParameters _category. */
        public _category?: "category";
        /** MdmParameters _linkedEmail. */
        public _linkedEmail?: "linkedEmail";
        /** MdmParameters _linkedPhone. */
        public _linkedPhone?: "linkedPhone";
        /** MdmParameters _identityRestore. */
        public _identityRestore?: "identityRestore";
        /** MdmParameters _identityRestorePassword. */
        public _identityRestorePassword?: "identityRestorePassword";
        /** MdmParameters _threemaSafePolicy. */
        public _threemaSafePolicy?: "threemaSafePolicy";
        /** MdmParameters _threemaSafePassword. */
        public _threemaSafePassword?: "threemaSafePassword";
        /** MdmParameters _threemaSafePasswordPattern. */
        public _threemaSafePasswordPattern?: "threemaSafePasswordPattern";
        /** MdmParameters _threemaSafePasswordPatternErrorMessage. */
        public _threemaSafePasswordPatternErrorMessage?: "threemaSafePasswordPatternErrorMessage";
        /** MdmParameters _threemaSafeServerUrl. */
        public _threemaSafeServerUrl?: "threemaSafeServerUrl";
        /** MdmParameters _threemaSafeServerUsername. */
        public _threemaSafeServerUsername?: "threemaSafeServerUsername";
        /** MdmParameters _threemaSafeServerPassword. */
        public _threemaSafeServerPassword?: "threemaSafeServerPassword";
        /** MdmParameters _threemaSafeRestorePolicy. */
        public _threemaSafeRestorePolicy?: "threemaSafeRestorePolicy";
        /** MdmParameters _threemaSafeRestoreIdentity. */
        public _threemaSafeRestoreIdentity?: "threemaSafeRestoreIdentity";
        /** MdmParameters _overridePolicy. */
        public _overridePolicy?: "overridePolicy";
        /** MdmParameters _contactSyncPolicy. */
        public _contactSyncPolicy?: "contactSyncPolicy";
        /** MdmParameters _inactiveIdentityDisplayPolicy. */
        public _inactiveIdentityDisplayPolicy?: "inactiveIdentityDisplayPolicy";
        /** MdmParameters _unknownContactPolicy. */
        public _unknownContactPolicy?: "unknownContactPolicy";
        /** MdmParameters _autoSaveMediaPolicy. */
        public _autoSaveMediaPolicy?: "autoSaveMediaPolicy";
        /** MdmParameters _screenshotPolicy. */
        public _screenshotPolicy?: "screenshotPolicy";
        /** MdmParameters _addContactPolicy. */
        public _addContactPolicy?: "addContactPolicy";
        /** MdmParameters _chatExportPolicy. */
        public _chatExportPolicy?: "chatExportPolicy";
        /** MdmParameters _backupPolicy. */
        public _backupPolicy?: "backupPolicy";
        /** MdmParameters _identityExportPolicy. */
        public _identityExportPolicy?: "identityExportPolicy";
        /** MdmParameters _dataBackupPolicy. */
        public _dataBackupPolicy?: "dataBackupPolicy";
        /** MdmParameters _systemBackupPolicy. */
        public _systemBackupPolicy?: "systemBackupPolicy";
        /** MdmParameters _messagePreviewPolicy. */
        public _messagePreviewPolicy?: "messagePreviewPolicy";
        /** MdmParameters _profilePictureSharePolicy. */
        public _profilePictureSharePolicy?: "profilePictureSharePolicy";
        /** MdmParameters _callPolicy. */
        public _callPolicy?: "callPolicy";
        /** MdmParameters _setupWizardPolicy. */
        public _setupWizardPolicy?: "setupWizardPolicy";
        /** MdmParameters _createGroupPolicy. */
        public _createGroupPolicy?: "createGroupPolicy";
        /** MdmParameters _shareMediaPolicy. */
        public _shareMediaPolicy?: "shareMediaPolicy";
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
        /** ThreemaSafePolicy enum. */
        enum ThreemaSafePolicy {
            SAFE_OPTIONAL = 0,
            SAFE_MANDATORY = 1,
            SAFE_DISABLED = 2
        }
        /** ThreemaSafeRestorePolicy enum. */
        enum ThreemaSafeRestorePolicy {
            SAFE_RESTORE_OPTIONAL = 0,
            SAFE_RESTORE_MANDATORY = 1,
            SAFE_RESTORE_DISABLED = 2
        }
        /** OverridePolicy enum. */
        enum OverridePolicy {
            LOOSE = 0,
            STRICT = 1
        }
        /** ContactSyncPolicy enum. */
        enum ContactSyncPolicy {
            NOT_SYNCED = 0,
            SYNC = 1
        }
        /** InactiveIdentityDisplayPolicy enum. */
        enum InactiveIdentityDisplayPolicy {
            SHOW_INACTIVE = 0,
            HIDE_INACTIVE = 1
        }
        /** UnknownContactPolicy enum. */
        enum UnknownContactPolicy {
            ALLOW_UNKNOWN = 0,
            BLOCK_UNKNOWN = 1
        }
        /** AutoSaveMediaPolicy enum. */
        enum AutoSaveMediaPolicy {
            ALLOW_AUTO_SAVE = 0,
            DENY_AUTO_SAVE = 1
        }
        /** ScreenshotPolicy enum. */
        enum ScreenshotPolicy {
            ALLOW_SCREENSHOT = 0,
            DENY_SCREENSHOT = 1
        }
        /** AddContactPolicy enum. */
        enum AddContactPolicy {
            ALLOW_ADD_CONTACT = 0,
            DENY_ADD_CONTACT = 1
        }
        /** ChatExportPolicy enum. */
        enum ChatExportPolicy {
            ALLOW_CHAT_EXPORT = 0,
            DENY_CHAT_EXPORT = 1
        }
        /** BackupPolicy enum. */
        enum BackupPolicy {
            ALLOW_BACKUP = 0,
            DENY_BACKUP = 1
        }
        /** IdentityExportPolicy enum. */
        enum IdentityExportPolicy {
            ALLOW_IDENTITY_EXPORT = 0,
            DENY_IDENTITY_EXPORT = 1
        }
        /** DataBackupPolicy enum. */
        enum DataBackupPolicy {
            ALLOW_DATA_BACKUP = 0,
            DENY_DATA_BACKUP = 1
        }
        /** SystemBackupPolicy enum. */
        enum SystemBackupPolicy {
            ALLOW_SYSTEM_BACKUP = 0,
            DENY_SYSTEM_BACKUP = 1
        }
        /** MessagePreviewPolicy enum. */
        enum MessagePreviewPolicy {
            ALLOW_PREVIEW = 0,
            DENY_PREVIEW = 1
        }
        /** ProfilePictureSharePolicy enum. */
        enum ProfilePictureSharePolicy {
            ALLOW_SHARE = 0,
            DENY_SHARE = 1
        }
        /** CallPolicy enum. */
        enum CallPolicy {
            ALLOW_CALL = 0,
            DENY_CALL = 1
        }
        /** SetupWizardPolicy enum. */
        enum SetupWizardPolicy {
            SHOW_WIZARD = 0,
            SKIP_WIZARD = 1
        }
        /** CreateGroupPolicy enum. */
        enum CreateGroupPolicy {
            ALLOW_CREATE_GROUP = 0,
            DENY_CREATE_GROUP = 1
        }
        /** ShareMediaPolicy enum. */
        enum ShareMediaPolicy {
            ALLOW_SHARE_MEDIA = 0,
            DENY_OUTSIDE_APP = 1
        }
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
        featureMask?: (number | null);
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
        public featureMask?: (number | null);
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
        /** Settings callPolicy */
        callPolicy?: (sync.Settings.CallPolicy | null);
        /** Settings callConnectionPolity */
        callConnectionPolity?: (sync.Settings.CallConnectionPolicy | null);
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
        /** Settings callPolicy. */
        public callPolicy?: (sync.Settings.CallPolicy | null);
        /** Settings callConnectionPolity. */
        public callConnectionPolity?: (sync.Settings.CallConnectionPolicy | null);
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
        /** Settings _callPolicy. */
        public _callPolicy?: "callPolicy";
        /** Settings _callConnectionPolity. */
        public _callConnectionPolity?: "callConnectionPolity";
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
        /** CallPolicy enum. */
        enum CallPolicy {
            ALLOW_CALL = 0,
            DENY_CALL = 1
        }
        /** CallConnectionPolicy enum. */
        enum CallConnectionPolicy {
            ALLOW_DIRECT = 0,
            REQUIRE_RELAY = 1
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
    /** Properties of a FromNewDeviceEnvelope. */
    interface IFromNewDeviceEnvelope {
        /** FromNewDeviceEnvelope begin */
        begin?: (join.Begin | null);
        /** FromNewDeviceEnvelope registered */
        registered?: (join.Registered | null);
    }
    type FromNewDeviceEnvelopeEncodable = types.WeakOpaque<IFromNewDeviceEnvelope, {
        readonly FromNewDeviceEnvelopeEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a FromNewDeviceEnvelope. */
    class FromNewDeviceEnvelope implements IFromNewDeviceEnvelope {
        /**
         * Constructs a new FromNewDeviceEnvelope.
         * @param [properties] Properties to set
         */
        constructor(properties?: join.IFromNewDeviceEnvelope);
        /** FromNewDeviceEnvelope begin. */
        public begin?: (join.Begin | null);
        /** FromNewDeviceEnvelope registered. */
        public registered?: (join.Registered | null);
        /** FromNewDeviceEnvelope content. */
        public content?: ("begin" | "registered");
        /**
         * Encodes the specified FromNewDeviceEnvelope message. Does not implicitly {@link join.FromNewDeviceEnvelope.verify|verify} messages.
         * @param message FromNewDeviceEnvelope message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: join.FromNewDeviceEnvelopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a FromNewDeviceEnvelope message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns FromNewDeviceEnvelope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): join.FromNewDeviceEnvelope;
    }
    /** Properties of a FromExistingDeviceEnvelope. */
    interface IFromExistingDeviceEnvelope {
        /** FromExistingDeviceEnvelope blobData */
        blobData?: (common.BlobData | null);
        /** FromExistingDeviceEnvelope essentialData */
        essentialData?: (join.EssentialData | null);
    }
    type FromExistingDeviceEnvelopeEncodable = types.WeakOpaque<IFromExistingDeviceEnvelope, {
        readonly FromExistingDeviceEnvelopeEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a FromExistingDeviceEnvelope. */
    class FromExistingDeviceEnvelope implements IFromExistingDeviceEnvelope {
        /**
         * Constructs a new FromExistingDeviceEnvelope.
         * @param [properties] Properties to set
         */
        constructor(properties?: join.IFromExistingDeviceEnvelope);
        /** FromExistingDeviceEnvelope blobData. */
        public blobData?: (common.BlobData | null);
        /** FromExistingDeviceEnvelope essentialData. */
        public essentialData?: (join.EssentialData | null);
        /** FromExistingDeviceEnvelope content. */
        public content?: ("blobData" | "essentialData");
        /**
         * Encodes the specified FromExistingDeviceEnvelope message. Does not implicitly {@link join.FromExistingDeviceEnvelope.verify|verify} messages.
         * @param message FromExistingDeviceEnvelope message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: join.FromExistingDeviceEnvelopeEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a FromExistingDeviceEnvelope message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns FromExistingDeviceEnvelope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): join.FromExistingDeviceEnvelope;
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
        /** EssentialData mediatorServer */
        mediatorServer?: (join.EssentialData.MediatorServer | null);
        /** EssentialData clientKey */
        clientKey?: (Uint8Array | null);
        /** EssentialData userProfile */
        userProfile?: (sync.UserProfile | null);
        /** EssentialData settings */
        settings?: (sync.Settings | null);
        /** EssentialData contacts */
        contacts?: (readonly sync.Contact[] | null);
        /** EssentialData groups */
        groups?: (readonly sync.Group[] | null);
        /** EssentialData distributionLists */
        distributionLists?: (readonly sync.DistributionList[] | null);
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
        /** EssentialData mediatorServer. */
        public mediatorServer?: (join.EssentialData.MediatorServer | null);
        /** EssentialData clientKey. */
        public clientKey: Uint8Array;
        /** EssentialData userProfile. */
        public userProfile?: (sync.UserProfile | null);
        /** EssentialData settings. */
        public settings?: (sync.Settings | null);
        /** EssentialData contacts. */
        public contacts: readonly sync.Contact[];
        /** EssentialData groups. */
        public groups: readonly sync.Group[];
        /** EssentialData distributionLists. */
        public distributionLists: readonly sync.DistributionList[];
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
        /** Properties of a MediatorServer. */
        interface IMediatorServer {
            /** MediatorServer publicKey */
            publicKey?: (Uint8Array | null);
            /** MediatorServer webSocketHostname */
            webSocketHostname?: (string | null);
        }
        type MediatorServerEncodable = types.WeakOpaque<IMediatorServer, {
            readonly MediatorServerEncodable: unique symbol;
        } & tag.ProtobufMessage>;
        /** Represents a MediatorServer. */
        class MediatorServer implements IMediatorServer {
            /**
             * Constructs a new MediatorServer.
             * @param [properties] Properties to set
             */
            constructor(properties?: join.EssentialData.IMediatorServer);
            /** MediatorServer publicKey. */
            public publicKey: Uint8Array;
            /** MediatorServer webSocketHostname. */
            public webSocketHostname?: (string | null);
            /** MediatorServer address. */
            public address?: "webSocketHostname";
            /**
             * Encodes the specified MediatorServer message. Does not implicitly {@link join.EssentialData.MediatorServer.verify|verify} messages.
             * @param message MediatorServer message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: join.EssentialData.MediatorServerEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a MediatorServer message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns MediatorServer
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): join.EssentialData.MediatorServer;
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
    /** NetworkCost enum. */
    enum NetworkCost {
        UNKNOWN = 0,
        UNMETERED = 1,
        METERED = 2
    }
    /** Properties of a RendezvousInit. */
    interface IRendezvousInit {
        /** RendezvousInit key */
        key?: (Uint8Array | null);
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
        /** RendezvousInit key. */
        public key: Uint8Array;
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
        /** Properties of a RelayedWebSocket. */
        interface IRelayedWebSocket {
            /** RelayedWebSocket pathId */
            pathId?: (number | null);
            /** RelayedWebSocket networkCost */
            networkCost?: (rendezvous.NetworkCost | null);
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
            public networkCost: rendezvous.NetworkCost;
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
                networkCost?: (rendezvous.NetworkCost | null);
                /** IpAddress ipv4 */
                ipv4?: (Uint8Array | null);
                /** IpAddress ipv6 */
                ipv6?: (Uint8Array | null);
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
                public networkCost: rendezvous.NetworkCost;
                /** IpAddress ipv4. */
                public ipv4?: (Uint8Array | null);
                /** IpAddress ipv6. */
                public ipv6?: (Uint8Array | null);
                /** IpAddress ip. */
                public ip?: ("ipv4" | "ipv6");
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
}
/** Namespace d2m. */
export namespace d2m {
    /** Properties of a ClientUrlInfo. */
    interface IClientUrlInfo {
        /** ClientUrlInfo deviceGroupId */
        deviceGroupId?: (Uint8Array | null);
        /** ClientUrlInfo serverGroup */
        serverGroup?: (number | null);
        /** ClientUrlInfo serverGroupString */
        serverGroupString?: (string | null);
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
        public serverGroup: number;
        /** ClientUrlInfo serverGroupString. */
        public serverGroupString: string;
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
        public expectedDeviceSlotState?: (d2m.DeviceSlotState | null);
        /** ClientHello encryptedDeviceInfo. */
        public encryptedDeviceInfo: Uint8Array;
        /** ClientHello _expectedDeviceSlotState. */
        public _expectedDeviceSlotState?: "expectedDeviceSlotState";
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
            /** AugmentedDeviceInfo lastLoginAt */
            lastLoginAt?: (Long | null);
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
            /** AugmentedDeviceInfo lastLoginAt. */
            public lastLoginAt: Long;
            /** AugmentedDeviceInfo deviceSlotExpirationPolicy. */
            public deviceSlotExpirationPolicy: d2m.DeviceSlotExpirationPolicy;
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
    /** Properties of a DeviceFamilyJoinRequestOrOffer. */
    interface IDeviceFamilyJoinRequestOrOffer {
        /** DeviceFamilyJoinRequestOrOffer variant */
        variant?: (url.DeviceFamilyJoinRequestOrOffer.Variant | null);
        /** DeviceFamilyJoinRequestOrOffer pskSalt */
        pskSalt?: (Uint8Array | null);
        /** DeviceFamilyJoinRequestOrOffer encryptedRendezvousData */
        encryptedRendezvousData?: (Uint8Array | null);
    }
    type DeviceFamilyJoinRequestOrOfferEncodable = types.WeakOpaque<IDeviceFamilyJoinRequestOrOffer, {
        readonly DeviceFamilyJoinRequestOrOfferEncodable: unique symbol;
    } & tag.ProtobufMessage>;
    /** Represents a DeviceFamilyJoinRequestOrOffer. */
    class DeviceFamilyJoinRequestOrOffer implements IDeviceFamilyJoinRequestOrOffer {
        /**
         * Constructs a new DeviceFamilyJoinRequestOrOffer.
         * @param [properties] Properties to set
         */
        constructor(properties?: url.IDeviceFamilyJoinRequestOrOffer);
        /** DeviceFamilyJoinRequestOrOffer variant. */
        public variant?: (url.DeviceFamilyJoinRequestOrOffer.Variant | null);
        /** DeviceFamilyJoinRequestOrOffer pskSalt. */
        public pskSalt: Uint8Array;
        /** DeviceFamilyJoinRequestOrOffer encryptedRendezvousData. */
        public encryptedRendezvousData: Uint8Array;
        /**
         * Encodes the specified DeviceFamilyJoinRequestOrOffer message. Does not implicitly {@link url.DeviceFamilyJoinRequestOrOffer.verify|verify} messages.
         * @param message DeviceFamilyJoinRequestOrOffer message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: url.DeviceFamilyJoinRequestOrOfferEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
        /**
         * Decodes a DeviceFamilyJoinRequestOrOffer message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DeviceFamilyJoinRequestOrOffer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): url.DeviceFamilyJoinRequestOrOffer;
    }
    namespace DeviceFamilyJoinRequestOrOffer {
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
            constructor(properties?: url.DeviceFamilyJoinRequestOrOffer.IVariant);
            /** Variant requestToJoin. */
            public requestToJoin?: (common.Unit | null);
            /** Variant offerToJoin. */
            public offerToJoin?: (common.Unit | null);
            /** Variant type. */
            public type?: ("requestToJoin" | "offerToJoin");
            /**
             * Encodes the specified Variant message. Does not implicitly {@link url.DeviceFamilyJoinRequestOrOffer.Variant.verify|verify} messages.
             * @param message Variant message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: url.DeviceFamilyJoinRequestOrOffer.VariantEncodable, writer?: $protobuf.Writer): $protobuf.Writer;
            /**
             * Decodes a Variant message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Variant
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader | Uint8Array), length?: number): url.DeviceFamilyJoinRequestOrOffer.Variant;
        }
    }
}
