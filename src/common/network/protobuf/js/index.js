/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Use LongJS
import Long from 'long';
$protobuf.util.Long = Long;
$protobuf.configure();

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const common = $root.common = (() => {

    /**
     * Namespace common.
     * @exports common
     * @namespace
     */
    const common = {};

    common.Unit = (function() {

        /**
         * Properties of an Unit.
         * @memberof common
         * @interface IUnit
         */

        /**
         * Constructs a new Unit.
         * @memberof common
         * @classdesc Represents an Unit.
         * @implements IUnit
         * @constructor
         * @param {common.IUnit=} [properties] Properties to set
         */
        function Unit(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified Unit message. Does not implicitly {@link common.Unit.verify|verify} messages.
         * @function encode
         * @memberof common.Unit
         * @static
         * @param {common.Unit} message Unit message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Unit.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes an Unit message from the specified reader or buffer.
         * @function decode
         * @memberof common.Unit
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {common.Unit} Unit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Unit.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.common.Unit();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return Unit;
    })();

    common.Blob = (function() {

        /**
         * Properties of a Blob.
         * @memberof common
         * @interface IBlob
         * @property {Uint8Array|null} [id] Blob id
         * @property {Uint8Array|null} [nonce] Blob nonce
         * @property {Uint8Array|null} [key] Blob key
         * @property {Long|null} [uploadedAt] Blob uploadedAt
         */

        /**
         * Constructs a new Blob.
         * @memberof common
         * @classdesc Represents a Blob.
         * @implements IBlob
         * @constructor
         * @param {common.IBlob=} [properties] Properties to set
         */
        function Blob(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Blob id.
         * @member {Uint8Array} id
         * @memberof common.Blob
         * @instance
         */
        Blob.prototype.id = $util.newBuffer([]);

        /**
         * Blob nonce.
         * @member {Uint8Array} nonce
         * @memberof common.Blob
         * @instance
         */
        Blob.prototype.nonce = $util.newBuffer([]);

        /**
         * Blob key.
         * @member {Uint8Array} key
         * @memberof common.Blob
         * @instance
         */
        Blob.prototype.key = $util.newBuffer([]);

        /**
         * Blob uploadedAt.
         * @member {Long} uploadedAt
         * @memberof common.Blob
         * @instance
         */
        Blob.prototype.uploadedAt = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Encodes the specified Blob message. Does not implicitly {@link common.Blob.verify|verify} messages.
         * @function encode
         * @memberof common.Blob
         * @static
         * @param {common.Blob} message Blob message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Blob.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.id);
            if (message.nonce != null && Object.hasOwnProperty.call(message, "nonce"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.nonce);
            if (message.key != null && Object.hasOwnProperty.call(message, "key"))
                writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.key);
            if (message.uploadedAt != null && Object.hasOwnProperty.call(message, "uploadedAt"))
                writer.uint32(/* id 4, wireType 0 =*/32).uint64(message.uploadedAt);
            return writer;
        };

        /**
         * Decodes a Blob message from the specified reader or buffer.
         * @function decode
         * @memberof common.Blob
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {common.Blob} Blob
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Blob.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.common.Blob();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.bytes();
                        break;
                    }
                case 2: {
                        message.nonce = reader.bytes();
                        break;
                    }
                case 3: {
                        message.key = reader.bytes();
                        break;
                    }
                case 4: {
                        message.uploadedAt = reader.uint64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return Blob;
    })();

    common.BlobData = (function() {

        /**
         * Properties of a BlobData.
         * @memberof common
         * @interface IBlobData
         * @property {Uint8Array|null} [id] BlobData id
         * @property {Uint8Array|null} [data] BlobData data
         */

        /**
         * Constructs a new BlobData.
         * @memberof common
         * @classdesc Represents a BlobData.
         * @implements IBlobData
         * @constructor
         * @param {common.IBlobData=} [properties] Properties to set
         */
        function BlobData(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BlobData id.
         * @member {Uint8Array} id
         * @memberof common.BlobData
         * @instance
         */
        BlobData.prototype.id = $util.newBuffer([]);

        /**
         * BlobData data.
         * @member {Uint8Array} data
         * @memberof common.BlobData
         * @instance
         */
        BlobData.prototype.data = $util.newBuffer([]);

        /**
         * Encodes the specified BlobData message. Does not implicitly {@link common.BlobData.verify|verify} messages.
         * @function encode
         * @memberof common.BlobData
         * @static
         * @param {common.BlobData} message BlobData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BlobData.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.id);
            if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.data);
            return writer;
        };

        /**
         * Decodes a BlobData message from the specified reader or buffer.
         * @function decode
         * @memberof common.BlobData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {common.BlobData} BlobData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BlobData.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.common.BlobData();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.bytes();
                        break;
                    }
                case 2: {
                        message.data = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return BlobData;
    })();

    common.Image = (function() {

        /**
         * Properties of an Image.
         * @memberof common
         * @interface IImage
         * @property {common.Image.Type|null} [type] Image type
         * @property {common.Blob|null} [blob] Image blob
         */

        /**
         * Constructs a new Image.
         * @memberof common
         * @classdesc Represents an Image.
         * @implements IImage
         * @constructor
         * @param {common.IImage=} [properties] Properties to set
         */
        function Image(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Image type.
         * @member {common.Image.Type} type
         * @memberof common.Image
         * @instance
         */
        Image.prototype.type = 0;

        /**
         * Image blob.
         * @member {common.Blob|null|undefined} blob
         * @memberof common.Image
         * @instance
         */
        Image.prototype.blob = null;

        /**
         * Encodes the specified Image message. Does not implicitly {@link common.Image.verify|verify} messages.
         * @function encode
         * @memberof common.Image
         * @static
         * @param {common.Image} message Image message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Image.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.type);
            if (message.blob != null && Object.hasOwnProperty.call(message, "blob"))
                $root.common.Blob.encode(message.blob, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes an Image message from the specified reader or buffer.
         * @function decode
         * @memberof common.Image
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {common.Image} Image
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Image.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.common.Image();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.type = reader.int32();
                        break;
                    }
                case 2: {
                        message.blob = $root.common.Blob.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Type enum.
         * @name common.Image.Type
         * @enum {number}
         * @property {number} JPEG=0 JPEG value
         */
        Image.Type = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "JPEG"] = 0;
            return values;
        })();

        return Image;
    })();

    common.GroupIdentity = (function() {

        /**
         * Properties of a GroupIdentity.
         * @memberof common
         * @interface IGroupIdentity
         * @property {Long|null} [groupId] GroupIdentity groupId
         * @property {string|null} [creatorIdentity] GroupIdentity creatorIdentity
         */

        /**
         * Constructs a new GroupIdentity.
         * @memberof common
         * @classdesc Represents a GroupIdentity.
         * @implements IGroupIdentity
         * @constructor
         * @param {common.IGroupIdentity=} [properties] Properties to set
         */
        function GroupIdentity(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GroupIdentity groupId.
         * @member {Long} groupId
         * @memberof common.GroupIdentity
         * @instance
         */
        GroupIdentity.prototype.groupId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * GroupIdentity creatorIdentity.
         * @member {string} creatorIdentity
         * @memberof common.GroupIdentity
         * @instance
         */
        GroupIdentity.prototype.creatorIdentity = "";

        /**
         * Encodes the specified GroupIdentity message. Does not implicitly {@link common.GroupIdentity.verify|verify} messages.
         * @function encode
         * @memberof common.GroupIdentity
         * @static
         * @param {common.GroupIdentity} message GroupIdentity message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GroupIdentity.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.groupId != null && Object.hasOwnProperty.call(message, "groupId"))
                writer.uint32(/* id 1, wireType 1 =*/9).fixed64(message.groupId);
            if (message.creatorIdentity != null && Object.hasOwnProperty.call(message, "creatorIdentity"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.creatorIdentity);
            return writer;
        };

        /**
         * Decodes a GroupIdentity message from the specified reader or buffer.
         * @function decode
         * @memberof common.GroupIdentity
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {common.GroupIdentity} GroupIdentity
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GroupIdentity.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.common.GroupIdentity();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.groupId = reader.fixed64();
                        break;
                    }
                case 2: {
                        message.creatorIdentity = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return GroupIdentity;
    })();

    common.DeltaImage = (function() {

        /**
         * Properties of a DeltaImage.
         * @memberof common
         * @interface IDeltaImage
         * @property {common.Unit|null} [removed] DeltaImage removed
         * @property {common.Image|null} [updated] DeltaImage updated
         */

        /**
         * Constructs a new DeltaImage.
         * @memberof common
         * @classdesc Represents a DeltaImage.
         * @implements IDeltaImage
         * @constructor
         * @param {common.IDeltaImage=} [properties] Properties to set
         */
        function DeltaImage(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DeltaImage removed.
         * @member {common.Unit|null|undefined} removed
         * @memberof common.DeltaImage
         * @instance
         */
        DeltaImage.prototype.removed = null;

        /**
         * DeltaImage updated.
         * @member {common.Image|null|undefined} updated
         * @memberof common.DeltaImage
         * @instance
         */
        DeltaImage.prototype.updated = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * DeltaImage image.
         * @member {"removed"|"updated"|undefined} image
         * @memberof common.DeltaImage
         * @instance
         */
        Object.defineProperty(DeltaImage.prototype, "image", {
            get: $util.oneOfGetter($oneOfFields = ["removed", "updated"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified DeltaImage message. Does not implicitly {@link common.DeltaImage.verify|verify} messages.
         * @function encode
         * @memberof common.DeltaImage
         * @static
         * @param {common.DeltaImage} message DeltaImage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DeltaImage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.removed != null && Object.hasOwnProperty.call(message, "removed"))
                $root.common.Unit.encode(message.removed, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.updated != null && Object.hasOwnProperty.call(message, "updated"))
                $root.common.Image.encode(message.updated, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a DeltaImage message from the specified reader or buffer.
         * @function decode
         * @memberof common.DeltaImage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {common.DeltaImage} DeltaImage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeltaImage.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.common.DeltaImage();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.removed = $root.common.Unit.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.updated = $root.common.Image.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return DeltaImage;
    })();

    common.Timespan = (function() {

        /**
         * Properties of a Timespan.
         * @memberof common
         * @interface ITimespan
         * @property {Long|null} [from] Timespan from
         * @property {Long|null} [to] Timespan to
         */

        /**
         * Constructs a new Timespan.
         * @memberof common
         * @classdesc Represents a Timespan.
         * @implements ITimespan
         * @constructor
         * @param {common.ITimespan=} [properties] Properties to set
         */
        function Timespan(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Timespan from.
         * @member {Long} from
         * @memberof common.Timespan
         * @instance
         */
        Timespan.prototype.from = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Timespan to.
         * @member {Long} to
         * @memberof common.Timespan
         * @instance
         */
        Timespan.prototype.to = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Encodes the specified Timespan message. Does not implicitly {@link common.Timespan.verify|verify} messages.
         * @function encode
         * @memberof common.Timespan
         * @static
         * @param {common.Timespan} message Timespan message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Timespan.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.from != null && Object.hasOwnProperty.call(message, "from"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.from);
            if (message.to != null && Object.hasOwnProperty.call(message, "to"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.to);
            return writer;
        };

        /**
         * Decodes a Timespan message from the specified reader or buffer.
         * @function decode
         * @memberof common.Timespan
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {common.Timespan} Timespan
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Timespan.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.common.Timespan();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.from = reader.uint64();
                        break;
                    }
                case 2: {
                        message.to = reader.uint64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return Timespan;
    })();

    common.Identities = (function() {

        /**
         * Properties of an Identities.
         * @memberof common
         * @interface IIdentities
         * @property {Array.<string>|null} [identities] Identities identities
         */

        /**
         * Constructs a new Identities.
         * @memberof common
         * @classdesc Represents an Identities.
         * @implements IIdentities
         * @constructor
         * @param {common.IIdentities=} [properties] Properties to set
         */
        function Identities(properties) {
            this.identities = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Identities identities.
         * @member {Array.<string>} identities
         * @memberof common.Identities
         * @instance
         */
        Identities.prototype.identities = $util.emptyArray;

        /**
         * Encodes the specified Identities message. Does not implicitly {@link common.Identities.verify|verify} messages.
         * @function encode
         * @memberof common.Identities
         * @static
         * @param {common.Identities} message Identities message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Identities.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.identities != null && message.identities.length)
                for (let i = 0; i < message.identities.length; ++i)
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.identities[i]);
            return writer;
        };

        /**
         * Decodes an Identities message from the specified reader or buffer.
         * @function decode
         * @memberof common.Identities
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {common.Identities} Identities
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Identities.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.common.Identities();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.identities && message.identities.length))
                            message.identities = [];
                        message.identities.push(reader.string());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return Identities;
    })();

    common.Resolution = (function() {

        /**
         * Properties of a Resolution.
         * @memberof common
         * @interface IResolution
         * @property {number|null} [width] Resolution width
         * @property {number|null} [height] Resolution height
         */

        /**
         * Constructs a new Resolution.
         * @memberof common
         * @classdesc Represents a Resolution.
         * @implements IResolution
         * @constructor
         * @param {common.IResolution=} [properties] Properties to set
         */
        function Resolution(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Resolution width.
         * @member {number} width
         * @memberof common.Resolution
         * @instance
         */
        Resolution.prototype.width = 0;

        /**
         * Resolution height.
         * @member {number} height
         * @memberof common.Resolution
         * @instance
         */
        Resolution.prototype.height = 0;

        /**
         * Encodes the specified Resolution message. Does not implicitly {@link common.Resolution.verify|verify} messages.
         * @function encode
         * @memberof common.Resolution
         * @static
         * @param {common.Resolution} message Resolution message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Resolution.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.width != null && Object.hasOwnProperty.call(message, "width"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.width);
            if (message.height != null && Object.hasOwnProperty.call(message, "height"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.height);
            return writer;
        };

        /**
         * Decodes a Resolution message from the specified reader or buffer.
         * @function decode
         * @memberof common.Resolution
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {common.Resolution} Resolution
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Resolution.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.common.Resolution();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.width = reader.uint32();
                        break;
                    }
                case 2: {
                        message.height = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return Resolution;
    })();

    /**
     * CspFeatureMaskFlag enum.
     * @name common.CspFeatureMaskFlag
     * @enum {number}
     * @property {number} NONE=0 NONE value
     * @property {number} VOICE_MESSAGE_SUPPORT=1 VOICE_MESSAGE_SUPPORT value
     * @property {number} GROUP_SUPPORT=2 GROUP_SUPPORT value
     * @property {number} POLL_SUPPORT=4 POLL_SUPPORT value
     * @property {number} FILE_MESSAGE_SUPPORT=8 FILE_MESSAGE_SUPPORT value
     * @property {number} O2O_AUDIO_CALL_SUPPORT=16 O2O_AUDIO_CALL_SUPPORT value
     * @property {number} O2O_VIDEO_CALL_SUPPORT=32 O2O_VIDEO_CALL_SUPPORT value
     * @property {number} FORWARD_SECURITY_SUPPORT=64 FORWARD_SECURITY_SUPPORT value
     * @property {number} GROUP_CALL_SUPPORT=128 GROUP_CALL_SUPPORT value
     */
    common.CspFeatureMaskFlag = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "NONE"] = 0;
        values[valuesById[1] = "VOICE_MESSAGE_SUPPORT"] = 1;
        values[valuesById[2] = "GROUP_SUPPORT"] = 2;
        values[valuesById[4] = "POLL_SUPPORT"] = 4;
        values[valuesById[8] = "FILE_MESSAGE_SUPPORT"] = 8;
        values[valuesById[16] = "O2O_AUDIO_CALL_SUPPORT"] = 16;
        values[valuesById[32] = "O2O_VIDEO_CALL_SUPPORT"] = 32;
        values[valuesById[64] = "FORWARD_SECURITY_SUPPORT"] = 64;
        values[valuesById[128] = "GROUP_CALL_SUPPORT"] = 128;
        return values;
    })();

    /**
     * CspE2eMessageType enum.
     * @name common.CspE2eMessageType
     * @enum {number}
     * @property {number} _INVALID_TYPE=0 _INVALID_TYPE value
     * @property {number} TEXT=1 TEXT value
     * @property {number} DEPRECATED_IMAGE=2 DEPRECATED_IMAGE value
     * @property {number} LOCATION=16 LOCATION value
     * @property {number} DEPRECATED_AUDIO=20 DEPRECATED_AUDIO value
     * @property {number} DEPRECATED_VIDEO=19 DEPRECATED_VIDEO value
     * @property {number} FILE=23 FILE value
     * @property {number} POLL_SETUP=21 POLL_SETUP value
     * @property {number} POLL_VOTE=22 POLL_VOTE value
     * @property {number} CALL_OFFER=96 CALL_OFFER value
     * @property {number} CALL_ANSWER=97 CALL_ANSWER value
     * @property {number} CALL_ICE_CANDIDATE=98 CALL_ICE_CANDIDATE value
     * @property {number} CALL_HANGUP=99 CALL_HANGUP value
     * @property {number} CALL_RINGING=100 CALL_RINGING value
     * @property {number} DELIVERY_RECEIPT=128 DELIVERY_RECEIPT value
     * @property {number} TYPING_INDICATOR=144 TYPING_INDICATOR value
     * @property {number} CONTACT_SET_PROFILE_PICTURE=24 CONTACT_SET_PROFILE_PICTURE value
     * @property {number} CONTACT_DELETE_PROFILE_PICTURE=25 CONTACT_DELETE_PROFILE_PICTURE value
     * @property {number} CONTACT_REQUEST_PROFILE_PICTURE=26 CONTACT_REQUEST_PROFILE_PICTURE value
     * @property {number} GROUP_JOIN_REQUEST=77 GROUP_JOIN_REQUEST value
     * @property {number} GROUP_JOIN_RESPONSE=78 GROUP_JOIN_RESPONSE value
     * @property {number} GROUP_SETUP=74 GROUP_SETUP value
     * @property {number} GROUP_NAME=75 GROUP_NAME value
     * @property {number} GROUP_LEAVE=76 GROUP_LEAVE value
     * @property {number} GROUP_SET_PROFILE_PICTURE=80 GROUP_SET_PROFILE_PICTURE value
     * @property {number} GROUP_DELETE_PROFILE_PICTURE=84 GROUP_DELETE_PROFILE_PICTURE value
     * @property {number} GROUP_SYNC_REQUEST=81 GROUP_SYNC_REQUEST value
     * @property {number} GROUP_CALL_START=79 GROUP_CALL_START value
     * @property {number} GROUP_TEXT=65 GROUP_TEXT value
     * @property {number} GROUP_LOCATION=66 GROUP_LOCATION value
     * @property {number} GROUP_IMAGE=67 GROUP_IMAGE value
     * @property {number} GROUP_AUDIO=69 GROUP_AUDIO value
     * @property {number} GROUP_VIDEO=68 GROUP_VIDEO value
     * @property {number} GROUP_FILE=70 GROUP_FILE value
     * @property {number} GROUP_POLL_SETUP=82 GROUP_POLL_SETUP value
     * @property {number} GROUP_POLL_VOTE=83 GROUP_POLL_VOTE value
     * @property {number} GROUP_DELIVERY_RECEIPT=129 GROUP_DELIVERY_RECEIPT value
     * @property {number} FORWARD_SECURITY_ENVELOPE=160 FORWARD_SECURITY_ENVELOPE value
     * @property {number} WEB_SESSION_RESUME=254 WEB_SESSION_RESUME value
     */
    common.CspE2eMessageType = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "_INVALID_TYPE"] = 0;
        values[valuesById[1] = "TEXT"] = 1;
        values[valuesById[2] = "DEPRECATED_IMAGE"] = 2;
        values[valuesById[16] = "LOCATION"] = 16;
        values[valuesById[20] = "DEPRECATED_AUDIO"] = 20;
        values[valuesById[19] = "DEPRECATED_VIDEO"] = 19;
        values[valuesById[23] = "FILE"] = 23;
        values[valuesById[21] = "POLL_SETUP"] = 21;
        values[valuesById[22] = "POLL_VOTE"] = 22;
        values[valuesById[96] = "CALL_OFFER"] = 96;
        values[valuesById[97] = "CALL_ANSWER"] = 97;
        values[valuesById[98] = "CALL_ICE_CANDIDATE"] = 98;
        values[valuesById[99] = "CALL_HANGUP"] = 99;
        values[valuesById[100] = "CALL_RINGING"] = 100;
        values[valuesById[128] = "DELIVERY_RECEIPT"] = 128;
        values[valuesById[144] = "TYPING_INDICATOR"] = 144;
        values[valuesById[24] = "CONTACT_SET_PROFILE_PICTURE"] = 24;
        values[valuesById[25] = "CONTACT_DELETE_PROFILE_PICTURE"] = 25;
        values[valuesById[26] = "CONTACT_REQUEST_PROFILE_PICTURE"] = 26;
        values[valuesById[77] = "GROUP_JOIN_REQUEST"] = 77;
        values[valuesById[78] = "GROUP_JOIN_RESPONSE"] = 78;
        values[valuesById[74] = "GROUP_SETUP"] = 74;
        values[valuesById[75] = "GROUP_NAME"] = 75;
        values[valuesById[76] = "GROUP_LEAVE"] = 76;
        values[valuesById[80] = "GROUP_SET_PROFILE_PICTURE"] = 80;
        values[valuesById[84] = "GROUP_DELETE_PROFILE_PICTURE"] = 84;
        values[valuesById[81] = "GROUP_SYNC_REQUEST"] = 81;
        values[valuesById[79] = "GROUP_CALL_START"] = 79;
        values[valuesById[65] = "GROUP_TEXT"] = 65;
        values[valuesById[66] = "GROUP_LOCATION"] = 66;
        values[valuesById[67] = "GROUP_IMAGE"] = 67;
        values[valuesById[69] = "GROUP_AUDIO"] = 69;
        values[valuesById[68] = "GROUP_VIDEO"] = 68;
        values[valuesById[70] = "GROUP_FILE"] = 70;
        values[valuesById[82] = "GROUP_POLL_SETUP"] = 82;
        values[valuesById[83] = "GROUP_POLL_VOTE"] = 83;
        values[valuesById[129] = "GROUP_DELIVERY_RECEIPT"] = 129;
        values[valuesById[160] = "FORWARD_SECURITY_ENVELOPE"] = 160;
        values[valuesById[254] = "WEB_SESSION_RESUME"] = 254;
        return values;
    })();

    return common;
})();

export const csp_e2e_fs = $root.csp_e2e_fs = (() => {

    /**
     * Namespace csp_e2e_fs.
     * @exports csp_e2e_fs
     * @namespace
     */
    const csp_e2e_fs = {};

    /**
     * Version enum.
     * @name csp_e2e_fs.Version
     * @enum {number}
     * @property {number} UNSPECIFIED=0 UNSPECIFIED value
     * @property {number} V1_0=256 V1_0 value
     * @property {number} V1_1=257 V1_1 value
     */
    csp_e2e_fs.Version = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "UNSPECIFIED"] = 0;
        values[valuesById[256] = "V1_0"] = 256;
        values[valuesById[257] = "V1_1"] = 257;
        return values;
    })();

    csp_e2e_fs.VersionRange = (function() {

        /**
         * Properties of a VersionRange.
         * @memberof csp_e2e_fs
         * @interface IVersionRange
         * @property {number|null} [min] VersionRange min
         * @property {number|null} [max] VersionRange max
         */

        /**
         * Constructs a new VersionRange.
         * @memberof csp_e2e_fs
         * @classdesc Represents a VersionRange.
         * @implements IVersionRange
         * @constructor
         * @param {csp_e2e_fs.IVersionRange=} [properties] Properties to set
         */
        function VersionRange(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * VersionRange min.
         * @member {number} min
         * @memberof csp_e2e_fs.VersionRange
         * @instance
         */
        VersionRange.prototype.min = 0;

        /**
         * VersionRange max.
         * @member {number} max
         * @memberof csp_e2e_fs.VersionRange
         * @instance
         */
        VersionRange.prototype.max = 0;

        /**
         * Encodes the specified VersionRange message. Does not implicitly {@link csp_e2e_fs.VersionRange.verify|verify} messages.
         * @function encode
         * @memberof csp_e2e_fs.VersionRange
         * @static
         * @param {csp_e2e_fs.VersionRange} message VersionRange message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        VersionRange.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.min != null && Object.hasOwnProperty.call(message, "min"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.min);
            if (message.max != null && Object.hasOwnProperty.call(message, "max"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.max);
            return writer;
        };

        /**
         * Decodes a VersionRange message from the specified reader or buffer.
         * @function decode
         * @memberof csp_e2e_fs.VersionRange
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {csp_e2e_fs.VersionRange} VersionRange
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        VersionRange.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.csp_e2e_fs.VersionRange();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.min = reader.uint32();
                        break;
                    }
                case 2: {
                        message.max = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return VersionRange;
    })();

    csp_e2e_fs.Envelope = (function() {

        /**
         * Properties of an Envelope.
         * @memberof csp_e2e_fs
         * @interface IEnvelope
         * @property {Uint8Array|null} [sessionId] Envelope sessionId
         * @property {csp_e2e_fs.Init|null} [init] Envelope init
         * @property {csp_e2e_fs.Accept|null} [accept] Envelope accept
         * @property {csp_e2e_fs.Reject|null} [reject] Envelope reject
         * @property {csp_e2e_fs.Terminate|null} [terminate] Envelope terminate
         * @property {csp_e2e_fs.Encapsulated|null} [encapsulated] Envelope encapsulated
         */

        /**
         * Constructs a new Envelope.
         * @memberof csp_e2e_fs
         * @classdesc Represents an Envelope.
         * @implements IEnvelope
         * @constructor
         * @param {csp_e2e_fs.IEnvelope=} [properties] Properties to set
         */
        function Envelope(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Envelope sessionId.
         * @member {Uint8Array} sessionId
         * @memberof csp_e2e_fs.Envelope
         * @instance
         */
        Envelope.prototype.sessionId = $util.newBuffer([]);

        /**
         * Envelope init.
         * @member {csp_e2e_fs.Init|null|undefined} init
         * @memberof csp_e2e_fs.Envelope
         * @instance
         */
        Envelope.prototype.init = null;

        /**
         * Envelope accept.
         * @member {csp_e2e_fs.Accept|null|undefined} accept
         * @memberof csp_e2e_fs.Envelope
         * @instance
         */
        Envelope.prototype.accept = null;

        /**
         * Envelope reject.
         * @member {csp_e2e_fs.Reject|null|undefined} reject
         * @memberof csp_e2e_fs.Envelope
         * @instance
         */
        Envelope.prototype.reject = null;

        /**
         * Envelope terminate.
         * @member {csp_e2e_fs.Terminate|null|undefined} terminate
         * @memberof csp_e2e_fs.Envelope
         * @instance
         */
        Envelope.prototype.terminate = null;

        /**
         * Envelope encapsulated.
         * @member {csp_e2e_fs.Encapsulated|null|undefined} encapsulated
         * @memberof csp_e2e_fs.Envelope
         * @instance
         */
        Envelope.prototype.encapsulated = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * Envelope content.
         * @member {"init"|"accept"|"reject"|"terminate"|"encapsulated"|undefined} content
         * @memberof csp_e2e_fs.Envelope
         * @instance
         */
        Object.defineProperty(Envelope.prototype, "content", {
            get: $util.oneOfGetter($oneOfFields = ["init", "accept", "reject", "terminate", "encapsulated"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified Envelope message. Does not implicitly {@link csp_e2e_fs.Envelope.verify|verify} messages.
         * @function encode
         * @memberof csp_e2e_fs.Envelope
         * @static
         * @param {csp_e2e_fs.Envelope} message Envelope message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Envelope.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.sessionId != null && Object.hasOwnProperty.call(message, "sessionId"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.sessionId);
            if (message.init != null && Object.hasOwnProperty.call(message, "init"))
                $root.csp_e2e_fs.Init.encode(message.init, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.accept != null && Object.hasOwnProperty.call(message, "accept"))
                $root.csp_e2e_fs.Accept.encode(message.accept, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.reject != null && Object.hasOwnProperty.call(message, "reject"))
                $root.csp_e2e_fs.Reject.encode(message.reject, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.terminate != null && Object.hasOwnProperty.call(message, "terminate"))
                $root.csp_e2e_fs.Terminate.encode(message.terminate, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            if (message.encapsulated != null && Object.hasOwnProperty.call(message, "encapsulated"))
                $root.csp_e2e_fs.Encapsulated.encode(message.encapsulated, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes an Envelope message from the specified reader or buffer.
         * @function decode
         * @memberof csp_e2e_fs.Envelope
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {csp_e2e_fs.Envelope} Envelope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Envelope.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.csp_e2e_fs.Envelope();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.sessionId = reader.bytes();
                        break;
                    }
                case 2: {
                        message.init = $root.csp_e2e_fs.Init.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.accept = $root.csp_e2e_fs.Accept.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.reject = $root.csp_e2e_fs.Reject.decode(reader, reader.uint32());
                        break;
                    }
                case 5: {
                        message.terminate = $root.csp_e2e_fs.Terminate.decode(reader, reader.uint32());
                        break;
                    }
                case 6: {
                        message.encapsulated = $root.csp_e2e_fs.Encapsulated.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return Envelope;
    })();

    csp_e2e_fs.Init = (function() {

        /**
         * Properties of an Init.
         * @memberof csp_e2e_fs
         * @interface IInit
         * @property {csp_e2e_fs.VersionRange|null} [supportedVersion] Init supportedVersion
         * @property {Uint8Array|null} [fssk] Init fssk
         */

        /**
         * Constructs a new Init.
         * @memberof csp_e2e_fs
         * @classdesc Represents an Init.
         * @implements IInit
         * @constructor
         * @param {csp_e2e_fs.IInit=} [properties] Properties to set
         */
        function Init(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Init supportedVersion.
         * @member {csp_e2e_fs.VersionRange|null|undefined} supportedVersion
         * @memberof csp_e2e_fs.Init
         * @instance
         */
        Init.prototype.supportedVersion = null;

        /**
         * Init fssk.
         * @member {Uint8Array} fssk
         * @memberof csp_e2e_fs.Init
         * @instance
         */
        Init.prototype.fssk = $util.newBuffer([]);

        /**
         * Encodes the specified Init message. Does not implicitly {@link csp_e2e_fs.Init.verify|verify} messages.
         * @function encode
         * @memberof csp_e2e_fs.Init
         * @static
         * @param {csp_e2e_fs.Init} message Init message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Init.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.fssk != null && Object.hasOwnProperty.call(message, "fssk"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.fssk);
            if (message.supportedVersion != null && Object.hasOwnProperty.call(message, "supportedVersion"))
                $root.csp_e2e_fs.VersionRange.encode(message.supportedVersion, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes an Init message from the specified reader or buffer.
         * @function decode
         * @memberof csp_e2e_fs.Init
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {csp_e2e_fs.Init} Init
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Init.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.csp_e2e_fs.Init();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 2: {
                        message.supportedVersion = $root.csp_e2e_fs.VersionRange.decode(reader, reader.uint32());
                        break;
                    }
                case 1: {
                        message.fssk = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return Init;
    })();

    csp_e2e_fs.Accept = (function() {

        /**
         * Properties of an Accept.
         * @memberof csp_e2e_fs
         * @interface IAccept
         * @property {csp_e2e_fs.VersionRange|null} [supportedVersion] Accept supportedVersion
         * @property {Uint8Array|null} [fssk] Accept fssk
         */

        /**
         * Constructs a new Accept.
         * @memberof csp_e2e_fs
         * @classdesc Represents an Accept.
         * @implements IAccept
         * @constructor
         * @param {csp_e2e_fs.IAccept=} [properties] Properties to set
         */
        function Accept(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Accept supportedVersion.
         * @member {csp_e2e_fs.VersionRange|null|undefined} supportedVersion
         * @memberof csp_e2e_fs.Accept
         * @instance
         */
        Accept.prototype.supportedVersion = null;

        /**
         * Accept fssk.
         * @member {Uint8Array} fssk
         * @memberof csp_e2e_fs.Accept
         * @instance
         */
        Accept.prototype.fssk = $util.newBuffer([]);

        /**
         * Encodes the specified Accept message. Does not implicitly {@link csp_e2e_fs.Accept.verify|verify} messages.
         * @function encode
         * @memberof csp_e2e_fs.Accept
         * @static
         * @param {csp_e2e_fs.Accept} message Accept message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Accept.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.fssk != null && Object.hasOwnProperty.call(message, "fssk"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.fssk);
            if (message.supportedVersion != null && Object.hasOwnProperty.call(message, "supportedVersion"))
                $root.csp_e2e_fs.VersionRange.encode(message.supportedVersion, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes an Accept message from the specified reader or buffer.
         * @function decode
         * @memberof csp_e2e_fs.Accept
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {csp_e2e_fs.Accept} Accept
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Accept.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.csp_e2e_fs.Accept();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 2: {
                        message.supportedVersion = $root.csp_e2e_fs.VersionRange.decode(reader, reader.uint32());
                        break;
                    }
                case 1: {
                        message.fssk = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return Accept;
    })();

    csp_e2e_fs.Reject = (function() {

        /**
         * Properties of a Reject.
         * @memberof csp_e2e_fs
         * @interface IReject
         * @property {Long|null} [rejectedEncapsulatedMessageId] Reject rejectedEncapsulatedMessageId
         * @property {csp_e2e_fs.Reject.Cause|null} [cause] Reject cause
         */

        /**
         * Constructs a new Reject.
         * @memberof csp_e2e_fs
         * @classdesc Represents a Reject.
         * @implements IReject
         * @constructor
         * @param {csp_e2e_fs.IReject=} [properties] Properties to set
         */
        function Reject(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Reject rejectedEncapsulatedMessageId.
         * @member {Long} rejectedEncapsulatedMessageId
         * @memberof csp_e2e_fs.Reject
         * @instance
         */
        Reject.prototype.rejectedEncapsulatedMessageId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Reject cause.
         * @member {csp_e2e_fs.Reject.Cause} cause
         * @memberof csp_e2e_fs.Reject
         * @instance
         */
        Reject.prototype.cause = 0;

        /**
         * Encodes the specified Reject message. Does not implicitly {@link csp_e2e_fs.Reject.verify|verify} messages.
         * @function encode
         * @memberof csp_e2e_fs.Reject
         * @static
         * @param {csp_e2e_fs.Reject} message Reject message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Reject.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.rejectedEncapsulatedMessageId != null && Object.hasOwnProperty.call(message, "rejectedEncapsulatedMessageId"))
                writer.uint32(/* id 1, wireType 1 =*/9).fixed64(message.rejectedEncapsulatedMessageId);
            if (message.cause != null && Object.hasOwnProperty.call(message, "cause"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.cause);
            return writer;
        };

        /**
         * Decodes a Reject message from the specified reader or buffer.
         * @function decode
         * @memberof csp_e2e_fs.Reject
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {csp_e2e_fs.Reject} Reject
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Reject.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.csp_e2e_fs.Reject();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.rejectedEncapsulatedMessageId = reader.fixed64();
                        break;
                    }
                case 2: {
                        message.cause = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Cause enum.
         * @name csp_e2e_fs.Reject.Cause
         * @enum {number}
         * @property {number} STATE_MISMATCH=0 STATE_MISMATCH value
         * @property {number} UNKNOWN_SESSION=1 UNKNOWN_SESSION value
         * @property {number} DISABLED_BY_LOCAL=2 DISABLED_BY_LOCAL value
         */
        Reject.Cause = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "STATE_MISMATCH"] = 0;
            values[valuesById[1] = "UNKNOWN_SESSION"] = 1;
            values[valuesById[2] = "DISABLED_BY_LOCAL"] = 2;
            return values;
        })();

        return Reject;
    })();

    csp_e2e_fs.Terminate = (function() {

        /**
         * Properties of a Terminate.
         * @memberof csp_e2e_fs
         * @interface ITerminate
         * @property {csp_e2e_fs.Terminate.Cause|null} [cause] Terminate cause
         */

        /**
         * Constructs a new Terminate.
         * @memberof csp_e2e_fs
         * @classdesc Represents a Terminate.
         * @implements ITerminate
         * @constructor
         * @param {csp_e2e_fs.ITerminate=} [properties] Properties to set
         */
        function Terminate(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Terminate cause.
         * @member {csp_e2e_fs.Terminate.Cause} cause
         * @memberof csp_e2e_fs.Terminate
         * @instance
         */
        Terminate.prototype.cause = 0;

        /**
         * Encodes the specified Terminate message. Does not implicitly {@link csp_e2e_fs.Terminate.verify|verify} messages.
         * @function encode
         * @memberof csp_e2e_fs.Terminate
         * @static
         * @param {csp_e2e_fs.Terminate} message Terminate message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Terminate.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.cause != null && Object.hasOwnProperty.call(message, "cause"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.cause);
            return writer;
        };

        /**
         * Decodes a Terminate message from the specified reader or buffer.
         * @function decode
         * @memberof csp_e2e_fs.Terminate
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {csp_e2e_fs.Terminate} Terminate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Terminate.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.csp_e2e_fs.Terminate();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.cause = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Cause enum.
         * @name csp_e2e_fs.Terminate.Cause
         * @enum {number}
         * @property {number} UNKNOWN_SESSION=0 UNKNOWN_SESSION value
         * @property {number} RESET=1 RESET value
         * @property {number} DISABLED_BY_LOCAL=2 DISABLED_BY_LOCAL value
         * @property {number} DISABLED_BY_REMOTE=3 DISABLED_BY_REMOTE value
         */
        Terminate.Cause = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "UNKNOWN_SESSION"] = 0;
            values[valuesById[1] = "RESET"] = 1;
            values[valuesById[2] = "DISABLED_BY_LOCAL"] = 2;
            values[valuesById[3] = "DISABLED_BY_REMOTE"] = 3;
            return values;
        })();

        return Terminate;
    })();

    csp_e2e_fs.Encapsulated = (function() {

        /**
         * Properties of an Encapsulated.
         * @memberof csp_e2e_fs
         * @interface IEncapsulated
         * @property {csp_e2e_fs.Encapsulated.DHType|null} [dhType] Encapsulated dhType
         * @property {Long|null} [counter] Encapsulated counter
         * @property {number|null} [offeredVersion] Encapsulated offeredVersion
         * @property {number|null} [appliedVersion] Encapsulated appliedVersion
         * @property {Uint8Array|null} [encryptedInner] Encapsulated encryptedInner
         */

        /**
         * Constructs a new Encapsulated.
         * @memberof csp_e2e_fs
         * @classdesc Represents an Encapsulated.
         * @implements IEncapsulated
         * @constructor
         * @param {csp_e2e_fs.IEncapsulated=} [properties] Properties to set
         */
        function Encapsulated(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encapsulated dhType.
         * @member {csp_e2e_fs.Encapsulated.DHType} dhType
         * @memberof csp_e2e_fs.Encapsulated
         * @instance
         */
        Encapsulated.prototype.dhType = 0;

        /**
         * Encapsulated counter.
         * @member {Long} counter
         * @memberof csp_e2e_fs.Encapsulated
         * @instance
         */
        Encapsulated.prototype.counter = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Encapsulated offeredVersion.
         * @member {number} offeredVersion
         * @memberof csp_e2e_fs.Encapsulated
         * @instance
         */
        Encapsulated.prototype.offeredVersion = 0;

        /**
         * Encapsulated appliedVersion.
         * @member {number} appliedVersion
         * @memberof csp_e2e_fs.Encapsulated
         * @instance
         */
        Encapsulated.prototype.appliedVersion = 0;

        /**
         * Encapsulated encryptedInner.
         * @member {Uint8Array} encryptedInner
         * @memberof csp_e2e_fs.Encapsulated
         * @instance
         */
        Encapsulated.prototype.encryptedInner = $util.newBuffer([]);

        /**
         * Encodes the specified Encapsulated message. Does not implicitly {@link csp_e2e_fs.Encapsulated.verify|verify} messages.
         * @function encode
         * @memberof csp_e2e_fs.Encapsulated
         * @static
         * @param {csp_e2e_fs.Encapsulated} message Encapsulated message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Encapsulated.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.dhType != null && Object.hasOwnProperty.call(message, "dhType"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.dhType);
            if (message.counter != null && Object.hasOwnProperty.call(message, "counter"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.counter);
            if (message.encryptedInner != null && Object.hasOwnProperty.call(message, "encryptedInner"))
                writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.encryptedInner);
            if (message.offeredVersion != null && Object.hasOwnProperty.call(message, "offeredVersion"))
                writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.offeredVersion);
            if (message.appliedVersion != null && Object.hasOwnProperty.call(message, "appliedVersion"))
                writer.uint32(/* id 5, wireType 0 =*/40).uint32(message.appliedVersion);
            return writer;
        };

        /**
         * Decodes an Encapsulated message from the specified reader or buffer.
         * @function decode
         * @memberof csp_e2e_fs.Encapsulated
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {csp_e2e_fs.Encapsulated} Encapsulated
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Encapsulated.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.csp_e2e_fs.Encapsulated();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.dhType = reader.int32();
                        break;
                    }
                case 2: {
                        message.counter = reader.uint64();
                        break;
                    }
                case 4: {
                        message.offeredVersion = reader.uint32();
                        break;
                    }
                case 5: {
                        message.appliedVersion = reader.uint32();
                        break;
                    }
                case 3: {
                        message.encryptedInner = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * DHType enum.
         * @name csp_e2e_fs.Encapsulated.DHType
         * @enum {number}
         * @property {number} TWODH=0 TWODH value
         * @property {number} FOURDH=1 FOURDH value
         */
        Encapsulated.DHType = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "TWODH"] = 0;
            values[valuesById[1] = "FOURDH"] = 1;
            return values;
        })();

        return Encapsulated;
    })();

    return csp_e2e_fs;
})();

export const csp_e2e = $root.csp_e2e = (() => {

    /**
     * Namespace csp_e2e.
     * @exports csp_e2e
     * @namespace
     */
    const csp_e2e = {};

    csp_e2e.MessageMetadata = (function() {

        /**
         * Properties of a MessageMetadata.
         * @memberof csp_e2e
         * @interface IMessageMetadata
         * @property {Uint8Array|null} [padding] MessageMetadata padding
         * @property {string|null} [nickname] MessageMetadata nickname
         * @property {Long|null} [messageId] MessageMetadata messageId
         * @property {Long|null} [createdAt] MessageMetadata createdAt
         */

        /**
         * Constructs a new MessageMetadata.
         * @memberof csp_e2e
         * @classdesc Represents a MessageMetadata.
         * @implements IMessageMetadata
         * @constructor
         * @param {csp_e2e.IMessageMetadata=} [properties] Properties to set
         */
        function MessageMetadata(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * MessageMetadata padding.
         * @member {Uint8Array} padding
         * @memberof csp_e2e.MessageMetadata
         * @instance
         */
        MessageMetadata.prototype.padding = $util.newBuffer([]);

        /**
         * MessageMetadata nickname.
         * @member {string} nickname
         * @memberof csp_e2e.MessageMetadata
         * @instance
         */
        MessageMetadata.prototype.nickname = "";

        /**
         * MessageMetadata messageId.
         * @member {Long} messageId
         * @memberof csp_e2e.MessageMetadata
         * @instance
         */
        MessageMetadata.prototype.messageId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * MessageMetadata createdAt.
         * @member {Long} createdAt
         * @memberof csp_e2e.MessageMetadata
         * @instance
         */
        MessageMetadata.prototype.createdAt = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Encodes the specified MessageMetadata message. Does not implicitly {@link csp_e2e.MessageMetadata.verify|verify} messages.
         * @function encode
         * @memberof csp_e2e.MessageMetadata
         * @static
         * @param {csp_e2e.MessageMetadata} message MessageMetadata message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        MessageMetadata.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.padding != null && Object.hasOwnProperty.call(message, "padding"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.padding);
            if (message.nickname != null && Object.hasOwnProperty.call(message, "nickname"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.nickname);
            if (message.messageId != null && Object.hasOwnProperty.call(message, "messageId"))
                writer.uint32(/* id 3, wireType 1 =*/25).fixed64(message.messageId);
            if (message.createdAt != null && Object.hasOwnProperty.call(message, "createdAt"))
                writer.uint32(/* id 4, wireType 0 =*/32).uint64(message.createdAt);
            return writer;
        };

        /**
         * Decodes a MessageMetadata message from the specified reader or buffer.
         * @function decode
         * @memberof csp_e2e.MessageMetadata
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {csp_e2e.MessageMetadata} MessageMetadata
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MessageMetadata.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.csp_e2e.MessageMetadata();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.padding = reader.bytes();
                        break;
                    }
                case 2: {
                        message.nickname = reader.string();
                        break;
                    }
                case 3: {
                        message.messageId = reader.fixed64();
                        break;
                    }
                case 4: {
                        message.createdAt = reader.uint64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return MessageMetadata;
    })();

    csp_e2e.GroupCallStart = (function() {

        /**
         * Properties of a GroupCallStart.
         * @memberof csp_e2e
         * @interface IGroupCallStart
         * @property {number|null} [protocolVersion] GroupCallStart protocolVersion
         * @property {Uint8Array|null} [gck] GroupCallStart gck
         * @property {string|null} [sfuBaseUrl] GroupCallStart sfuBaseUrl
         */

        /**
         * Constructs a new GroupCallStart.
         * @memberof csp_e2e
         * @classdesc Represents a GroupCallStart.
         * @implements IGroupCallStart
         * @constructor
         * @param {csp_e2e.IGroupCallStart=} [properties] Properties to set
         */
        function GroupCallStart(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GroupCallStart protocolVersion.
         * @member {number} protocolVersion
         * @memberof csp_e2e.GroupCallStart
         * @instance
         */
        GroupCallStart.prototype.protocolVersion = 0;

        /**
         * GroupCallStart gck.
         * @member {Uint8Array} gck
         * @memberof csp_e2e.GroupCallStart
         * @instance
         */
        GroupCallStart.prototype.gck = $util.newBuffer([]);

        /**
         * GroupCallStart sfuBaseUrl.
         * @member {string} sfuBaseUrl
         * @memberof csp_e2e.GroupCallStart
         * @instance
         */
        GroupCallStart.prototype.sfuBaseUrl = "";

        /**
         * Encodes the specified GroupCallStart message. Does not implicitly {@link csp_e2e.GroupCallStart.verify|verify} messages.
         * @function encode
         * @memberof csp_e2e.GroupCallStart
         * @static
         * @param {csp_e2e.GroupCallStart} message GroupCallStart message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GroupCallStart.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.protocolVersion != null && Object.hasOwnProperty.call(message, "protocolVersion"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.protocolVersion);
            if (message.gck != null && Object.hasOwnProperty.call(message, "gck"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.gck);
            if (message.sfuBaseUrl != null && Object.hasOwnProperty.call(message, "sfuBaseUrl"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.sfuBaseUrl);
            return writer;
        };

        /**
         * Decodes a GroupCallStart message from the specified reader or buffer.
         * @function decode
         * @memberof csp_e2e.GroupCallStart
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {csp_e2e.GroupCallStart} GroupCallStart
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GroupCallStart.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.csp_e2e.GroupCallStart();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.protocolVersion = reader.uint32();
                        break;
                    }
                case 2: {
                        message.gck = reader.bytes();
                        break;
                    }
                case 3: {
                        message.sfuBaseUrl = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return GroupCallStart;
    })();

    csp_e2e.GroupJoinRequest = (function() {

        /**
         * Properties of a GroupJoinRequest.
         * @memberof csp_e2e
         * @interface IGroupJoinRequest
         * @property {Uint8Array|null} [token] GroupJoinRequest token
         * @property {string|null} [groupName] GroupJoinRequest groupName
         * @property {string|null} [message] GroupJoinRequest message
         */

        /**
         * Constructs a new GroupJoinRequest.
         * @memberof csp_e2e
         * @classdesc Represents a GroupJoinRequest.
         * @implements IGroupJoinRequest
         * @constructor
         * @param {csp_e2e.IGroupJoinRequest=} [properties] Properties to set
         */
        function GroupJoinRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GroupJoinRequest token.
         * @member {Uint8Array} token
         * @memberof csp_e2e.GroupJoinRequest
         * @instance
         */
        GroupJoinRequest.prototype.token = $util.newBuffer([]);

        /**
         * GroupJoinRequest groupName.
         * @member {string} groupName
         * @memberof csp_e2e.GroupJoinRequest
         * @instance
         */
        GroupJoinRequest.prototype.groupName = "";

        /**
         * GroupJoinRequest message.
         * @member {string} message
         * @memberof csp_e2e.GroupJoinRequest
         * @instance
         */
        GroupJoinRequest.prototype.message = "";

        /**
         * Encodes the specified GroupJoinRequest message. Does not implicitly {@link csp_e2e.GroupJoinRequest.verify|verify} messages.
         * @function encode
         * @memberof csp_e2e.GroupJoinRequest
         * @static
         * @param {csp_e2e.GroupJoinRequest} message GroupJoinRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GroupJoinRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.token);
            if (message.groupName != null && Object.hasOwnProperty.call(message, "groupName"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.groupName);
            if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.message);
            return writer;
        };

        /**
         * Decodes a GroupJoinRequest message from the specified reader or buffer.
         * @function decode
         * @memberof csp_e2e.GroupJoinRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {csp_e2e.GroupJoinRequest} GroupJoinRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GroupJoinRequest.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.csp_e2e.GroupJoinRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.token = reader.bytes();
                        break;
                    }
                case 2: {
                        message.groupName = reader.string();
                        break;
                    }
                case 3: {
                        message.message = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return GroupJoinRequest;
    })();

    csp_e2e.GroupJoinResponse = (function() {

        /**
         * Properties of a GroupJoinResponse.
         * @memberof csp_e2e
         * @interface IGroupJoinResponse
         * @property {Uint8Array|null} [token] GroupJoinResponse token
         * @property {csp_e2e.GroupJoinResponse.Response|null} [response] GroupJoinResponse response
         */

        /**
         * Constructs a new GroupJoinResponse.
         * @memberof csp_e2e
         * @classdesc Represents a GroupJoinResponse.
         * @implements IGroupJoinResponse
         * @constructor
         * @param {csp_e2e.IGroupJoinResponse=} [properties] Properties to set
         */
        function GroupJoinResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GroupJoinResponse token.
         * @member {Uint8Array} token
         * @memberof csp_e2e.GroupJoinResponse
         * @instance
         */
        GroupJoinResponse.prototype.token = $util.newBuffer([]);

        /**
         * GroupJoinResponse response.
         * @member {csp_e2e.GroupJoinResponse.Response|null|undefined} response
         * @memberof csp_e2e.GroupJoinResponse
         * @instance
         */
        GroupJoinResponse.prototype.response = null;

        /**
         * Encodes the specified GroupJoinResponse message. Does not implicitly {@link csp_e2e.GroupJoinResponse.verify|verify} messages.
         * @function encode
         * @memberof csp_e2e.GroupJoinResponse
         * @static
         * @param {csp_e2e.GroupJoinResponse} message GroupJoinResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GroupJoinResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.token);
            if (message.response != null && Object.hasOwnProperty.call(message, "response"))
                $root.csp_e2e.GroupJoinResponse.Response.encode(message.response, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a GroupJoinResponse message from the specified reader or buffer.
         * @function decode
         * @memberof csp_e2e.GroupJoinResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {csp_e2e.GroupJoinResponse} GroupJoinResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GroupJoinResponse.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.csp_e2e.GroupJoinResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.token = reader.bytes();
                        break;
                    }
                case 2: {
                        message.response = $root.csp_e2e.GroupJoinResponse.Response.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        GroupJoinResponse.Response = (function() {

            /**
             * Properties of a Response.
             * @memberof csp_e2e.GroupJoinResponse
             * @interface IResponse
             * @property {csp_e2e.GroupJoinResponse.Response.Accept|null} [accept] Response accept
             * @property {common.Unit|null} [expired] Response expired
             * @property {common.Unit|null} [groupFull] Response groupFull
             * @property {common.Unit|null} [reject] Response reject
             */

            /**
             * Constructs a new Response.
             * @memberof csp_e2e.GroupJoinResponse
             * @classdesc Represents a Response.
             * @implements IResponse
             * @constructor
             * @param {csp_e2e.GroupJoinResponse.IResponse=} [properties] Properties to set
             */
            function Response(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Response accept.
             * @member {csp_e2e.GroupJoinResponse.Response.Accept|null|undefined} accept
             * @memberof csp_e2e.GroupJoinResponse.Response
             * @instance
             */
            Response.prototype.accept = null;

            /**
             * Response expired.
             * @member {common.Unit|null|undefined} expired
             * @memberof csp_e2e.GroupJoinResponse.Response
             * @instance
             */
            Response.prototype.expired = null;

            /**
             * Response groupFull.
             * @member {common.Unit|null|undefined} groupFull
             * @memberof csp_e2e.GroupJoinResponse.Response
             * @instance
             */
            Response.prototype.groupFull = null;

            /**
             * Response reject.
             * @member {common.Unit|null|undefined} reject
             * @memberof csp_e2e.GroupJoinResponse.Response
             * @instance
             */
            Response.prototype.reject = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * Response response.
             * @member {"accept"|"expired"|"groupFull"|"reject"|undefined} response
             * @memberof csp_e2e.GroupJoinResponse.Response
             * @instance
             */
            Object.defineProperty(Response.prototype, "response", {
                get: $util.oneOfGetter($oneOfFields = ["accept", "expired", "groupFull", "reject"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified Response message. Does not implicitly {@link csp_e2e.GroupJoinResponse.Response.verify|verify} messages.
             * @function encode
             * @memberof csp_e2e.GroupJoinResponse.Response
             * @static
             * @param {csp_e2e.GroupJoinResponse.Response} message Response message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Response.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.accept != null && Object.hasOwnProperty.call(message, "accept"))
                    $root.csp_e2e.GroupJoinResponse.Response.Accept.encode(message.accept, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.expired != null && Object.hasOwnProperty.call(message, "expired"))
                    $root.common.Unit.encode(message.expired, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                if (message.groupFull != null && Object.hasOwnProperty.call(message, "groupFull"))
                    $root.common.Unit.encode(message.groupFull, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                if (message.reject != null && Object.hasOwnProperty.call(message, "reject"))
                    $root.common.Unit.encode(message.reject, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes a Response message from the specified reader or buffer.
             * @function decode
             * @memberof csp_e2e.GroupJoinResponse.Response
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {csp_e2e.GroupJoinResponse.Response} Response
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Response.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.csp_e2e.GroupJoinResponse.Response();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.accept = $root.csp_e2e.GroupJoinResponse.Response.Accept.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.expired = $root.common.Unit.decode(reader, reader.uint32());
                            break;
                        }
                    case 3: {
                            message.groupFull = $root.common.Unit.decode(reader, reader.uint32());
                            break;
                        }
                    case 4: {
                            message.reject = $root.common.Unit.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            Response.Accept = (function() {

                /**
                 * Properties of an Accept.
                 * @memberof csp_e2e.GroupJoinResponse.Response
                 * @interface IAccept
                 * @property {Long|null} [groupId] Accept groupId
                 */

                /**
                 * Constructs a new Accept.
                 * @memberof csp_e2e.GroupJoinResponse.Response
                 * @classdesc Represents an Accept.
                 * @implements IAccept
                 * @constructor
                 * @param {csp_e2e.GroupJoinResponse.Response.IAccept=} [properties] Properties to set
                 */
                function Accept(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Accept groupId.
                 * @member {Long} groupId
                 * @memberof csp_e2e.GroupJoinResponse.Response.Accept
                 * @instance
                 */
                Accept.prototype.groupId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

                /**
                 * Encodes the specified Accept message. Does not implicitly {@link csp_e2e.GroupJoinResponse.Response.Accept.verify|verify} messages.
                 * @function encode
                 * @memberof csp_e2e.GroupJoinResponse.Response.Accept
                 * @static
                 * @param {csp_e2e.GroupJoinResponse.Response.Accept} message Accept message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Accept.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.groupId != null && Object.hasOwnProperty.call(message, "groupId"))
                        writer.uint32(/* id 1, wireType 1 =*/9).fixed64(message.groupId);
                    return writer;
                };

                /**
                 * Decodes an Accept message from the specified reader or buffer.
                 * @function decode
                 * @memberof csp_e2e.GroupJoinResponse.Response.Accept
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {csp_e2e.GroupJoinResponse.Response.Accept} Accept
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Accept.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.csp_e2e.GroupJoinResponse.Response.Accept();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.groupId = reader.fixed64();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Accept;
            })();

            return Response;
        })();

        return GroupJoinResponse;
    })();

    return csp_e2e;
})();

export const groupcall = $root.groupcall = (() => {

    /**
     * Namespace groupcall.
     * @exports groupcall
     * @namespace
     */
    const groupcall = {};

    groupcall.CallState = (function() {

        /**
         * Properties of a CallState.
         * @memberof groupcall
         * @interface ICallState
         * @property {Uint8Array|null} [padding] CallState padding
         * @property {number|null} [stateCreatedBy] CallState stateCreatedBy
         * @property {Long|null} [stateCreatedAt] CallState stateCreatedAt
         * @property {Object.<string,groupcall.CallState.Participant>|null} [participants] CallState participants
         */

        /**
         * Constructs a new CallState.
         * @memberof groupcall
         * @classdesc Represents a CallState.
         * @implements ICallState
         * @constructor
         * @param {groupcall.ICallState=} [properties] Properties to set
         */
        function CallState(properties) {
            this.participants = {};
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * CallState padding.
         * @member {Uint8Array} padding
         * @memberof groupcall.CallState
         * @instance
         */
        CallState.prototype.padding = $util.newBuffer([]);

        /**
         * CallState stateCreatedBy.
         * @member {number} stateCreatedBy
         * @memberof groupcall.CallState
         * @instance
         */
        CallState.prototype.stateCreatedBy = 0;

        /**
         * CallState stateCreatedAt.
         * @member {Long} stateCreatedAt
         * @memberof groupcall.CallState
         * @instance
         */
        CallState.prototype.stateCreatedAt = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * CallState participants.
         * @member {Object.<string,groupcall.CallState.Participant>} participants
         * @memberof groupcall.CallState
         * @instance
         */
        CallState.prototype.participants = $util.emptyObject;

        /**
         * Encodes the specified CallState message. Does not implicitly {@link groupcall.CallState.verify|verify} messages.
         * @function encode
         * @memberof groupcall.CallState
         * @static
         * @param {groupcall.CallState} message CallState message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CallState.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.padding != null && Object.hasOwnProperty.call(message, "padding"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.padding);
            if (message.stateCreatedBy != null && Object.hasOwnProperty.call(message, "stateCreatedBy"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.stateCreatedBy);
            if (message.stateCreatedAt != null && Object.hasOwnProperty.call(message, "stateCreatedAt"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.stateCreatedAt);
            if (message.participants != null && Object.hasOwnProperty.call(message, "participants"))
                for (let keys = Object.keys(message.participants), i = 0; i < keys.length; ++i) {
                    writer.uint32(/* id 4, wireType 2 =*/34).fork().uint32(/* id 1, wireType 0 =*/8).uint32(keys[i]);
                    $root.groupcall.CallState.Participant.encode(message.participants[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                }
            return writer;
        };

        /**
         * Decodes a CallState message from the specified reader or buffer.
         * @function decode
         * @memberof groupcall.CallState
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {groupcall.CallState} CallState
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CallState.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.CallState(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.padding = reader.bytes();
                        break;
                    }
                case 2: {
                        message.stateCreatedBy = reader.uint32();
                        break;
                    }
                case 3: {
                        message.stateCreatedAt = reader.uint64();
                        break;
                    }
                case 4: {
                        if (message.participants === $util.emptyObject)
                            message.participants = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = 0;
                        value = null;
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.uint32();
                                break;
                            case 2:
                                value = $root.groupcall.CallState.Participant.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.participants[key] = value;
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        CallState.Participant = (function() {

            /**
             * Properties of a Participant.
             * @memberof groupcall.CallState
             * @interface IParticipant
             * @property {groupcall.CallState.Participant.Normal|null} [threema] Participant threema
             * @property {groupcall.CallState.Participant.Guest|null} [guest] Participant guest
             */

            /**
             * Constructs a new Participant.
             * @memberof groupcall.CallState
             * @classdesc Represents a Participant.
             * @implements IParticipant
             * @constructor
             * @param {groupcall.CallState.IParticipant=} [properties] Properties to set
             */
            function Participant(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Participant threema.
             * @member {groupcall.CallState.Participant.Normal|null|undefined} threema
             * @memberof groupcall.CallState.Participant
             * @instance
             */
            Participant.prototype.threema = null;

            /**
             * Participant guest.
             * @member {groupcall.CallState.Participant.Guest|null|undefined} guest
             * @memberof groupcall.CallState.Participant
             * @instance
             */
            Participant.prototype.guest = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * Participant participant.
             * @member {"threema"|"guest"|undefined} participant
             * @memberof groupcall.CallState.Participant
             * @instance
             */
            Object.defineProperty(Participant.prototype, "participant", {
                get: $util.oneOfGetter($oneOfFields = ["threema", "guest"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified Participant message. Does not implicitly {@link groupcall.CallState.Participant.verify|verify} messages.
             * @function encode
             * @memberof groupcall.CallState.Participant
             * @static
             * @param {groupcall.CallState.Participant} message Participant message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Participant.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.threema != null && Object.hasOwnProperty.call(message, "threema"))
                    $root.groupcall.CallState.Participant.Normal.encode(message.threema, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                if (message.guest != null && Object.hasOwnProperty.call(message, "guest"))
                    $root.groupcall.CallState.Participant.Guest.encode(message.guest, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes a Participant message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.CallState.Participant
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.CallState.Participant} Participant
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Participant.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.CallState.Participant();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 2: {
                            message.threema = $root.groupcall.CallState.Participant.Normal.decode(reader, reader.uint32());
                            break;
                        }
                    case 3: {
                            message.guest = $root.groupcall.CallState.Participant.Guest.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            Participant.Normal = (function() {

                /**
                 * Properties of a Normal.
                 * @memberof groupcall.CallState.Participant
                 * @interface INormal
                 * @property {string|null} [identity] Normal identity
                 * @property {string|null} [nickname] Normal nickname
                 */

                /**
                 * Constructs a new Normal.
                 * @memberof groupcall.CallState.Participant
                 * @classdesc Represents a Normal.
                 * @implements INormal
                 * @constructor
                 * @param {groupcall.CallState.Participant.INormal=} [properties] Properties to set
                 */
                function Normal(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Normal identity.
                 * @member {string} identity
                 * @memberof groupcall.CallState.Participant.Normal
                 * @instance
                 */
                Normal.prototype.identity = "";

                /**
                 * Normal nickname.
                 * @member {string} nickname
                 * @memberof groupcall.CallState.Participant.Normal
                 * @instance
                 */
                Normal.prototype.nickname = "";

                /**
                 * Encodes the specified Normal message. Does not implicitly {@link groupcall.CallState.Participant.Normal.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.CallState.Participant.Normal
                 * @static
                 * @param {groupcall.CallState.Participant.Normal} message Normal message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Normal.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.identity != null && Object.hasOwnProperty.call(message, "identity"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.identity);
                    if (message.nickname != null && Object.hasOwnProperty.call(message, "nickname"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.nickname);
                    return writer;
                };

                /**
                 * Decodes a Normal message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.CallState.Participant.Normal
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.CallState.Participant.Normal} Normal
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Normal.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.CallState.Participant.Normal();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.identity = reader.string();
                                break;
                            }
                        case 2: {
                                message.nickname = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Normal;
            })();

            Participant.Guest = (function() {

                /**
                 * Properties of a Guest.
                 * @memberof groupcall.CallState.Participant
                 * @interface IGuest
                 * @property {string|null} [name] Guest name
                 */

                /**
                 * Constructs a new Guest.
                 * @memberof groupcall.CallState.Participant
                 * @classdesc Represents a Guest.
                 * @implements IGuest
                 * @constructor
                 * @param {groupcall.CallState.Participant.IGuest=} [properties] Properties to set
                 */
                function Guest(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Guest name.
                 * @member {string} name
                 * @memberof groupcall.CallState.Participant.Guest
                 * @instance
                 */
                Guest.prototype.name = "";

                /**
                 * Encodes the specified Guest message. Does not implicitly {@link groupcall.CallState.Participant.Guest.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.CallState.Participant.Guest
                 * @static
                 * @param {groupcall.CallState.Participant.Guest} message Guest message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Guest.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
                    return writer;
                };

                /**
                 * Decodes a Guest message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.CallState.Participant.Guest
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.CallState.Participant.Guest} Guest
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Guest.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.CallState.Participant.Guest();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.name = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Guest;
            })();

            return Participant;
        })();

        return CallState;
    })();

    groupcall.SfuHttpRequest = (function() {

        /**
         * Properties of a SfuHttpRequest.
         * @memberof groupcall
         * @interface ISfuHttpRequest
         */

        /**
         * Constructs a new SfuHttpRequest.
         * @memberof groupcall
         * @classdesc Represents a SfuHttpRequest.
         * @implements ISfuHttpRequest
         * @constructor
         * @param {groupcall.ISfuHttpRequest=} [properties] Properties to set
         */
        function SfuHttpRequest(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified SfuHttpRequest message. Does not implicitly {@link groupcall.SfuHttpRequest.verify|verify} messages.
         * @function encode
         * @memberof groupcall.SfuHttpRequest
         * @static
         * @param {groupcall.SfuHttpRequest} message SfuHttpRequest message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SfuHttpRequest.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes a SfuHttpRequest message from the specified reader or buffer.
         * @function decode
         * @memberof groupcall.SfuHttpRequest
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {groupcall.SfuHttpRequest} SfuHttpRequest
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SfuHttpRequest.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.SfuHttpRequest();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        SfuHttpRequest.Peek = (function() {

            /**
             * Properties of a Peek.
             * @memberof groupcall.SfuHttpRequest
             * @interface IPeek
             * @property {Uint8Array|null} [callId] Peek callId
             */

            /**
             * Constructs a new Peek.
             * @memberof groupcall.SfuHttpRequest
             * @classdesc Represents a Peek.
             * @implements IPeek
             * @constructor
             * @param {groupcall.SfuHttpRequest.IPeek=} [properties] Properties to set
             */
            function Peek(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Peek callId.
             * @member {Uint8Array} callId
             * @memberof groupcall.SfuHttpRequest.Peek
             * @instance
             */
            Peek.prototype.callId = $util.newBuffer([]);

            /**
             * Encodes the specified Peek message. Does not implicitly {@link groupcall.SfuHttpRequest.Peek.verify|verify} messages.
             * @function encode
             * @memberof groupcall.SfuHttpRequest.Peek
             * @static
             * @param {groupcall.SfuHttpRequest.Peek} message Peek message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Peek.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.callId != null && Object.hasOwnProperty.call(message, "callId"))
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.callId);
                return writer;
            };

            /**
             * Decodes a Peek message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.SfuHttpRequest.Peek
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.SfuHttpRequest.Peek} Peek
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Peek.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.SfuHttpRequest.Peek();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.callId = reader.bytes();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Peek;
        })();

        SfuHttpRequest.Join = (function() {

            /**
             * Properties of a Join.
             * @memberof groupcall.SfuHttpRequest
             * @interface IJoin
             * @property {Uint8Array|null} [callId] Join callId
             * @property {number|null} [protocolVersion] Join protocolVersion
             * @property {Uint8Array|null} [dtlsFingerprint] Join dtlsFingerprint
             */

            /**
             * Constructs a new Join.
             * @memberof groupcall.SfuHttpRequest
             * @classdesc Represents a Join.
             * @implements IJoin
             * @constructor
             * @param {groupcall.SfuHttpRequest.IJoin=} [properties] Properties to set
             */
            function Join(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Join callId.
             * @member {Uint8Array} callId
             * @memberof groupcall.SfuHttpRequest.Join
             * @instance
             */
            Join.prototype.callId = $util.newBuffer([]);

            /**
             * Join protocolVersion.
             * @member {number} protocolVersion
             * @memberof groupcall.SfuHttpRequest.Join
             * @instance
             */
            Join.prototype.protocolVersion = 0;

            /**
             * Join dtlsFingerprint.
             * @member {Uint8Array} dtlsFingerprint
             * @memberof groupcall.SfuHttpRequest.Join
             * @instance
             */
            Join.prototype.dtlsFingerprint = $util.newBuffer([]);

            /**
             * Encodes the specified Join message. Does not implicitly {@link groupcall.SfuHttpRequest.Join.verify|verify} messages.
             * @function encode
             * @memberof groupcall.SfuHttpRequest.Join
             * @static
             * @param {groupcall.SfuHttpRequest.Join} message Join message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Join.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.callId != null && Object.hasOwnProperty.call(message, "callId"))
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.callId);
                if (message.protocolVersion != null && Object.hasOwnProperty.call(message, "protocolVersion"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.protocolVersion);
                if (message.dtlsFingerprint != null && Object.hasOwnProperty.call(message, "dtlsFingerprint"))
                    writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.dtlsFingerprint);
                return writer;
            };

            /**
             * Decodes a Join message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.SfuHttpRequest.Join
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.SfuHttpRequest.Join} Join
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Join.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.SfuHttpRequest.Join();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.callId = reader.bytes();
                            break;
                        }
                    case 2: {
                            message.protocolVersion = reader.uint32();
                            break;
                        }
                    case 3: {
                            message.dtlsFingerprint = reader.bytes();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Join;
        })();

        return SfuHttpRequest;
    })();

    groupcall.SfuHttpResponse = (function() {

        /**
         * Properties of a SfuHttpResponse.
         * @memberof groupcall
         * @interface ISfuHttpResponse
         */

        /**
         * Constructs a new SfuHttpResponse.
         * @memberof groupcall
         * @classdesc Represents a SfuHttpResponse.
         * @implements ISfuHttpResponse
         * @constructor
         * @param {groupcall.ISfuHttpResponse=} [properties] Properties to set
         */
        function SfuHttpResponse(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified SfuHttpResponse message. Does not implicitly {@link groupcall.SfuHttpResponse.verify|verify} messages.
         * @function encode
         * @memberof groupcall.SfuHttpResponse
         * @static
         * @param {groupcall.SfuHttpResponse} message SfuHttpResponse message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SfuHttpResponse.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes a SfuHttpResponse message from the specified reader or buffer.
         * @function decode
         * @memberof groupcall.SfuHttpResponse
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {groupcall.SfuHttpResponse} SfuHttpResponse
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SfuHttpResponse.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.SfuHttpResponse();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        SfuHttpResponse.Peek = (function() {

            /**
             * Properties of a Peek.
             * @memberof groupcall.SfuHttpResponse
             * @interface IPeek
             * @property {Long|null} [startedAt] Peek startedAt
             * @property {number|null} [maxParticipants] Peek maxParticipants
             * @property {Uint8Array|null} [encryptedCallState] Peek encryptedCallState
             */

            /**
             * Constructs a new Peek.
             * @memberof groupcall.SfuHttpResponse
             * @classdesc Represents a Peek.
             * @implements IPeek
             * @constructor
             * @param {groupcall.SfuHttpResponse.IPeek=} [properties] Properties to set
             */
            function Peek(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Peek startedAt.
             * @member {Long} startedAt
             * @memberof groupcall.SfuHttpResponse.Peek
             * @instance
             */
            Peek.prototype.startedAt = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

            /**
             * Peek maxParticipants.
             * @member {number} maxParticipants
             * @memberof groupcall.SfuHttpResponse.Peek
             * @instance
             */
            Peek.prototype.maxParticipants = 0;

            /**
             * Peek encryptedCallState.
             * @member {Uint8Array|null|undefined} encryptedCallState
             * @memberof groupcall.SfuHttpResponse.Peek
             * @instance
             */
            Peek.prototype.encryptedCallState = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * Peek _encryptedCallState.
             * @member {"encryptedCallState"|undefined} _encryptedCallState
             * @memberof groupcall.SfuHttpResponse.Peek
             * @instance
             */
            Object.defineProperty(Peek.prototype, "_encryptedCallState", {
                get: $util.oneOfGetter($oneOfFields = ["encryptedCallState"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified Peek message. Does not implicitly {@link groupcall.SfuHttpResponse.Peek.verify|verify} messages.
             * @function encode
             * @memberof groupcall.SfuHttpResponse.Peek
             * @static
             * @param {groupcall.SfuHttpResponse.Peek} message Peek message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Peek.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.startedAt != null && Object.hasOwnProperty.call(message, "startedAt"))
                    writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.startedAt);
                if (message.maxParticipants != null && Object.hasOwnProperty.call(message, "maxParticipants"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.maxParticipants);
                if (message.encryptedCallState != null && Object.hasOwnProperty.call(message, "encryptedCallState"))
                    writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.encryptedCallState);
                return writer;
            };

            /**
             * Decodes a Peek message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.SfuHttpResponse.Peek
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.SfuHttpResponse.Peek} Peek
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Peek.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.SfuHttpResponse.Peek();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.startedAt = reader.uint64();
                            break;
                        }
                    case 2: {
                            message.maxParticipants = reader.uint32();
                            break;
                        }
                    case 3: {
                            message.encryptedCallState = reader.bytes();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Peek;
        })();

        SfuHttpResponse.Join = (function() {

            /**
             * Properties of a Join.
             * @memberof groupcall.SfuHttpResponse
             * @interface IJoin
             * @property {Long|null} [startedAt] Join startedAt
             * @property {number|null} [maxParticipants] Join maxParticipants
             * @property {number|null} [participantId] Join participantId
             * @property {Array.<groupcall.SfuHttpResponse.Join.Address>|null} [addresses] Join addresses
             * @property {string|null} [iceUsernameFragment] Join iceUsernameFragment
             * @property {string|null} [icePassword] Join icePassword
             * @property {Uint8Array|null} [dtlsFingerprint] Join dtlsFingerprint
             */

            /**
             * Constructs a new Join.
             * @memberof groupcall.SfuHttpResponse
             * @classdesc Represents a Join.
             * @implements IJoin
             * @constructor
             * @param {groupcall.SfuHttpResponse.IJoin=} [properties] Properties to set
             */
            function Join(properties) {
                this.addresses = [];
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Join startedAt.
             * @member {Long} startedAt
             * @memberof groupcall.SfuHttpResponse.Join
             * @instance
             */
            Join.prototype.startedAt = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

            /**
             * Join maxParticipants.
             * @member {number} maxParticipants
             * @memberof groupcall.SfuHttpResponse.Join
             * @instance
             */
            Join.prototype.maxParticipants = 0;

            /**
             * Join participantId.
             * @member {number} participantId
             * @memberof groupcall.SfuHttpResponse.Join
             * @instance
             */
            Join.prototype.participantId = 0;

            /**
             * Join addresses.
             * @member {Array.<groupcall.SfuHttpResponse.Join.Address>} addresses
             * @memberof groupcall.SfuHttpResponse.Join
             * @instance
             */
            Join.prototype.addresses = $util.emptyArray;

            /**
             * Join iceUsernameFragment.
             * @member {string} iceUsernameFragment
             * @memberof groupcall.SfuHttpResponse.Join
             * @instance
             */
            Join.prototype.iceUsernameFragment = "";

            /**
             * Join icePassword.
             * @member {string} icePassword
             * @memberof groupcall.SfuHttpResponse.Join
             * @instance
             */
            Join.prototype.icePassword = "";

            /**
             * Join dtlsFingerprint.
             * @member {Uint8Array} dtlsFingerprint
             * @memberof groupcall.SfuHttpResponse.Join
             * @instance
             */
            Join.prototype.dtlsFingerprint = $util.newBuffer([]);

            /**
             * Encodes the specified Join message. Does not implicitly {@link groupcall.SfuHttpResponse.Join.verify|verify} messages.
             * @function encode
             * @memberof groupcall.SfuHttpResponse.Join
             * @static
             * @param {groupcall.SfuHttpResponse.Join} message Join message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Join.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.startedAt != null && Object.hasOwnProperty.call(message, "startedAt"))
                    writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.startedAt);
                if (message.maxParticipants != null && Object.hasOwnProperty.call(message, "maxParticipants"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.maxParticipants);
                if (message.participantId != null && Object.hasOwnProperty.call(message, "participantId"))
                    writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.participantId);
                if (message.addresses != null && message.addresses.length)
                    for (let i = 0; i < message.addresses.length; ++i)
                        $root.groupcall.SfuHttpResponse.Join.Address.encode(message.addresses[i], writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                if (message.iceUsernameFragment != null && Object.hasOwnProperty.call(message, "iceUsernameFragment"))
                    writer.uint32(/* id 5, wireType 2 =*/42).string(message.iceUsernameFragment);
                if (message.icePassword != null && Object.hasOwnProperty.call(message, "icePassword"))
                    writer.uint32(/* id 6, wireType 2 =*/50).string(message.icePassword);
                if (message.dtlsFingerprint != null && Object.hasOwnProperty.call(message, "dtlsFingerprint"))
                    writer.uint32(/* id 7, wireType 2 =*/58).bytes(message.dtlsFingerprint);
                return writer;
            };

            /**
             * Decodes a Join message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.SfuHttpResponse.Join
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.SfuHttpResponse.Join} Join
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Join.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.SfuHttpResponse.Join();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.startedAt = reader.uint64();
                            break;
                        }
                    case 2: {
                            message.maxParticipants = reader.uint32();
                            break;
                        }
                    case 3: {
                            message.participantId = reader.uint32();
                            break;
                        }
                    case 4: {
                            if (!(message.addresses && message.addresses.length))
                                message.addresses = [];
                            message.addresses.push($root.groupcall.SfuHttpResponse.Join.Address.decode(reader, reader.uint32()));
                            break;
                        }
                    case 5: {
                            message.iceUsernameFragment = reader.string();
                            break;
                        }
                    case 6: {
                            message.icePassword = reader.string();
                            break;
                        }
                    case 7: {
                            message.dtlsFingerprint = reader.bytes();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            Join.Address = (function() {

                /**
                 * Properties of an Address.
                 * @memberof groupcall.SfuHttpResponse.Join
                 * @interface IAddress
                 * @property {groupcall.SfuHttpResponse.Join.Address.Protocol|null} [protocol] Address protocol
                 * @property {number|null} [port] Address port
                 * @property {string|null} [ip] Address ip
                 */

                /**
                 * Constructs a new Address.
                 * @memberof groupcall.SfuHttpResponse.Join
                 * @classdesc Represents an Address.
                 * @implements IAddress
                 * @constructor
                 * @param {groupcall.SfuHttpResponse.Join.IAddress=} [properties] Properties to set
                 */
                function Address(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Address protocol.
                 * @member {groupcall.SfuHttpResponse.Join.Address.Protocol} protocol
                 * @memberof groupcall.SfuHttpResponse.Join.Address
                 * @instance
                 */
                Address.prototype.protocol = 0;

                /**
                 * Address port.
                 * @member {number} port
                 * @memberof groupcall.SfuHttpResponse.Join.Address
                 * @instance
                 */
                Address.prototype.port = 0;

                /**
                 * Address ip.
                 * @member {string} ip
                 * @memberof groupcall.SfuHttpResponse.Join.Address
                 * @instance
                 */
                Address.prototype.ip = "";

                /**
                 * Encodes the specified Address message. Does not implicitly {@link groupcall.SfuHttpResponse.Join.Address.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.SfuHttpResponse.Join.Address
                 * @static
                 * @param {groupcall.SfuHttpResponse.Join.Address} message Address message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Address.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.protocol != null && Object.hasOwnProperty.call(message, "protocol"))
                        writer.uint32(/* id 1, wireType 0 =*/8).int32(message.protocol);
                    if (message.port != null && Object.hasOwnProperty.call(message, "port"))
                        writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.port);
                    if (message.ip != null && Object.hasOwnProperty.call(message, "ip"))
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.ip);
                    return writer;
                };

                /**
                 * Decodes an Address message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.SfuHttpResponse.Join.Address
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.SfuHttpResponse.Join.Address} Address
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Address.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.SfuHttpResponse.Join.Address();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.protocol = reader.int32();
                                break;
                            }
                        case 2: {
                                message.port = reader.uint32();
                                break;
                            }
                        case 3: {
                                message.ip = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Protocol enum.
                 * @name groupcall.SfuHttpResponse.Join.Address.Protocol
                 * @enum {number}
                 * @property {number} UDP=0 UDP value
                 */
                Address.Protocol = (function() {
                    const valuesById = {}, values = Object.create(valuesById);
                    values[valuesById[0] = "UDP"] = 0;
                    return values;
                })();

                return Address;
            })();

            return Join;
        })();

        return SfuHttpResponse;
    })();

    groupcall.SfuToParticipant = (function() {

        /**
         * Properties of a SfuToParticipant.
         * @memberof groupcall
         * @interface ISfuToParticipant
         */

        /**
         * Constructs a new SfuToParticipant.
         * @memberof groupcall
         * @classdesc Represents a SfuToParticipant.
         * @implements ISfuToParticipant
         * @constructor
         * @param {groupcall.ISfuToParticipant=} [properties] Properties to set
         */
        function SfuToParticipant(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified SfuToParticipant message. Does not implicitly {@link groupcall.SfuToParticipant.verify|verify} messages.
         * @function encode
         * @memberof groupcall.SfuToParticipant
         * @static
         * @param {groupcall.SfuToParticipant} message SfuToParticipant message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SfuToParticipant.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes a SfuToParticipant message from the specified reader or buffer.
         * @function decode
         * @memberof groupcall.SfuToParticipant
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {groupcall.SfuToParticipant} SfuToParticipant
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SfuToParticipant.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.SfuToParticipant();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        SfuToParticipant.Envelope = (function() {

            /**
             * Properties of an Envelope.
             * @memberof groupcall.SfuToParticipant
             * @interface IEnvelope
             * @property {Uint8Array|null} [padding] Envelope padding
             * @property {groupcall.ParticipantToParticipant.OuterEnvelope|null} [relay] Envelope relay
             * @property {groupcall.SfuToParticipant.Hello|null} [hello] Envelope hello
             * @property {groupcall.SfuToParticipant.ParticipantJoined|null} [participantJoined] Envelope participantJoined
             * @property {groupcall.SfuToParticipant.ParticipantLeft|null} [participantLeft] Envelope participantLeft
             */

            /**
             * Constructs a new Envelope.
             * @memberof groupcall.SfuToParticipant
             * @classdesc Represents an Envelope.
             * @implements IEnvelope
             * @constructor
             * @param {groupcall.SfuToParticipant.IEnvelope=} [properties] Properties to set
             */
            function Envelope(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Envelope padding.
             * @member {Uint8Array} padding
             * @memberof groupcall.SfuToParticipant.Envelope
             * @instance
             */
            Envelope.prototype.padding = $util.newBuffer([]);

            /**
             * Envelope relay.
             * @member {groupcall.ParticipantToParticipant.OuterEnvelope|null|undefined} relay
             * @memberof groupcall.SfuToParticipant.Envelope
             * @instance
             */
            Envelope.prototype.relay = null;

            /**
             * Envelope hello.
             * @member {groupcall.SfuToParticipant.Hello|null|undefined} hello
             * @memberof groupcall.SfuToParticipant.Envelope
             * @instance
             */
            Envelope.prototype.hello = null;

            /**
             * Envelope participantJoined.
             * @member {groupcall.SfuToParticipant.ParticipantJoined|null|undefined} participantJoined
             * @memberof groupcall.SfuToParticipant.Envelope
             * @instance
             */
            Envelope.prototype.participantJoined = null;

            /**
             * Envelope participantLeft.
             * @member {groupcall.SfuToParticipant.ParticipantLeft|null|undefined} participantLeft
             * @memberof groupcall.SfuToParticipant.Envelope
             * @instance
             */
            Envelope.prototype.participantLeft = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * Envelope content.
             * @member {"relay"|"hello"|"participantJoined"|"participantLeft"|undefined} content
             * @memberof groupcall.SfuToParticipant.Envelope
             * @instance
             */
            Object.defineProperty(Envelope.prototype, "content", {
                get: $util.oneOfGetter($oneOfFields = ["relay", "hello", "participantJoined", "participantLeft"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified Envelope message. Does not implicitly {@link groupcall.SfuToParticipant.Envelope.verify|verify} messages.
             * @function encode
             * @memberof groupcall.SfuToParticipant.Envelope
             * @static
             * @param {groupcall.SfuToParticipant.Envelope} message Envelope message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Envelope.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.padding != null && Object.hasOwnProperty.call(message, "padding"))
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.padding);
                if (message.relay != null && Object.hasOwnProperty.call(message, "relay"))
                    $root.groupcall.ParticipantToParticipant.OuterEnvelope.encode(message.relay, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                if (message.hello != null && Object.hasOwnProperty.call(message, "hello"))
                    $root.groupcall.SfuToParticipant.Hello.encode(message.hello, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                if (message.participantJoined != null && Object.hasOwnProperty.call(message, "participantJoined"))
                    $root.groupcall.SfuToParticipant.ParticipantJoined.encode(message.participantJoined, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                if (message.participantLeft != null && Object.hasOwnProperty.call(message, "participantLeft"))
                    $root.groupcall.SfuToParticipant.ParticipantLeft.encode(message.participantLeft, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes an Envelope message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.SfuToParticipant.Envelope
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.SfuToParticipant.Envelope} Envelope
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Envelope.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.SfuToParticipant.Envelope();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.padding = reader.bytes();
                            break;
                        }
                    case 2: {
                            message.relay = $root.groupcall.ParticipantToParticipant.OuterEnvelope.decode(reader, reader.uint32());
                            break;
                        }
                    case 3: {
                            message.hello = $root.groupcall.SfuToParticipant.Hello.decode(reader, reader.uint32());
                            break;
                        }
                    case 4: {
                            message.participantJoined = $root.groupcall.SfuToParticipant.ParticipantJoined.decode(reader, reader.uint32());
                            break;
                        }
                    case 5: {
                            message.participantLeft = $root.groupcall.SfuToParticipant.ParticipantLeft.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Envelope;
        })();

        SfuToParticipant.Hello = (function() {

            /**
             * Properties of a Hello.
             * @memberof groupcall.SfuToParticipant
             * @interface IHello
             * @property {Array.<number>|null} [participantIds] Hello participantIds
             */

            /**
             * Constructs a new Hello.
             * @memberof groupcall.SfuToParticipant
             * @classdesc Represents a Hello.
             * @implements IHello
             * @constructor
             * @param {groupcall.SfuToParticipant.IHello=} [properties] Properties to set
             */
            function Hello(properties) {
                this.participantIds = [];
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Hello participantIds.
             * @member {Array.<number>} participantIds
             * @memberof groupcall.SfuToParticipant.Hello
             * @instance
             */
            Hello.prototype.participantIds = $util.emptyArray;

            /**
             * Encodes the specified Hello message. Does not implicitly {@link groupcall.SfuToParticipant.Hello.verify|verify} messages.
             * @function encode
             * @memberof groupcall.SfuToParticipant.Hello
             * @static
             * @param {groupcall.SfuToParticipant.Hello} message Hello message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Hello.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.participantIds != null && message.participantIds.length) {
                    writer.uint32(/* id 1, wireType 2 =*/10).fork();
                    for (let i = 0; i < message.participantIds.length; ++i)
                        writer.uint32(message.participantIds[i]);
                    writer.ldelim();
                }
                return writer;
            };

            /**
             * Decodes a Hello message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.SfuToParticipant.Hello
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.SfuToParticipant.Hello} Hello
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Hello.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.SfuToParticipant.Hello();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            if (!(message.participantIds && message.participantIds.length))
                                message.participantIds = [];
                            if ((tag & 7) === 2) {
                                let end2 = reader.uint32() + reader.pos;
                                while (reader.pos < end2)
                                    message.participantIds.push(reader.uint32());
                            } else
                                message.participantIds.push(reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Hello;
        })();

        SfuToParticipant.ParticipantJoined = (function() {

            /**
             * Properties of a ParticipantJoined.
             * @memberof groupcall.SfuToParticipant
             * @interface IParticipantJoined
             * @property {number|null} [participantId] ParticipantJoined participantId
             */

            /**
             * Constructs a new ParticipantJoined.
             * @memberof groupcall.SfuToParticipant
             * @classdesc Represents a ParticipantJoined.
             * @implements IParticipantJoined
             * @constructor
             * @param {groupcall.SfuToParticipant.IParticipantJoined=} [properties] Properties to set
             */
            function ParticipantJoined(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ParticipantJoined participantId.
             * @member {number} participantId
             * @memberof groupcall.SfuToParticipant.ParticipantJoined
             * @instance
             */
            ParticipantJoined.prototype.participantId = 0;

            /**
             * Encodes the specified ParticipantJoined message. Does not implicitly {@link groupcall.SfuToParticipant.ParticipantJoined.verify|verify} messages.
             * @function encode
             * @memberof groupcall.SfuToParticipant.ParticipantJoined
             * @static
             * @param {groupcall.SfuToParticipant.ParticipantJoined} message ParticipantJoined message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ParticipantJoined.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.participantId != null && Object.hasOwnProperty.call(message, "participantId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.participantId);
                return writer;
            };

            /**
             * Decodes a ParticipantJoined message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.SfuToParticipant.ParticipantJoined
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.SfuToParticipant.ParticipantJoined} ParticipantJoined
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ParticipantJoined.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.SfuToParticipant.ParticipantJoined();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.participantId = reader.uint32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return ParticipantJoined;
        })();

        SfuToParticipant.ParticipantLeft = (function() {

            /**
             * Properties of a ParticipantLeft.
             * @memberof groupcall.SfuToParticipant
             * @interface IParticipantLeft
             * @property {number|null} [participantId] ParticipantLeft participantId
             */

            /**
             * Constructs a new ParticipantLeft.
             * @memberof groupcall.SfuToParticipant
             * @classdesc Represents a ParticipantLeft.
             * @implements IParticipantLeft
             * @constructor
             * @param {groupcall.SfuToParticipant.IParticipantLeft=} [properties] Properties to set
             */
            function ParticipantLeft(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ParticipantLeft participantId.
             * @member {number} participantId
             * @memberof groupcall.SfuToParticipant.ParticipantLeft
             * @instance
             */
            ParticipantLeft.prototype.participantId = 0;

            /**
             * Encodes the specified ParticipantLeft message. Does not implicitly {@link groupcall.SfuToParticipant.ParticipantLeft.verify|verify} messages.
             * @function encode
             * @memberof groupcall.SfuToParticipant.ParticipantLeft
             * @static
             * @param {groupcall.SfuToParticipant.ParticipantLeft} message ParticipantLeft message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ParticipantLeft.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.participantId != null && Object.hasOwnProperty.call(message, "participantId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.participantId);
                return writer;
            };

            /**
             * Decodes a ParticipantLeft message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.SfuToParticipant.ParticipantLeft
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.SfuToParticipant.ParticipantLeft} ParticipantLeft
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ParticipantLeft.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.SfuToParticipant.ParticipantLeft();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.participantId = reader.uint32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return ParticipantLeft;
        })();

        return SfuToParticipant;
    })();

    groupcall.ParticipantToSfu = (function() {

        /**
         * Properties of a ParticipantToSfu.
         * @memberof groupcall
         * @interface IParticipantToSfu
         */

        /**
         * Constructs a new ParticipantToSfu.
         * @memberof groupcall
         * @classdesc Represents a ParticipantToSfu.
         * @implements IParticipantToSfu
         * @constructor
         * @param {groupcall.IParticipantToSfu=} [properties] Properties to set
         */
        function ParticipantToSfu(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified ParticipantToSfu message. Does not implicitly {@link groupcall.ParticipantToSfu.verify|verify} messages.
         * @function encode
         * @memberof groupcall.ParticipantToSfu
         * @static
         * @param {groupcall.ParticipantToSfu} message ParticipantToSfu message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ParticipantToSfu.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes a ParticipantToSfu message from the specified reader or buffer.
         * @function decode
         * @memberof groupcall.ParticipantToSfu
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {groupcall.ParticipantToSfu} ParticipantToSfu
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ParticipantToSfu.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToSfu();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        ParticipantToSfu.Envelope = (function() {

            /**
             * Properties of an Envelope.
             * @memberof groupcall.ParticipantToSfu
             * @interface IEnvelope
             * @property {Uint8Array|null} [padding] Envelope padding
             * @property {groupcall.ParticipantToParticipant.OuterEnvelope|null} [relay] Envelope relay
             * @property {groupcall.ParticipantToSfu.UpdateCallState|null} [updateCallState] Envelope updateCallState
             * @property {groupcall.ParticipantToSfu.ParticipantMicrophone|null} [requestParticipantMicrophone] Envelope requestParticipantMicrophone
             * @property {groupcall.ParticipantToSfu.ParticipantCamera|null} [requestParticipantCamera] Envelope requestParticipantCamera
             * @property {groupcall.ParticipantToSfu.ParticipantScreen|null} [requestParticipantScreenShare] Envelope requestParticipantScreenShare
             */

            /**
             * Constructs a new Envelope.
             * @memberof groupcall.ParticipantToSfu
             * @classdesc Represents an Envelope.
             * @implements IEnvelope
             * @constructor
             * @param {groupcall.ParticipantToSfu.IEnvelope=} [properties] Properties to set
             */
            function Envelope(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Envelope padding.
             * @member {Uint8Array} padding
             * @memberof groupcall.ParticipantToSfu.Envelope
             * @instance
             */
            Envelope.prototype.padding = $util.newBuffer([]);

            /**
             * Envelope relay.
             * @member {groupcall.ParticipantToParticipant.OuterEnvelope|null|undefined} relay
             * @memberof groupcall.ParticipantToSfu.Envelope
             * @instance
             */
            Envelope.prototype.relay = null;

            /**
             * Envelope updateCallState.
             * @member {groupcall.ParticipantToSfu.UpdateCallState|null|undefined} updateCallState
             * @memberof groupcall.ParticipantToSfu.Envelope
             * @instance
             */
            Envelope.prototype.updateCallState = null;

            /**
             * Envelope requestParticipantMicrophone.
             * @member {groupcall.ParticipantToSfu.ParticipantMicrophone|null|undefined} requestParticipantMicrophone
             * @memberof groupcall.ParticipantToSfu.Envelope
             * @instance
             */
            Envelope.prototype.requestParticipantMicrophone = null;

            /**
             * Envelope requestParticipantCamera.
             * @member {groupcall.ParticipantToSfu.ParticipantCamera|null|undefined} requestParticipantCamera
             * @memberof groupcall.ParticipantToSfu.Envelope
             * @instance
             */
            Envelope.prototype.requestParticipantCamera = null;

            /**
             * Envelope requestParticipantScreenShare.
             * @member {groupcall.ParticipantToSfu.ParticipantScreen|null|undefined} requestParticipantScreenShare
             * @memberof groupcall.ParticipantToSfu.Envelope
             * @instance
             */
            Envelope.prototype.requestParticipantScreenShare = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * Envelope content.
             * @member {"relay"|"updateCallState"|"requestParticipantMicrophone"|"requestParticipantCamera"|"requestParticipantScreenShare"|undefined} content
             * @memberof groupcall.ParticipantToSfu.Envelope
             * @instance
             */
            Object.defineProperty(Envelope.prototype, "content", {
                get: $util.oneOfGetter($oneOfFields = ["relay", "updateCallState", "requestParticipantMicrophone", "requestParticipantCamera", "requestParticipantScreenShare"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified Envelope message. Does not implicitly {@link groupcall.ParticipantToSfu.Envelope.verify|verify} messages.
             * @function encode
             * @memberof groupcall.ParticipantToSfu.Envelope
             * @static
             * @param {groupcall.ParticipantToSfu.Envelope} message Envelope message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Envelope.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.padding != null && Object.hasOwnProperty.call(message, "padding"))
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.padding);
                if (message.relay != null && Object.hasOwnProperty.call(message, "relay"))
                    $root.groupcall.ParticipantToParticipant.OuterEnvelope.encode(message.relay, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                if (message.updateCallState != null && Object.hasOwnProperty.call(message, "updateCallState"))
                    $root.groupcall.ParticipantToSfu.UpdateCallState.encode(message.updateCallState, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                if (message.requestParticipantCamera != null && Object.hasOwnProperty.call(message, "requestParticipantCamera"))
                    $root.groupcall.ParticipantToSfu.ParticipantCamera.encode(message.requestParticipantCamera, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                if (message.requestParticipantScreenShare != null && Object.hasOwnProperty.call(message, "requestParticipantScreenShare"))
                    $root.groupcall.ParticipantToSfu.ParticipantScreen.encode(message.requestParticipantScreenShare, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                if (message.requestParticipantMicrophone != null && Object.hasOwnProperty.call(message, "requestParticipantMicrophone"))
                    $root.groupcall.ParticipantToSfu.ParticipantMicrophone.encode(message.requestParticipantMicrophone, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes an Envelope message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.ParticipantToSfu.Envelope
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.ParticipantToSfu.Envelope} Envelope
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Envelope.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToSfu.Envelope();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.padding = reader.bytes();
                            break;
                        }
                    case 2: {
                            message.relay = $root.groupcall.ParticipantToParticipant.OuterEnvelope.decode(reader, reader.uint32());
                            break;
                        }
                    case 3: {
                            message.updateCallState = $root.groupcall.ParticipantToSfu.UpdateCallState.decode(reader, reader.uint32());
                            break;
                        }
                    case 6: {
                            message.requestParticipantMicrophone = $root.groupcall.ParticipantToSfu.ParticipantMicrophone.decode(reader, reader.uint32());
                            break;
                        }
                    case 4: {
                            message.requestParticipantCamera = $root.groupcall.ParticipantToSfu.ParticipantCamera.decode(reader, reader.uint32());
                            break;
                        }
                    case 5: {
                            message.requestParticipantScreenShare = $root.groupcall.ParticipantToSfu.ParticipantScreen.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Envelope;
        })();

        ParticipantToSfu.UpdateCallState = (function() {

            /**
             * Properties of an UpdateCallState.
             * @memberof groupcall.ParticipantToSfu
             * @interface IUpdateCallState
             * @property {Uint8Array|null} [encryptedCallState] UpdateCallState encryptedCallState
             */

            /**
             * Constructs a new UpdateCallState.
             * @memberof groupcall.ParticipantToSfu
             * @classdesc Represents an UpdateCallState.
             * @implements IUpdateCallState
             * @constructor
             * @param {groupcall.ParticipantToSfu.IUpdateCallState=} [properties] Properties to set
             */
            function UpdateCallState(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * UpdateCallState encryptedCallState.
             * @member {Uint8Array} encryptedCallState
             * @memberof groupcall.ParticipantToSfu.UpdateCallState
             * @instance
             */
            UpdateCallState.prototype.encryptedCallState = $util.newBuffer([]);

            /**
             * Encodes the specified UpdateCallState message. Does not implicitly {@link groupcall.ParticipantToSfu.UpdateCallState.verify|verify} messages.
             * @function encode
             * @memberof groupcall.ParticipantToSfu.UpdateCallState
             * @static
             * @param {groupcall.ParticipantToSfu.UpdateCallState} message UpdateCallState message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            UpdateCallState.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.encryptedCallState != null && Object.hasOwnProperty.call(message, "encryptedCallState"))
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.encryptedCallState);
                return writer;
            };

            /**
             * Decodes an UpdateCallState message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.ParticipantToSfu.UpdateCallState
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.ParticipantToSfu.UpdateCallState} UpdateCallState
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            UpdateCallState.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToSfu.UpdateCallState();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.encryptedCallState = reader.bytes();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return UpdateCallState;
        })();

        ParticipantToSfu.ParticipantMicrophone = (function() {

            /**
             * Properties of a ParticipantMicrophone.
             * @memberof groupcall.ParticipantToSfu
             * @interface IParticipantMicrophone
             * @property {number|null} [participantId] ParticipantMicrophone participantId
             * @property {groupcall.ParticipantToSfu.ParticipantMicrophone.Subscribe|null} [subscribe] ParticipantMicrophone subscribe
             * @property {groupcall.ParticipantToSfu.ParticipantMicrophone.Unsubscribe|null} [unsubscribe] ParticipantMicrophone unsubscribe
             */

            /**
             * Constructs a new ParticipantMicrophone.
             * @memberof groupcall.ParticipantToSfu
             * @classdesc Represents a ParticipantMicrophone.
             * @implements IParticipantMicrophone
             * @constructor
             * @param {groupcall.ParticipantToSfu.IParticipantMicrophone=} [properties] Properties to set
             */
            function ParticipantMicrophone(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ParticipantMicrophone participantId.
             * @member {number} participantId
             * @memberof groupcall.ParticipantToSfu.ParticipantMicrophone
             * @instance
             */
            ParticipantMicrophone.prototype.participantId = 0;

            /**
             * ParticipantMicrophone subscribe.
             * @member {groupcall.ParticipantToSfu.ParticipantMicrophone.Subscribe|null|undefined} subscribe
             * @memberof groupcall.ParticipantToSfu.ParticipantMicrophone
             * @instance
             */
            ParticipantMicrophone.prototype.subscribe = null;

            /**
             * ParticipantMicrophone unsubscribe.
             * @member {groupcall.ParticipantToSfu.ParticipantMicrophone.Unsubscribe|null|undefined} unsubscribe
             * @memberof groupcall.ParticipantToSfu.ParticipantMicrophone
             * @instance
             */
            ParticipantMicrophone.prototype.unsubscribe = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * ParticipantMicrophone action.
             * @member {"subscribe"|"unsubscribe"|undefined} action
             * @memberof groupcall.ParticipantToSfu.ParticipantMicrophone
             * @instance
             */
            Object.defineProperty(ParticipantMicrophone.prototype, "action", {
                get: $util.oneOfGetter($oneOfFields = ["subscribe", "unsubscribe"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified ParticipantMicrophone message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantMicrophone.verify|verify} messages.
             * @function encode
             * @memberof groupcall.ParticipantToSfu.ParticipantMicrophone
             * @static
             * @param {groupcall.ParticipantToSfu.ParticipantMicrophone} message ParticipantMicrophone message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ParticipantMicrophone.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.participantId != null && Object.hasOwnProperty.call(message, "participantId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.participantId);
                if (message.subscribe != null && Object.hasOwnProperty.call(message, "subscribe"))
                    $root.groupcall.ParticipantToSfu.ParticipantMicrophone.Subscribe.encode(message.subscribe, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                if (message.unsubscribe != null && Object.hasOwnProperty.call(message, "unsubscribe"))
                    $root.groupcall.ParticipantToSfu.ParticipantMicrophone.Unsubscribe.encode(message.unsubscribe, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes a ParticipantMicrophone message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.ParticipantToSfu.ParticipantMicrophone
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.ParticipantToSfu.ParticipantMicrophone} ParticipantMicrophone
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ParticipantMicrophone.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToSfu.ParticipantMicrophone();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.participantId = reader.uint32();
                            break;
                        }
                    case 2: {
                            message.subscribe = $root.groupcall.ParticipantToSfu.ParticipantMicrophone.Subscribe.decode(reader, reader.uint32());
                            break;
                        }
                    case 3: {
                            message.unsubscribe = $root.groupcall.ParticipantToSfu.ParticipantMicrophone.Unsubscribe.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            ParticipantMicrophone.Subscribe = (function() {

                /**
                 * Properties of a Subscribe.
                 * @memberof groupcall.ParticipantToSfu.ParticipantMicrophone
                 * @interface ISubscribe
                 */

                /**
                 * Constructs a new Subscribe.
                 * @memberof groupcall.ParticipantToSfu.ParticipantMicrophone
                 * @classdesc Represents a Subscribe.
                 * @implements ISubscribe
                 * @constructor
                 * @param {groupcall.ParticipantToSfu.ParticipantMicrophone.ISubscribe=} [properties] Properties to set
                 */
                function Subscribe(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Encodes the specified Subscribe message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantMicrophone.Subscribe.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToSfu.ParticipantMicrophone.Subscribe
                 * @static
                 * @param {groupcall.ParticipantToSfu.ParticipantMicrophone.Subscribe} message Subscribe message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Subscribe.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    return writer;
                };

                /**
                 * Decodes a Subscribe message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToSfu.ParticipantMicrophone.Subscribe
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToSfu.ParticipantMicrophone.Subscribe} Subscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Subscribe.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToSfu.ParticipantMicrophone.Subscribe();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Subscribe;
            })();

            ParticipantMicrophone.Unsubscribe = (function() {

                /**
                 * Properties of an Unsubscribe.
                 * @memberof groupcall.ParticipantToSfu.ParticipantMicrophone
                 * @interface IUnsubscribe
                 */

                /**
                 * Constructs a new Unsubscribe.
                 * @memberof groupcall.ParticipantToSfu.ParticipantMicrophone
                 * @classdesc Represents an Unsubscribe.
                 * @implements IUnsubscribe
                 * @constructor
                 * @param {groupcall.ParticipantToSfu.ParticipantMicrophone.IUnsubscribe=} [properties] Properties to set
                 */
                function Unsubscribe(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Encodes the specified Unsubscribe message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantMicrophone.Unsubscribe.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToSfu.ParticipantMicrophone.Unsubscribe
                 * @static
                 * @param {groupcall.ParticipantToSfu.ParticipantMicrophone.Unsubscribe} message Unsubscribe message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Unsubscribe.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    return writer;
                };

                /**
                 * Decodes an Unsubscribe message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToSfu.ParticipantMicrophone.Unsubscribe
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToSfu.ParticipantMicrophone.Unsubscribe} Unsubscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Unsubscribe.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToSfu.ParticipantMicrophone.Unsubscribe();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Unsubscribe;
            })();

            return ParticipantMicrophone;
        })();

        ParticipantToSfu.ParticipantCamera = (function() {

            /**
             * Properties of a ParticipantCamera.
             * @memberof groupcall.ParticipantToSfu
             * @interface IParticipantCamera
             * @property {number|null} [participantId] ParticipantCamera participantId
             * @property {groupcall.ParticipantToSfu.ParticipantCamera.Subscribe|null} [subscribe] ParticipantCamera subscribe
             * @property {groupcall.ParticipantToSfu.ParticipantCamera.Unsubscribe|null} [unsubscribe] ParticipantCamera unsubscribe
             */

            /**
             * Constructs a new ParticipantCamera.
             * @memberof groupcall.ParticipantToSfu
             * @classdesc Represents a ParticipantCamera.
             * @implements IParticipantCamera
             * @constructor
             * @param {groupcall.ParticipantToSfu.IParticipantCamera=} [properties] Properties to set
             */
            function ParticipantCamera(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ParticipantCamera participantId.
             * @member {number} participantId
             * @memberof groupcall.ParticipantToSfu.ParticipantCamera
             * @instance
             */
            ParticipantCamera.prototype.participantId = 0;

            /**
             * ParticipantCamera subscribe.
             * @member {groupcall.ParticipantToSfu.ParticipantCamera.Subscribe|null|undefined} subscribe
             * @memberof groupcall.ParticipantToSfu.ParticipantCamera
             * @instance
             */
            ParticipantCamera.prototype.subscribe = null;

            /**
             * ParticipantCamera unsubscribe.
             * @member {groupcall.ParticipantToSfu.ParticipantCamera.Unsubscribe|null|undefined} unsubscribe
             * @memberof groupcall.ParticipantToSfu.ParticipantCamera
             * @instance
             */
            ParticipantCamera.prototype.unsubscribe = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * ParticipantCamera action.
             * @member {"subscribe"|"unsubscribe"|undefined} action
             * @memberof groupcall.ParticipantToSfu.ParticipantCamera
             * @instance
             */
            Object.defineProperty(ParticipantCamera.prototype, "action", {
                get: $util.oneOfGetter($oneOfFields = ["subscribe", "unsubscribe"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified ParticipantCamera message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantCamera.verify|verify} messages.
             * @function encode
             * @memberof groupcall.ParticipantToSfu.ParticipantCamera
             * @static
             * @param {groupcall.ParticipantToSfu.ParticipantCamera} message ParticipantCamera message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ParticipantCamera.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.participantId != null && Object.hasOwnProperty.call(message, "participantId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.participantId);
                if (message.subscribe != null && Object.hasOwnProperty.call(message, "subscribe"))
                    $root.groupcall.ParticipantToSfu.ParticipantCamera.Subscribe.encode(message.subscribe, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                if (message.unsubscribe != null && Object.hasOwnProperty.call(message, "unsubscribe"))
                    $root.groupcall.ParticipantToSfu.ParticipantCamera.Unsubscribe.encode(message.unsubscribe, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes a ParticipantCamera message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.ParticipantToSfu.ParticipantCamera
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.ParticipantToSfu.ParticipantCamera} ParticipantCamera
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ParticipantCamera.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToSfu.ParticipantCamera();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.participantId = reader.uint32();
                            break;
                        }
                    case 2: {
                            message.subscribe = $root.groupcall.ParticipantToSfu.ParticipantCamera.Subscribe.decode(reader, reader.uint32());
                            break;
                        }
                    case 3: {
                            message.unsubscribe = $root.groupcall.ParticipantToSfu.ParticipantCamera.Unsubscribe.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            ParticipantCamera.Subscribe = (function() {

                /**
                 * Properties of a Subscribe.
                 * @memberof groupcall.ParticipantToSfu.ParticipantCamera
                 * @interface ISubscribe
                 * @property {common.Resolution|null} [desiredResolution] Subscribe desiredResolution
                 * @property {number|null} [desiredFps] Subscribe desiredFps
                 */

                /**
                 * Constructs a new Subscribe.
                 * @memberof groupcall.ParticipantToSfu.ParticipantCamera
                 * @classdesc Represents a Subscribe.
                 * @implements ISubscribe
                 * @constructor
                 * @param {groupcall.ParticipantToSfu.ParticipantCamera.ISubscribe=} [properties] Properties to set
                 */
                function Subscribe(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Subscribe desiredResolution.
                 * @member {common.Resolution|null|undefined} desiredResolution
                 * @memberof groupcall.ParticipantToSfu.ParticipantCamera.Subscribe
                 * @instance
                 */
                Subscribe.prototype.desiredResolution = null;

                /**
                 * Subscribe desiredFps.
                 * @member {number} desiredFps
                 * @memberof groupcall.ParticipantToSfu.ParticipantCamera.Subscribe
                 * @instance
                 */
                Subscribe.prototype.desiredFps = 0;

                /**
                 * Encodes the specified Subscribe message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantCamera.Subscribe.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToSfu.ParticipantCamera.Subscribe
                 * @static
                 * @param {groupcall.ParticipantToSfu.ParticipantCamera.Subscribe} message Subscribe message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Subscribe.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.desiredResolution != null && Object.hasOwnProperty.call(message, "desiredResolution"))
                        $root.common.Resolution.encode(message.desiredResolution, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                    if (message.desiredFps != null && Object.hasOwnProperty.call(message, "desiredFps"))
                        writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.desiredFps);
                    return writer;
                };

                /**
                 * Decodes a Subscribe message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToSfu.ParticipantCamera.Subscribe
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToSfu.ParticipantCamera.Subscribe} Subscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Subscribe.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToSfu.ParticipantCamera.Subscribe();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.desiredResolution = $root.common.Resolution.decode(reader, reader.uint32());
                                break;
                            }
                        case 2: {
                                message.desiredFps = reader.uint32();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Subscribe;
            })();

            ParticipantCamera.Unsubscribe = (function() {

                /**
                 * Properties of an Unsubscribe.
                 * @memberof groupcall.ParticipantToSfu.ParticipantCamera
                 * @interface IUnsubscribe
                 */

                /**
                 * Constructs a new Unsubscribe.
                 * @memberof groupcall.ParticipantToSfu.ParticipantCamera
                 * @classdesc Represents an Unsubscribe.
                 * @implements IUnsubscribe
                 * @constructor
                 * @param {groupcall.ParticipantToSfu.ParticipantCamera.IUnsubscribe=} [properties] Properties to set
                 */
                function Unsubscribe(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Encodes the specified Unsubscribe message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantCamera.Unsubscribe.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToSfu.ParticipantCamera.Unsubscribe
                 * @static
                 * @param {groupcall.ParticipantToSfu.ParticipantCamera.Unsubscribe} message Unsubscribe message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Unsubscribe.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    return writer;
                };

                /**
                 * Decodes an Unsubscribe message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToSfu.ParticipantCamera.Unsubscribe
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToSfu.ParticipantCamera.Unsubscribe} Unsubscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Unsubscribe.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToSfu.ParticipantCamera.Unsubscribe();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Unsubscribe;
            })();

            return ParticipantCamera;
        })();

        ParticipantToSfu.ParticipantScreen = (function() {

            /**
             * Properties of a ParticipantScreen.
             * @memberof groupcall.ParticipantToSfu
             * @interface IParticipantScreen
             * @property {number|null} [participantId] ParticipantScreen participantId
             * @property {groupcall.ParticipantToSfu.ParticipantScreen.Subscribe|null} [subscribe] ParticipantScreen subscribe
             * @property {groupcall.ParticipantToSfu.ParticipantScreen.Unsubscribe|null} [unsubscribe] ParticipantScreen unsubscribe
             */

            /**
             * Constructs a new ParticipantScreen.
             * @memberof groupcall.ParticipantToSfu
             * @classdesc Represents a ParticipantScreen.
             * @implements IParticipantScreen
             * @constructor
             * @param {groupcall.ParticipantToSfu.IParticipantScreen=} [properties] Properties to set
             */
            function ParticipantScreen(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ParticipantScreen participantId.
             * @member {number} participantId
             * @memberof groupcall.ParticipantToSfu.ParticipantScreen
             * @instance
             */
            ParticipantScreen.prototype.participantId = 0;

            /**
             * ParticipantScreen subscribe.
             * @member {groupcall.ParticipantToSfu.ParticipantScreen.Subscribe|null|undefined} subscribe
             * @memberof groupcall.ParticipantToSfu.ParticipantScreen
             * @instance
             */
            ParticipantScreen.prototype.subscribe = null;

            /**
             * ParticipantScreen unsubscribe.
             * @member {groupcall.ParticipantToSfu.ParticipantScreen.Unsubscribe|null|undefined} unsubscribe
             * @memberof groupcall.ParticipantToSfu.ParticipantScreen
             * @instance
             */
            ParticipantScreen.prototype.unsubscribe = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * ParticipantScreen action.
             * @member {"subscribe"|"unsubscribe"|undefined} action
             * @memberof groupcall.ParticipantToSfu.ParticipantScreen
             * @instance
             */
            Object.defineProperty(ParticipantScreen.prototype, "action", {
                get: $util.oneOfGetter($oneOfFields = ["subscribe", "unsubscribe"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified ParticipantScreen message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantScreen.verify|verify} messages.
             * @function encode
             * @memberof groupcall.ParticipantToSfu.ParticipantScreen
             * @static
             * @param {groupcall.ParticipantToSfu.ParticipantScreen} message ParticipantScreen message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ParticipantScreen.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.participantId != null && Object.hasOwnProperty.call(message, "participantId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.participantId);
                if (message.subscribe != null && Object.hasOwnProperty.call(message, "subscribe"))
                    $root.groupcall.ParticipantToSfu.ParticipantScreen.Subscribe.encode(message.subscribe, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                if (message.unsubscribe != null && Object.hasOwnProperty.call(message, "unsubscribe"))
                    $root.groupcall.ParticipantToSfu.ParticipantScreen.Unsubscribe.encode(message.unsubscribe, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes a ParticipantScreen message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.ParticipantToSfu.ParticipantScreen
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.ParticipantToSfu.ParticipantScreen} ParticipantScreen
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ParticipantScreen.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToSfu.ParticipantScreen();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.participantId = reader.uint32();
                            break;
                        }
                    case 2: {
                            message.subscribe = $root.groupcall.ParticipantToSfu.ParticipantScreen.Subscribe.decode(reader, reader.uint32());
                            break;
                        }
                    case 3: {
                            message.unsubscribe = $root.groupcall.ParticipantToSfu.ParticipantScreen.Unsubscribe.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            ParticipantScreen.Subscribe = (function() {

                /**
                 * Properties of a Subscribe.
                 * @memberof groupcall.ParticipantToSfu.ParticipantScreen
                 * @interface ISubscribe
                 */

                /**
                 * Constructs a new Subscribe.
                 * @memberof groupcall.ParticipantToSfu.ParticipantScreen
                 * @classdesc Represents a Subscribe.
                 * @implements ISubscribe
                 * @constructor
                 * @param {groupcall.ParticipantToSfu.ParticipantScreen.ISubscribe=} [properties] Properties to set
                 */
                function Subscribe(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Encodes the specified Subscribe message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantScreen.Subscribe.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToSfu.ParticipantScreen.Subscribe
                 * @static
                 * @param {groupcall.ParticipantToSfu.ParticipantScreen.Subscribe} message Subscribe message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Subscribe.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    return writer;
                };

                /**
                 * Decodes a Subscribe message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToSfu.ParticipantScreen.Subscribe
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToSfu.ParticipantScreen.Subscribe} Subscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Subscribe.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToSfu.ParticipantScreen.Subscribe();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Subscribe;
            })();

            ParticipantScreen.Unsubscribe = (function() {

                /**
                 * Properties of an Unsubscribe.
                 * @memberof groupcall.ParticipantToSfu.ParticipantScreen
                 * @interface IUnsubscribe
                 */

                /**
                 * Constructs a new Unsubscribe.
                 * @memberof groupcall.ParticipantToSfu.ParticipantScreen
                 * @classdesc Represents an Unsubscribe.
                 * @implements IUnsubscribe
                 * @constructor
                 * @param {groupcall.ParticipantToSfu.ParticipantScreen.IUnsubscribe=} [properties] Properties to set
                 */
                function Unsubscribe(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Encodes the specified Unsubscribe message. Does not implicitly {@link groupcall.ParticipantToSfu.ParticipantScreen.Unsubscribe.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToSfu.ParticipantScreen.Unsubscribe
                 * @static
                 * @param {groupcall.ParticipantToSfu.ParticipantScreen.Unsubscribe} message Unsubscribe message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Unsubscribe.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    return writer;
                };

                /**
                 * Decodes an Unsubscribe message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToSfu.ParticipantScreen.Unsubscribe
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToSfu.ParticipantScreen.Unsubscribe} Unsubscribe
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Unsubscribe.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToSfu.ParticipantScreen.Unsubscribe();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Unsubscribe;
            })();

            return ParticipantScreen;
        })();

        return ParticipantToSfu;
    })();

    groupcall.ParticipantToParticipant = (function() {

        /**
         * Properties of a ParticipantToParticipant.
         * @memberof groupcall
         * @interface IParticipantToParticipant
         */

        /**
         * Constructs a new ParticipantToParticipant.
         * @memberof groupcall
         * @classdesc Represents a ParticipantToParticipant.
         * @implements IParticipantToParticipant
         * @constructor
         * @param {groupcall.IParticipantToParticipant=} [properties] Properties to set
         */
        function ParticipantToParticipant(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified ParticipantToParticipant message. Does not implicitly {@link groupcall.ParticipantToParticipant.verify|verify} messages.
         * @function encode
         * @memberof groupcall.ParticipantToParticipant
         * @static
         * @param {groupcall.ParticipantToParticipant} message ParticipantToParticipant message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ParticipantToParticipant.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes a ParticipantToParticipant message from the specified reader or buffer.
         * @function decode
         * @memberof groupcall.ParticipantToParticipant
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {groupcall.ParticipantToParticipant} ParticipantToParticipant
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ParticipantToParticipant.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        ParticipantToParticipant.OuterEnvelope = (function() {

            /**
             * Properties of an OuterEnvelope.
             * @memberof groupcall.ParticipantToParticipant
             * @interface IOuterEnvelope
             * @property {number|null} [sender] OuterEnvelope sender
             * @property {number|null} [receiver] OuterEnvelope receiver
             * @property {Uint8Array|null} [encryptedData] OuterEnvelope encryptedData
             */

            /**
             * Constructs a new OuterEnvelope.
             * @memberof groupcall.ParticipantToParticipant
             * @classdesc Represents an OuterEnvelope.
             * @implements IOuterEnvelope
             * @constructor
             * @param {groupcall.ParticipantToParticipant.IOuterEnvelope=} [properties] Properties to set
             */
            function OuterEnvelope(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * OuterEnvelope sender.
             * @member {number} sender
             * @memberof groupcall.ParticipantToParticipant.OuterEnvelope
             * @instance
             */
            OuterEnvelope.prototype.sender = 0;

            /**
             * OuterEnvelope receiver.
             * @member {number} receiver
             * @memberof groupcall.ParticipantToParticipant.OuterEnvelope
             * @instance
             */
            OuterEnvelope.prototype.receiver = 0;

            /**
             * OuterEnvelope encryptedData.
             * @member {Uint8Array} encryptedData
             * @memberof groupcall.ParticipantToParticipant.OuterEnvelope
             * @instance
             */
            OuterEnvelope.prototype.encryptedData = $util.newBuffer([]);

            /**
             * Encodes the specified OuterEnvelope message. Does not implicitly {@link groupcall.ParticipantToParticipant.OuterEnvelope.verify|verify} messages.
             * @function encode
             * @memberof groupcall.ParticipantToParticipant.OuterEnvelope
             * @static
             * @param {groupcall.ParticipantToParticipant.OuterEnvelope} message OuterEnvelope message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            OuterEnvelope.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.sender != null && Object.hasOwnProperty.call(message, "sender"))
                    writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.sender);
                if (message.receiver != null && Object.hasOwnProperty.call(message, "receiver"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.receiver);
                if (message.encryptedData != null && Object.hasOwnProperty.call(message, "encryptedData"))
                    writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.encryptedData);
                return writer;
            };

            /**
             * Decodes an OuterEnvelope message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.ParticipantToParticipant.OuterEnvelope
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.ParticipantToParticipant.OuterEnvelope} OuterEnvelope
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            OuterEnvelope.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.OuterEnvelope();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.sender = reader.uint32();
                            break;
                        }
                    case 2: {
                            message.receiver = reader.uint32();
                            break;
                        }
                    case 4: {
                            message.encryptedData = reader.bytes();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return OuterEnvelope;
        })();

        ParticipantToParticipant.Handshake = (function() {

            /**
             * Properties of a Handshake.
             * @memberof groupcall.ParticipantToParticipant
             * @interface IHandshake
             */

            /**
             * Constructs a new Handshake.
             * @memberof groupcall.ParticipantToParticipant
             * @classdesc Represents a Handshake.
             * @implements IHandshake
             * @constructor
             * @param {groupcall.ParticipantToParticipant.IHandshake=} [properties] Properties to set
             */
            function Handshake(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Encodes the specified Handshake message. Does not implicitly {@link groupcall.ParticipantToParticipant.Handshake.verify|verify} messages.
             * @function encode
             * @memberof groupcall.ParticipantToParticipant.Handshake
             * @static
             * @param {groupcall.ParticipantToParticipant.Handshake} message Handshake message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Handshake.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Decodes a Handshake message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.ParticipantToParticipant.Handshake
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.ParticipantToParticipant.Handshake} Handshake
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Handshake.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.Handshake();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            Handshake.HelloEnvelope = (function() {

                /**
                 * Properties of a HelloEnvelope.
                 * @memberof groupcall.ParticipantToParticipant.Handshake
                 * @interface IHelloEnvelope
                 * @property {Uint8Array|null} [padding] HelloEnvelope padding
                 * @property {groupcall.ParticipantToParticipant.Handshake.Hello|null} [hello] HelloEnvelope hello
                 * @property {groupcall.ParticipantToParticipant.Handshake.GuestHello|null} [guestHello] HelloEnvelope guestHello
                 */

                /**
                 * Constructs a new HelloEnvelope.
                 * @memberof groupcall.ParticipantToParticipant.Handshake
                 * @classdesc Represents a HelloEnvelope.
                 * @implements IHelloEnvelope
                 * @constructor
                 * @param {groupcall.ParticipantToParticipant.Handshake.IHelloEnvelope=} [properties] Properties to set
                 */
                function HelloEnvelope(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * HelloEnvelope padding.
                 * @member {Uint8Array} padding
                 * @memberof groupcall.ParticipantToParticipant.Handshake.HelloEnvelope
                 * @instance
                 */
                HelloEnvelope.prototype.padding = $util.newBuffer([]);

                /**
                 * HelloEnvelope hello.
                 * @member {groupcall.ParticipantToParticipant.Handshake.Hello|null|undefined} hello
                 * @memberof groupcall.ParticipantToParticipant.Handshake.HelloEnvelope
                 * @instance
                 */
                HelloEnvelope.prototype.hello = null;

                /**
                 * HelloEnvelope guestHello.
                 * @member {groupcall.ParticipantToParticipant.Handshake.GuestHello|null|undefined} guestHello
                 * @memberof groupcall.ParticipantToParticipant.Handshake.HelloEnvelope
                 * @instance
                 */
                HelloEnvelope.prototype.guestHello = null;

                // OneOf field names bound to virtual getters and setters
                let $oneOfFields;

                /**
                 * HelloEnvelope content.
                 * @member {"hello"|"guestHello"|undefined} content
                 * @memberof groupcall.ParticipantToParticipant.Handshake.HelloEnvelope
                 * @instance
                 */
                Object.defineProperty(HelloEnvelope.prototype, "content", {
                    get: $util.oneOfGetter($oneOfFields = ["hello", "guestHello"]),
                    set: $util.oneOfSetter($oneOfFields)
                });

                /**
                 * Encodes the specified HelloEnvelope message. Does not implicitly {@link groupcall.ParticipantToParticipant.Handshake.HelloEnvelope.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToParticipant.Handshake.HelloEnvelope
                 * @static
                 * @param {groupcall.ParticipantToParticipant.Handshake.HelloEnvelope} message HelloEnvelope message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                HelloEnvelope.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.padding != null && Object.hasOwnProperty.call(message, "padding"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.padding);
                    if (message.hello != null && Object.hasOwnProperty.call(message, "hello"))
                        $root.groupcall.ParticipantToParticipant.Handshake.Hello.encode(message.hello, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                    if (message.guestHello != null && Object.hasOwnProperty.call(message, "guestHello"))
                        $root.groupcall.ParticipantToParticipant.Handshake.GuestHello.encode(message.guestHello, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                    return writer;
                };

                /**
                 * Decodes a HelloEnvelope message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToParticipant.Handshake.HelloEnvelope
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToParticipant.Handshake.HelloEnvelope} HelloEnvelope
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                HelloEnvelope.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.Handshake.HelloEnvelope();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.padding = reader.bytes();
                                break;
                            }
                        case 2: {
                                message.hello = $root.groupcall.ParticipantToParticipant.Handshake.Hello.decode(reader, reader.uint32());
                                break;
                            }
                        case 3: {
                                message.guestHello = $root.groupcall.ParticipantToParticipant.Handshake.GuestHello.decode(reader, reader.uint32());
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return HelloEnvelope;
            })();

            Handshake.AuthEnvelope = (function() {

                /**
                 * Properties of an AuthEnvelope.
                 * @memberof groupcall.ParticipantToParticipant.Handshake
                 * @interface IAuthEnvelope
                 * @property {Uint8Array|null} [padding] AuthEnvelope padding
                 * @property {groupcall.ParticipantToParticipant.Handshake.Auth|null} [auth] AuthEnvelope auth
                 * @property {groupcall.ParticipantToParticipant.Handshake.GuestAuth|null} [guestAuth] AuthEnvelope guestAuth
                 */

                /**
                 * Constructs a new AuthEnvelope.
                 * @memberof groupcall.ParticipantToParticipant.Handshake
                 * @classdesc Represents an AuthEnvelope.
                 * @implements IAuthEnvelope
                 * @constructor
                 * @param {groupcall.ParticipantToParticipant.Handshake.IAuthEnvelope=} [properties] Properties to set
                 */
                function AuthEnvelope(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * AuthEnvelope padding.
                 * @member {Uint8Array} padding
                 * @memberof groupcall.ParticipantToParticipant.Handshake.AuthEnvelope
                 * @instance
                 */
                AuthEnvelope.prototype.padding = $util.newBuffer([]);

                /**
                 * AuthEnvelope auth.
                 * @member {groupcall.ParticipantToParticipant.Handshake.Auth|null|undefined} auth
                 * @memberof groupcall.ParticipantToParticipant.Handshake.AuthEnvelope
                 * @instance
                 */
                AuthEnvelope.prototype.auth = null;

                /**
                 * AuthEnvelope guestAuth.
                 * @member {groupcall.ParticipantToParticipant.Handshake.GuestAuth|null|undefined} guestAuth
                 * @memberof groupcall.ParticipantToParticipant.Handshake.AuthEnvelope
                 * @instance
                 */
                AuthEnvelope.prototype.guestAuth = null;

                // OneOf field names bound to virtual getters and setters
                let $oneOfFields;

                /**
                 * AuthEnvelope content.
                 * @member {"auth"|"guestAuth"|undefined} content
                 * @memberof groupcall.ParticipantToParticipant.Handshake.AuthEnvelope
                 * @instance
                 */
                Object.defineProperty(AuthEnvelope.prototype, "content", {
                    get: $util.oneOfGetter($oneOfFields = ["auth", "guestAuth"]),
                    set: $util.oneOfSetter($oneOfFields)
                });

                /**
                 * Encodes the specified AuthEnvelope message. Does not implicitly {@link groupcall.ParticipantToParticipant.Handshake.AuthEnvelope.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToParticipant.Handshake.AuthEnvelope
                 * @static
                 * @param {groupcall.ParticipantToParticipant.Handshake.AuthEnvelope} message AuthEnvelope message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                AuthEnvelope.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.padding != null && Object.hasOwnProperty.call(message, "padding"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.padding);
                    if (message.auth != null && Object.hasOwnProperty.call(message, "auth"))
                        $root.groupcall.ParticipantToParticipant.Handshake.Auth.encode(message.auth, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                    if (message.guestAuth != null && Object.hasOwnProperty.call(message, "guestAuth"))
                        $root.groupcall.ParticipantToParticipant.Handshake.GuestAuth.encode(message.guestAuth, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                    return writer;
                };

                /**
                 * Decodes an AuthEnvelope message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToParticipant.Handshake.AuthEnvelope
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToParticipant.Handshake.AuthEnvelope} AuthEnvelope
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                AuthEnvelope.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.Handshake.AuthEnvelope();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.padding = reader.bytes();
                                break;
                            }
                        case 2: {
                                message.auth = $root.groupcall.ParticipantToParticipant.Handshake.Auth.decode(reader, reader.uint32());
                                break;
                            }
                        case 3: {
                                message.guestAuth = $root.groupcall.ParticipantToParticipant.Handshake.GuestAuth.decode(reader, reader.uint32());
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return AuthEnvelope;
            })();

            Handshake.Hello = (function() {

                /**
                 * Properties of a Hello.
                 * @memberof groupcall.ParticipantToParticipant.Handshake
                 * @interface IHello
                 * @property {string|null} [identity] Hello identity
                 * @property {string|null} [nickname] Hello nickname
                 * @property {Uint8Array|null} [pck] Hello pck
                 * @property {Uint8Array|null} [pcck] Hello pcck
                 */

                /**
                 * Constructs a new Hello.
                 * @memberof groupcall.ParticipantToParticipant.Handshake
                 * @classdesc Represents a Hello.
                 * @implements IHello
                 * @constructor
                 * @param {groupcall.ParticipantToParticipant.Handshake.IHello=} [properties] Properties to set
                 */
                function Hello(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Hello identity.
                 * @member {string} identity
                 * @memberof groupcall.ParticipantToParticipant.Handshake.Hello
                 * @instance
                 */
                Hello.prototype.identity = "";

                /**
                 * Hello nickname.
                 * @member {string} nickname
                 * @memberof groupcall.ParticipantToParticipant.Handshake.Hello
                 * @instance
                 */
                Hello.prototype.nickname = "";

                /**
                 * Hello pck.
                 * @member {Uint8Array} pck
                 * @memberof groupcall.ParticipantToParticipant.Handshake.Hello
                 * @instance
                 */
                Hello.prototype.pck = $util.newBuffer([]);

                /**
                 * Hello pcck.
                 * @member {Uint8Array} pcck
                 * @memberof groupcall.ParticipantToParticipant.Handshake.Hello
                 * @instance
                 */
                Hello.prototype.pcck = $util.newBuffer([]);

                /**
                 * Encodes the specified Hello message. Does not implicitly {@link groupcall.ParticipantToParticipant.Handshake.Hello.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToParticipant.Handshake.Hello
                 * @static
                 * @param {groupcall.ParticipantToParticipant.Handshake.Hello} message Hello message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Hello.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.identity != null && Object.hasOwnProperty.call(message, "identity"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.identity);
                    if (message.nickname != null && Object.hasOwnProperty.call(message, "nickname"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.nickname);
                    if (message.pck != null && Object.hasOwnProperty.call(message, "pck"))
                        writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.pck);
                    if (message.pcck != null && Object.hasOwnProperty.call(message, "pcck"))
                        writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.pcck);
                    return writer;
                };

                /**
                 * Decodes a Hello message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToParticipant.Handshake.Hello
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToParticipant.Handshake.Hello} Hello
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Hello.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.Handshake.Hello();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.identity = reader.string();
                                break;
                            }
                        case 2: {
                                message.nickname = reader.string();
                                break;
                            }
                        case 3: {
                                message.pck = reader.bytes();
                                break;
                            }
                        case 4: {
                                message.pcck = reader.bytes();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Hello;
            })();

            Handshake.Auth = (function() {

                /**
                 * Properties of an Auth.
                 * @memberof groupcall.ParticipantToParticipant.Handshake
                 * @interface IAuth
                 * @property {Uint8Array|null} [pck] Auth pck
                 * @property {Uint8Array|null} [pcck] Auth pcck
                 * @property {Array.<groupcall.ParticipantToParticipant.MediaKey>|null} [mediaKeys] Auth mediaKeys
                 */

                /**
                 * Constructs a new Auth.
                 * @memberof groupcall.ParticipantToParticipant.Handshake
                 * @classdesc Represents an Auth.
                 * @implements IAuth
                 * @constructor
                 * @param {groupcall.ParticipantToParticipant.Handshake.IAuth=} [properties] Properties to set
                 */
                function Auth(properties) {
                    this.mediaKeys = [];
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Auth pck.
                 * @member {Uint8Array} pck
                 * @memberof groupcall.ParticipantToParticipant.Handshake.Auth
                 * @instance
                 */
                Auth.prototype.pck = $util.newBuffer([]);

                /**
                 * Auth pcck.
                 * @member {Uint8Array} pcck
                 * @memberof groupcall.ParticipantToParticipant.Handshake.Auth
                 * @instance
                 */
                Auth.prototype.pcck = $util.newBuffer([]);

                /**
                 * Auth mediaKeys.
                 * @member {Array.<groupcall.ParticipantToParticipant.MediaKey>} mediaKeys
                 * @memberof groupcall.ParticipantToParticipant.Handshake.Auth
                 * @instance
                 */
                Auth.prototype.mediaKeys = $util.emptyArray;

                /**
                 * Encodes the specified Auth message. Does not implicitly {@link groupcall.ParticipantToParticipant.Handshake.Auth.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToParticipant.Handshake.Auth
                 * @static
                 * @param {groupcall.ParticipantToParticipant.Handshake.Auth} message Auth message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Auth.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.pck != null && Object.hasOwnProperty.call(message, "pck"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.pck);
                    if (message.pcck != null && Object.hasOwnProperty.call(message, "pcck"))
                        writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.pcck);
                    if (message.mediaKeys != null && message.mediaKeys.length)
                        for (let i = 0; i < message.mediaKeys.length; ++i)
                            $root.groupcall.ParticipantToParticipant.MediaKey.encode(message.mediaKeys[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                    return writer;
                };

                /**
                 * Decodes an Auth message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToParticipant.Handshake.Auth
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToParticipant.Handshake.Auth} Auth
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Auth.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.Handshake.Auth();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.pck = reader.bytes();
                                break;
                            }
                        case 2: {
                                message.pcck = reader.bytes();
                                break;
                            }
                        case 3: {
                                if (!(message.mediaKeys && message.mediaKeys.length))
                                    message.mediaKeys = [];
                                message.mediaKeys.push($root.groupcall.ParticipantToParticipant.MediaKey.decode(reader, reader.uint32()));
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Auth;
            })();

            Handshake.GuestHello = (function() {

                /**
                 * Properties of a GuestHello.
                 * @memberof groupcall.ParticipantToParticipant.Handshake
                 * @interface IGuestHello
                 * @property {string|null} [name] GuestHello name
                 * @property {Uint8Array|null} [pck] GuestHello pck
                 * @property {Uint8Array|null} [pcck] GuestHello pcck
                 */

                /**
                 * Constructs a new GuestHello.
                 * @memberof groupcall.ParticipantToParticipant.Handshake
                 * @classdesc Represents a GuestHello.
                 * @implements IGuestHello
                 * @constructor
                 * @param {groupcall.ParticipantToParticipant.Handshake.IGuestHello=} [properties] Properties to set
                 */
                function GuestHello(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * GuestHello name.
                 * @member {string} name
                 * @memberof groupcall.ParticipantToParticipant.Handshake.GuestHello
                 * @instance
                 */
                GuestHello.prototype.name = "";

                /**
                 * GuestHello pck.
                 * @member {Uint8Array} pck
                 * @memberof groupcall.ParticipantToParticipant.Handshake.GuestHello
                 * @instance
                 */
                GuestHello.prototype.pck = $util.newBuffer([]);

                /**
                 * GuestHello pcck.
                 * @member {Uint8Array} pcck
                 * @memberof groupcall.ParticipantToParticipant.Handshake.GuestHello
                 * @instance
                 */
                GuestHello.prototype.pcck = $util.newBuffer([]);

                /**
                 * Encodes the specified GuestHello message. Does not implicitly {@link groupcall.ParticipantToParticipant.Handshake.GuestHello.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToParticipant.Handshake.GuestHello
                 * @static
                 * @param {groupcall.ParticipantToParticipant.Handshake.GuestHello} message GuestHello message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                GuestHello.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.name);
                    if (message.pck != null && Object.hasOwnProperty.call(message, "pck"))
                        writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.pck);
                    if (message.pcck != null && Object.hasOwnProperty.call(message, "pcck"))
                        writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.pcck);
                    return writer;
                };

                /**
                 * Decodes a GuestHello message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToParticipant.Handshake.GuestHello
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToParticipant.Handshake.GuestHello} GuestHello
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                GuestHello.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.Handshake.GuestHello();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.name = reader.string();
                                break;
                            }
                        case 2: {
                                message.pck = reader.bytes();
                                break;
                            }
                        case 3: {
                                message.pcck = reader.bytes();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return GuestHello;
            })();

            Handshake.GuestAuth = (function() {

                /**
                 * Properties of a GuestAuth.
                 * @memberof groupcall.ParticipantToParticipant.Handshake
                 * @interface IGuestAuth
                 * @property {Uint8Array|null} [pck] GuestAuth pck
                 * @property {Uint8Array|null} [pcck] GuestAuth pcck
                 * @property {Array.<groupcall.ParticipantToParticipant.MediaKey>|null} [mediaKeys] GuestAuth mediaKeys
                 */

                /**
                 * Constructs a new GuestAuth.
                 * @memberof groupcall.ParticipantToParticipant.Handshake
                 * @classdesc Represents a GuestAuth.
                 * @implements IGuestAuth
                 * @constructor
                 * @param {groupcall.ParticipantToParticipant.Handshake.IGuestAuth=} [properties] Properties to set
                 */
                function GuestAuth(properties) {
                    this.mediaKeys = [];
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * GuestAuth pck.
                 * @member {Uint8Array} pck
                 * @memberof groupcall.ParticipantToParticipant.Handshake.GuestAuth
                 * @instance
                 */
                GuestAuth.prototype.pck = $util.newBuffer([]);

                /**
                 * GuestAuth pcck.
                 * @member {Uint8Array} pcck
                 * @memberof groupcall.ParticipantToParticipant.Handshake.GuestAuth
                 * @instance
                 */
                GuestAuth.prototype.pcck = $util.newBuffer([]);

                /**
                 * GuestAuth mediaKeys.
                 * @member {Array.<groupcall.ParticipantToParticipant.MediaKey>} mediaKeys
                 * @memberof groupcall.ParticipantToParticipant.Handshake.GuestAuth
                 * @instance
                 */
                GuestAuth.prototype.mediaKeys = $util.emptyArray;

                /**
                 * Encodes the specified GuestAuth message. Does not implicitly {@link groupcall.ParticipantToParticipant.Handshake.GuestAuth.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToParticipant.Handshake.GuestAuth
                 * @static
                 * @param {groupcall.ParticipantToParticipant.Handshake.GuestAuth} message GuestAuth message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                GuestAuth.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.pck != null && Object.hasOwnProperty.call(message, "pck"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.pck);
                    if (message.pcck != null && Object.hasOwnProperty.call(message, "pcck"))
                        writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.pcck);
                    if (message.mediaKeys != null && message.mediaKeys.length)
                        for (let i = 0; i < message.mediaKeys.length; ++i)
                            $root.groupcall.ParticipantToParticipant.MediaKey.encode(message.mediaKeys[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                    return writer;
                };

                /**
                 * Decodes a GuestAuth message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToParticipant.Handshake.GuestAuth
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToParticipant.Handshake.GuestAuth} GuestAuth
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                GuestAuth.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.Handshake.GuestAuth();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.pck = reader.bytes();
                                break;
                            }
                        case 2: {
                                message.pcck = reader.bytes();
                                break;
                            }
                        case 3: {
                                if (!(message.mediaKeys && message.mediaKeys.length))
                                    message.mediaKeys = [];
                                message.mediaKeys.push($root.groupcall.ParticipantToParticipant.MediaKey.decode(reader, reader.uint32()));
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return GuestAuth;
            })();

            return Handshake;
        })();

        ParticipantToParticipant.Envelope = (function() {

            /**
             * Properties of an Envelope.
             * @memberof groupcall.ParticipantToParticipant
             * @interface IEnvelope
             * @property {Uint8Array|null} [padding] Envelope padding
             * @property {Uint8Array|null} [encryptedAdminEnvelope] Envelope encryptedAdminEnvelope
             * @property {groupcall.ParticipantToParticipant.MediaKey|null} [rekey] Envelope rekey
             * @property {groupcall.ParticipantToParticipant.CaptureState|null} [captureState] Envelope captureState
             * @property {groupcall.ParticipantToParticipant.HoldState|null} [holdState] Envelope holdState
             */

            /**
             * Constructs a new Envelope.
             * @memberof groupcall.ParticipantToParticipant
             * @classdesc Represents an Envelope.
             * @implements IEnvelope
             * @constructor
             * @param {groupcall.ParticipantToParticipant.IEnvelope=} [properties] Properties to set
             */
            function Envelope(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Envelope padding.
             * @member {Uint8Array} padding
             * @memberof groupcall.ParticipantToParticipant.Envelope
             * @instance
             */
            Envelope.prototype.padding = $util.newBuffer([]);

            /**
             * Envelope encryptedAdminEnvelope.
             * @member {Uint8Array|null|undefined} encryptedAdminEnvelope
             * @memberof groupcall.ParticipantToParticipant.Envelope
             * @instance
             */
            Envelope.prototype.encryptedAdminEnvelope = null;

            /**
             * Envelope rekey.
             * @member {groupcall.ParticipantToParticipant.MediaKey|null|undefined} rekey
             * @memberof groupcall.ParticipantToParticipant.Envelope
             * @instance
             */
            Envelope.prototype.rekey = null;

            /**
             * Envelope captureState.
             * @member {groupcall.ParticipantToParticipant.CaptureState|null|undefined} captureState
             * @memberof groupcall.ParticipantToParticipant.Envelope
             * @instance
             */
            Envelope.prototype.captureState = null;

            /**
             * Envelope holdState.
             * @member {groupcall.ParticipantToParticipant.HoldState|null|undefined} holdState
             * @memberof groupcall.ParticipantToParticipant.Envelope
             * @instance
             */
            Envelope.prototype.holdState = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * Envelope content.
             * @member {"encryptedAdminEnvelope"|"rekey"|"captureState"|"holdState"|undefined} content
             * @memberof groupcall.ParticipantToParticipant.Envelope
             * @instance
             */
            Object.defineProperty(Envelope.prototype, "content", {
                get: $util.oneOfGetter($oneOfFields = ["encryptedAdminEnvelope", "rekey", "captureState", "holdState"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified Envelope message. Does not implicitly {@link groupcall.ParticipantToParticipant.Envelope.verify|verify} messages.
             * @function encode
             * @memberof groupcall.ParticipantToParticipant.Envelope
             * @static
             * @param {groupcall.ParticipantToParticipant.Envelope} message Envelope message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Envelope.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.padding != null && Object.hasOwnProperty.call(message, "padding"))
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.padding);
                if (message.encryptedAdminEnvelope != null && Object.hasOwnProperty.call(message, "encryptedAdminEnvelope"))
                    writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.encryptedAdminEnvelope);
                if (message.rekey != null && Object.hasOwnProperty.call(message, "rekey"))
                    $root.groupcall.ParticipantToParticipant.MediaKey.encode(message.rekey, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                if (message.captureState != null && Object.hasOwnProperty.call(message, "captureState"))
                    $root.groupcall.ParticipantToParticipant.CaptureState.encode(message.captureState, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                if (message.holdState != null && Object.hasOwnProperty.call(message, "holdState"))
                    $root.groupcall.ParticipantToParticipant.HoldState.encode(message.holdState, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes an Envelope message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.ParticipantToParticipant.Envelope
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.ParticipantToParticipant.Envelope} Envelope
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Envelope.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.Envelope();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.padding = reader.bytes();
                            break;
                        }
                    case 2: {
                            message.encryptedAdminEnvelope = reader.bytes();
                            break;
                        }
                    case 3: {
                            message.rekey = $root.groupcall.ParticipantToParticipant.MediaKey.decode(reader, reader.uint32());
                            break;
                        }
                    case 4: {
                            message.captureState = $root.groupcall.ParticipantToParticipant.CaptureState.decode(reader, reader.uint32());
                            break;
                        }
                    case 5: {
                            message.holdState = $root.groupcall.ParticipantToParticipant.HoldState.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Envelope;
        })();

        ParticipantToParticipant.Admin = (function() {

            /**
             * Properties of an Admin.
             * @memberof groupcall.ParticipantToParticipant
             * @interface IAdmin
             */

            /**
             * Constructs a new Admin.
             * @memberof groupcall.ParticipantToParticipant
             * @classdesc Represents an Admin.
             * @implements IAdmin
             * @constructor
             * @param {groupcall.ParticipantToParticipant.IAdmin=} [properties] Properties to set
             */
            function Admin(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Encodes the specified Admin message. Does not implicitly {@link groupcall.ParticipantToParticipant.Admin.verify|verify} messages.
             * @function encode
             * @memberof groupcall.ParticipantToParticipant.Admin
             * @static
             * @param {groupcall.ParticipantToParticipant.Admin} message Admin message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Admin.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Decodes an Admin message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.ParticipantToParticipant.Admin
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.ParticipantToParticipant.Admin} Admin
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Admin.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.Admin();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            Admin.Envelope = (function() {

                /**
                 * Properties of an Envelope.
                 * @memberof groupcall.ParticipantToParticipant.Admin
                 * @interface IEnvelope
                 * @property {groupcall.ParticipantToParticipant.Admin.ReportAsAdmin|null} [reportAsAdmin] Envelope reportAsAdmin
                 * @property {groupcall.ParticipantToParticipant.Admin.PromoteToAdmin|null} [promoteToAdmin] Envelope promoteToAdmin
                 * @property {groupcall.ParticipantToParticipant.Admin.ForceLeave|null} [forceLeave] Envelope forceLeave
                 * @property {groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff|null} [forceCaptureStateOff] Envelope forceCaptureStateOff
                 * @property {groupcall.ParticipantToParticipant.Admin.ForceFocus|null} [forceFocus] Envelope forceFocus
                 */

                /**
                 * Constructs a new Envelope.
                 * @memberof groupcall.ParticipantToParticipant.Admin
                 * @classdesc Represents an Envelope.
                 * @implements IEnvelope
                 * @constructor
                 * @param {groupcall.ParticipantToParticipant.Admin.IEnvelope=} [properties] Properties to set
                 */
                function Envelope(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Envelope reportAsAdmin.
                 * @member {groupcall.ParticipantToParticipant.Admin.ReportAsAdmin|null|undefined} reportAsAdmin
                 * @memberof groupcall.ParticipantToParticipant.Admin.Envelope
                 * @instance
                 */
                Envelope.prototype.reportAsAdmin = null;

                /**
                 * Envelope promoteToAdmin.
                 * @member {groupcall.ParticipantToParticipant.Admin.PromoteToAdmin|null|undefined} promoteToAdmin
                 * @memberof groupcall.ParticipantToParticipant.Admin.Envelope
                 * @instance
                 */
                Envelope.prototype.promoteToAdmin = null;

                /**
                 * Envelope forceLeave.
                 * @member {groupcall.ParticipantToParticipant.Admin.ForceLeave|null|undefined} forceLeave
                 * @memberof groupcall.ParticipantToParticipant.Admin.Envelope
                 * @instance
                 */
                Envelope.prototype.forceLeave = null;

                /**
                 * Envelope forceCaptureStateOff.
                 * @member {groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff|null|undefined} forceCaptureStateOff
                 * @memberof groupcall.ParticipantToParticipant.Admin.Envelope
                 * @instance
                 */
                Envelope.prototype.forceCaptureStateOff = null;

                /**
                 * Envelope forceFocus.
                 * @member {groupcall.ParticipantToParticipant.Admin.ForceFocus|null|undefined} forceFocus
                 * @memberof groupcall.ParticipantToParticipant.Admin.Envelope
                 * @instance
                 */
                Envelope.prototype.forceFocus = null;

                // OneOf field names bound to virtual getters and setters
                let $oneOfFields;

                /**
                 * Envelope content.
                 * @member {"reportAsAdmin"|"promoteToAdmin"|"forceLeave"|"forceCaptureStateOff"|"forceFocus"|undefined} content
                 * @memberof groupcall.ParticipantToParticipant.Admin.Envelope
                 * @instance
                 */
                Object.defineProperty(Envelope.prototype, "content", {
                    get: $util.oneOfGetter($oneOfFields = ["reportAsAdmin", "promoteToAdmin", "forceLeave", "forceCaptureStateOff", "forceFocus"]),
                    set: $util.oneOfSetter($oneOfFields)
                });

                /**
                 * Encodes the specified Envelope message. Does not implicitly {@link groupcall.ParticipantToParticipant.Admin.Envelope.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToParticipant.Admin.Envelope
                 * @static
                 * @param {groupcall.ParticipantToParticipant.Admin.Envelope} message Envelope message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Envelope.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.reportAsAdmin != null && Object.hasOwnProperty.call(message, "reportAsAdmin"))
                        $root.groupcall.ParticipantToParticipant.Admin.ReportAsAdmin.encode(message.reportAsAdmin, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                    if (message.promoteToAdmin != null && Object.hasOwnProperty.call(message, "promoteToAdmin"))
                        $root.groupcall.ParticipantToParticipant.Admin.PromoteToAdmin.encode(message.promoteToAdmin, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                    if (message.forceLeave != null && Object.hasOwnProperty.call(message, "forceLeave"))
                        $root.groupcall.ParticipantToParticipant.Admin.ForceLeave.encode(message.forceLeave, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                    if (message.forceCaptureStateOff != null && Object.hasOwnProperty.call(message, "forceCaptureStateOff"))
                        $root.groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff.encode(message.forceCaptureStateOff, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
                    if (message.forceFocus != null && Object.hasOwnProperty.call(message, "forceFocus"))
                        $root.groupcall.ParticipantToParticipant.Admin.ForceFocus.encode(message.forceFocus, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
                    return writer;
                };

                /**
                 * Decodes an Envelope message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToParticipant.Admin.Envelope
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToParticipant.Admin.Envelope} Envelope
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Envelope.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.Admin.Envelope();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.reportAsAdmin = $root.groupcall.ParticipantToParticipant.Admin.ReportAsAdmin.decode(reader, reader.uint32());
                                break;
                            }
                        case 2: {
                                message.promoteToAdmin = $root.groupcall.ParticipantToParticipant.Admin.PromoteToAdmin.decode(reader, reader.uint32());
                                break;
                            }
                        case 3: {
                                message.forceLeave = $root.groupcall.ParticipantToParticipant.Admin.ForceLeave.decode(reader, reader.uint32());
                                break;
                            }
                        case 4: {
                                message.forceCaptureStateOff = $root.groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff.decode(reader, reader.uint32());
                                break;
                            }
                        case 5: {
                                message.forceFocus = $root.groupcall.ParticipantToParticipant.Admin.ForceFocus.decode(reader, reader.uint32());
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Envelope;
            })();

            Admin.ReportAsAdmin = (function() {

                /**
                 * Properties of a ReportAsAdmin.
                 * @memberof groupcall.ParticipantToParticipant.Admin
                 * @interface IReportAsAdmin
                 */

                /**
                 * Constructs a new ReportAsAdmin.
                 * @memberof groupcall.ParticipantToParticipant.Admin
                 * @classdesc Represents a ReportAsAdmin.
                 * @implements IReportAsAdmin
                 * @constructor
                 * @param {groupcall.ParticipantToParticipant.Admin.IReportAsAdmin=} [properties] Properties to set
                 */
                function ReportAsAdmin(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Encodes the specified ReportAsAdmin message. Does not implicitly {@link groupcall.ParticipantToParticipant.Admin.ReportAsAdmin.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToParticipant.Admin.ReportAsAdmin
                 * @static
                 * @param {groupcall.ParticipantToParticipant.Admin.ReportAsAdmin} message ReportAsAdmin message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ReportAsAdmin.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    return writer;
                };

                /**
                 * Decodes a ReportAsAdmin message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToParticipant.Admin.ReportAsAdmin
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToParticipant.Admin.ReportAsAdmin} ReportAsAdmin
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ReportAsAdmin.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.Admin.ReportAsAdmin();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return ReportAsAdmin;
            })();

            Admin.PromoteToAdmin = (function() {

                /**
                 * Properties of a PromoteToAdmin.
                 * @memberof groupcall.ParticipantToParticipant.Admin
                 * @interface IPromoteToAdmin
                 * @property {Uint8Array|null} [gcak] PromoteToAdmin gcak
                 */

                /**
                 * Constructs a new PromoteToAdmin.
                 * @memberof groupcall.ParticipantToParticipant.Admin
                 * @classdesc Represents a PromoteToAdmin.
                 * @implements IPromoteToAdmin
                 * @constructor
                 * @param {groupcall.ParticipantToParticipant.Admin.IPromoteToAdmin=} [properties] Properties to set
                 */
                function PromoteToAdmin(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * PromoteToAdmin gcak.
                 * @member {Uint8Array} gcak
                 * @memberof groupcall.ParticipantToParticipant.Admin.PromoteToAdmin
                 * @instance
                 */
                PromoteToAdmin.prototype.gcak = $util.newBuffer([]);

                /**
                 * Encodes the specified PromoteToAdmin message. Does not implicitly {@link groupcall.ParticipantToParticipant.Admin.PromoteToAdmin.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToParticipant.Admin.PromoteToAdmin
                 * @static
                 * @param {groupcall.ParticipantToParticipant.Admin.PromoteToAdmin} message PromoteToAdmin message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                PromoteToAdmin.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.gcak != null && Object.hasOwnProperty.call(message, "gcak"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.gcak);
                    return writer;
                };

                /**
                 * Decodes a PromoteToAdmin message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToParticipant.Admin.PromoteToAdmin
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToParticipant.Admin.PromoteToAdmin} PromoteToAdmin
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                PromoteToAdmin.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.Admin.PromoteToAdmin();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.gcak = reader.bytes();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return PromoteToAdmin;
            })();

            Admin.ForceLeave = (function() {

                /**
                 * Properties of a ForceLeave.
                 * @memberof groupcall.ParticipantToParticipant.Admin
                 * @interface IForceLeave
                 */

                /**
                 * Constructs a new ForceLeave.
                 * @memberof groupcall.ParticipantToParticipant.Admin
                 * @classdesc Represents a ForceLeave.
                 * @implements IForceLeave
                 * @constructor
                 * @param {groupcall.ParticipantToParticipant.Admin.IForceLeave=} [properties] Properties to set
                 */
                function ForceLeave(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Encodes the specified ForceLeave message. Does not implicitly {@link groupcall.ParticipantToParticipant.Admin.ForceLeave.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToParticipant.Admin.ForceLeave
                 * @static
                 * @param {groupcall.ParticipantToParticipant.Admin.ForceLeave} message ForceLeave message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ForceLeave.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    return writer;
                };

                /**
                 * Decodes a ForceLeave message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToParticipant.Admin.ForceLeave
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToParticipant.Admin.ForceLeave} ForceLeave
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ForceLeave.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.Admin.ForceLeave();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return ForceLeave;
            })();

            Admin.ForceCaptureStateOff = (function() {

                /**
                 * Properties of a ForceCaptureStateOff.
                 * @memberof groupcall.ParticipantToParticipant.Admin
                 * @interface IForceCaptureStateOff
                 * @property {groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff.Device|null} [device] ForceCaptureStateOff device
                 */

                /**
                 * Constructs a new ForceCaptureStateOff.
                 * @memberof groupcall.ParticipantToParticipant.Admin
                 * @classdesc Represents a ForceCaptureStateOff.
                 * @implements IForceCaptureStateOff
                 * @constructor
                 * @param {groupcall.ParticipantToParticipant.Admin.IForceCaptureStateOff=} [properties] Properties to set
                 */
                function ForceCaptureStateOff(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * ForceCaptureStateOff device.
                 * @member {groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff.Device} device
                 * @memberof groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff
                 * @instance
                 */
                ForceCaptureStateOff.prototype.device = 0;

                /**
                 * Encodes the specified ForceCaptureStateOff message. Does not implicitly {@link groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff
                 * @static
                 * @param {groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff} message ForceCaptureStateOff message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ForceCaptureStateOff.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.device != null && Object.hasOwnProperty.call(message, "device"))
                        writer.uint32(/* id 1, wireType 0 =*/8).int32(message.device);
                    return writer;
                };

                /**
                 * Decodes a ForceCaptureStateOff message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff} ForceCaptureStateOff
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ForceCaptureStateOff.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.device = reader.int32();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * Device enum.
                 * @name groupcall.ParticipantToParticipant.Admin.ForceCaptureStateOff.Device
                 * @enum {number}
                 * @property {number} ALL=0 ALL value
                 * @property {number} MICROPHONE=1 MICROPHONE value
                 * @property {number} CAMERA=2 CAMERA value
                 * @property {number} SCREEN=3 SCREEN value
                 */
                ForceCaptureStateOff.Device = (function() {
                    const valuesById = {}, values = Object.create(valuesById);
                    values[valuesById[0] = "ALL"] = 0;
                    values[valuesById[1] = "MICROPHONE"] = 1;
                    values[valuesById[2] = "CAMERA"] = 2;
                    values[valuesById[3] = "SCREEN"] = 3;
                    return values;
                })();

                return ForceCaptureStateOff;
            })();

            Admin.ForceFocus = (function() {

                /**
                 * Properties of a ForceFocus.
                 * @memberof groupcall.ParticipantToParticipant.Admin
                 * @interface IForceFocus
                 * @property {number|null} [participantId] ForceFocus participantId
                 */

                /**
                 * Constructs a new ForceFocus.
                 * @memberof groupcall.ParticipantToParticipant.Admin
                 * @classdesc Represents a ForceFocus.
                 * @implements IForceFocus
                 * @constructor
                 * @param {groupcall.ParticipantToParticipant.Admin.IForceFocus=} [properties] Properties to set
                 */
                function ForceFocus(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * ForceFocus participantId.
                 * @member {number} participantId
                 * @memberof groupcall.ParticipantToParticipant.Admin.ForceFocus
                 * @instance
                 */
                ForceFocus.prototype.participantId = 0;

                /**
                 * Encodes the specified ForceFocus message. Does not implicitly {@link groupcall.ParticipantToParticipant.Admin.ForceFocus.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToParticipant.Admin.ForceFocus
                 * @static
                 * @param {groupcall.ParticipantToParticipant.Admin.ForceFocus} message ForceFocus message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                ForceFocus.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.participantId != null && Object.hasOwnProperty.call(message, "participantId"))
                        writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.participantId);
                    return writer;
                };

                /**
                 * Decodes a ForceFocus message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToParticipant.Admin.ForceFocus
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToParticipant.Admin.ForceFocus} ForceFocus
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                ForceFocus.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.Admin.ForceFocus();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.participantId = reader.uint32();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return ForceFocus;
            })();

            return Admin;
        })();

        ParticipantToParticipant.MediaKey = (function() {

            /**
             * Properties of a MediaKey.
             * @memberof groupcall.ParticipantToParticipant
             * @interface IMediaKey
             * @property {number|null} [epoch] MediaKey epoch
             * @property {number|null} [ratchetCounter] MediaKey ratchetCounter
             * @property {Uint8Array|null} [pcmk] MediaKey pcmk
             */

            /**
             * Constructs a new MediaKey.
             * @memberof groupcall.ParticipantToParticipant
             * @classdesc Represents a MediaKey.
             * @implements IMediaKey
             * @constructor
             * @param {groupcall.ParticipantToParticipant.IMediaKey=} [properties] Properties to set
             */
            function MediaKey(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * MediaKey epoch.
             * @member {number} epoch
             * @memberof groupcall.ParticipantToParticipant.MediaKey
             * @instance
             */
            MediaKey.prototype.epoch = 0;

            /**
             * MediaKey ratchetCounter.
             * @member {number} ratchetCounter
             * @memberof groupcall.ParticipantToParticipant.MediaKey
             * @instance
             */
            MediaKey.prototype.ratchetCounter = 0;

            /**
             * MediaKey pcmk.
             * @member {Uint8Array} pcmk
             * @memberof groupcall.ParticipantToParticipant.MediaKey
             * @instance
             */
            MediaKey.prototype.pcmk = $util.newBuffer([]);

            /**
             * Encodes the specified MediaKey message. Does not implicitly {@link groupcall.ParticipantToParticipant.MediaKey.verify|verify} messages.
             * @function encode
             * @memberof groupcall.ParticipantToParticipant.MediaKey
             * @static
             * @param {groupcall.ParticipantToParticipant.MediaKey} message MediaKey message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            MediaKey.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.epoch != null && Object.hasOwnProperty.call(message, "epoch"))
                    writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.epoch);
                if (message.ratchetCounter != null && Object.hasOwnProperty.call(message, "ratchetCounter"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.ratchetCounter);
                if (message.pcmk != null && Object.hasOwnProperty.call(message, "pcmk"))
                    writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.pcmk);
                return writer;
            };

            /**
             * Decodes a MediaKey message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.ParticipantToParticipant.MediaKey
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.ParticipantToParticipant.MediaKey} MediaKey
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            MediaKey.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.MediaKey();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.epoch = reader.uint32();
                            break;
                        }
                    case 2: {
                            message.ratchetCounter = reader.uint32();
                            break;
                        }
                    case 3: {
                            message.pcmk = reader.bytes();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return MediaKey;
        })();

        ParticipantToParticipant.CaptureState = (function() {

            /**
             * Properties of a CaptureState.
             * @memberof groupcall.ParticipantToParticipant
             * @interface ICaptureState
             * @property {groupcall.ParticipantToParticipant.CaptureState.Microphone|null} [microphone] CaptureState microphone
             * @property {groupcall.ParticipantToParticipant.CaptureState.Camera|null} [camera] CaptureState camera
             */

            /**
             * Constructs a new CaptureState.
             * @memberof groupcall.ParticipantToParticipant
             * @classdesc Represents a CaptureState.
             * @implements ICaptureState
             * @constructor
             * @param {groupcall.ParticipantToParticipant.ICaptureState=} [properties] Properties to set
             */
            function CaptureState(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * CaptureState microphone.
             * @member {groupcall.ParticipantToParticipant.CaptureState.Microphone|null|undefined} microphone
             * @memberof groupcall.ParticipantToParticipant.CaptureState
             * @instance
             */
            CaptureState.prototype.microphone = null;

            /**
             * CaptureState camera.
             * @member {groupcall.ParticipantToParticipant.CaptureState.Camera|null|undefined} camera
             * @memberof groupcall.ParticipantToParticipant.CaptureState
             * @instance
             */
            CaptureState.prototype.camera = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * CaptureState state.
             * @member {"microphone"|"camera"|undefined} state
             * @memberof groupcall.ParticipantToParticipant.CaptureState
             * @instance
             */
            Object.defineProperty(CaptureState.prototype, "state", {
                get: $util.oneOfGetter($oneOfFields = ["microphone", "camera"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified CaptureState message. Does not implicitly {@link groupcall.ParticipantToParticipant.CaptureState.verify|verify} messages.
             * @function encode
             * @memberof groupcall.ParticipantToParticipant.CaptureState
             * @static
             * @param {groupcall.ParticipantToParticipant.CaptureState} message CaptureState message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            CaptureState.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.microphone != null && Object.hasOwnProperty.call(message, "microphone"))
                    $root.groupcall.ParticipantToParticipant.CaptureState.Microphone.encode(message.microphone, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.camera != null && Object.hasOwnProperty.call(message, "camera"))
                    $root.groupcall.ParticipantToParticipant.CaptureState.Camera.encode(message.camera, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes a CaptureState message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.ParticipantToParticipant.CaptureState
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.ParticipantToParticipant.CaptureState} CaptureState
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            CaptureState.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.CaptureState();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.microphone = $root.groupcall.ParticipantToParticipant.CaptureState.Microphone.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.camera = $root.groupcall.ParticipantToParticipant.CaptureState.Camera.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            CaptureState.Microphone = (function() {

                /**
                 * Properties of a Microphone.
                 * @memberof groupcall.ParticipantToParticipant.CaptureState
                 * @interface IMicrophone
                 * @property {common.Unit|null} [on] Microphone on
                 * @property {common.Unit|null} [off] Microphone off
                 */

                /**
                 * Constructs a new Microphone.
                 * @memberof groupcall.ParticipantToParticipant.CaptureState
                 * @classdesc Represents a Microphone.
                 * @implements IMicrophone
                 * @constructor
                 * @param {groupcall.ParticipantToParticipant.CaptureState.IMicrophone=} [properties] Properties to set
                 */
                function Microphone(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Microphone on.
                 * @member {common.Unit|null|undefined} on
                 * @memberof groupcall.ParticipantToParticipant.CaptureState.Microphone
                 * @instance
                 */
                Microphone.prototype.on = null;

                /**
                 * Microphone off.
                 * @member {common.Unit|null|undefined} off
                 * @memberof groupcall.ParticipantToParticipant.CaptureState.Microphone
                 * @instance
                 */
                Microphone.prototype.off = null;

                // OneOf field names bound to virtual getters and setters
                let $oneOfFields;

                /**
                 * Microphone state.
                 * @member {"on"|"off"|undefined} state
                 * @memberof groupcall.ParticipantToParticipant.CaptureState.Microphone
                 * @instance
                 */
                Object.defineProperty(Microphone.prototype, "state", {
                    get: $util.oneOfGetter($oneOfFields = ["on", "off"]),
                    set: $util.oneOfSetter($oneOfFields)
                });

                /**
                 * Encodes the specified Microphone message. Does not implicitly {@link groupcall.ParticipantToParticipant.CaptureState.Microphone.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToParticipant.CaptureState.Microphone
                 * @static
                 * @param {groupcall.ParticipantToParticipant.CaptureState.Microphone} message Microphone message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Microphone.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.on != null && Object.hasOwnProperty.call(message, "on"))
                        $root.common.Unit.encode(message.on, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                    if (message.off != null && Object.hasOwnProperty.call(message, "off"))
                        $root.common.Unit.encode(message.off, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                    return writer;
                };

                /**
                 * Decodes a Microphone message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToParticipant.CaptureState.Microphone
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToParticipant.CaptureState.Microphone} Microphone
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Microphone.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.CaptureState.Microphone();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.on = $root.common.Unit.decode(reader, reader.uint32());
                                break;
                            }
                        case 2: {
                                message.off = $root.common.Unit.decode(reader, reader.uint32());
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Microphone;
            })();

            CaptureState.Camera = (function() {

                /**
                 * Properties of a Camera.
                 * @memberof groupcall.ParticipantToParticipant.CaptureState
                 * @interface ICamera
                 * @property {common.Unit|null} [on] Camera on
                 * @property {common.Unit|null} [off] Camera off
                 */

                /**
                 * Constructs a new Camera.
                 * @memberof groupcall.ParticipantToParticipant.CaptureState
                 * @classdesc Represents a Camera.
                 * @implements ICamera
                 * @constructor
                 * @param {groupcall.ParticipantToParticipant.CaptureState.ICamera=} [properties] Properties to set
                 */
                function Camera(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Camera on.
                 * @member {common.Unit|null|undefined} on
                 * @memberof groupcall.ParticipantToParticipant.CaptureState.Camera
                 * @instance
                 */
                Camera.prototype.on = null;

                /**
                 * Camera off.
                 * @member {common.Unit|null|undefined} off
                 * @memberof groupcall.ParticipantToParticipant.CaptureState.Camera
                 * @instance
                 */
                Camera.prototype.off = null;

                // OneOf field names bound to virtual getters and setters
                let $oneOfFields;

                /**
                 * Camera state.
                 * @member {"on"|"off"|undefined} state
                 * @memberof groupcall.ParticipantToParticipant.CaptureState.Camera
                 * @instance
                 */
                Object.defineProperty(Camera.prototype, "state", {
                    get: $util.oneOfGetter($oneOfFields = ["on", "off"]),
                    set: $util.oneOfSetter($oneOfFields)
                });

                /**
                 * Encodes the specified Camera message. Does not implicitly {@link groupcall.ParticipantToParticipant.CaptureState.Camera.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToParticipant.CaptureState.Camera
                 * @static
                 * @param {groupcall.ParticipantToParticipant.CaptureState.Camera} message Camera message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Camera.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.on != null && Object.hasOwnProperty.call(message, "on"))
                        $root.common.Unit.encode(message.on, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                    if (message.off != null && Object.hasOwnProperty.call(message, "off"))
                        $root.common.Unit.encode(message.off, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                    return writer;
                };

                /**
                 * Decodes a Camera message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToParticipant.CaptureState.Camera
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToParticipant.CaptureState.Camera} Camera
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Camera.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.CaptureState.Camera();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.on = $root.common.Unit.decode(reader, reader.uint32());
                                break;
                            }
                        case 2: {
                                message.off = $root.common.Unit.decode(reader, reader.uint32());
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Camera;
            })();

            CaptureState.Screen = (function() {

                /**
                 * Properties of a Screen.
                 * @memberof groupcall.ParticipantToParticipant.CaptureState
                 * @interface IScreen
                 * @property {common.Unit|null} [on] Screen on
                 * @property {common.Unit|null} [off] Screen off
                 */

                /**
                 * Constructs a new Screen.
                 * @memberof groupcall.ParticipantToParticipant.CaptureState
                 * @classdesc Represents a Screen.
                 * @implements IScreen
                 * @constructor
                 * @param {groupcall.ParticipantToParticipant.CaptureState.IScreen=} [properties] Properties to set
                 */
                function Screen(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Screen on.
                 * @member {common.Unit|null|undefined} on
                 * @memberof groupcall.ParticipantToParticipant.CaptureState.Screen
                 * @instance
                 */
                Screen.prototype.on = null;

                /**
                 * Screen off.
                 * @member {common.Unit|null|undefined} off
                 * @memberof groupcall.ParticipantToParticipant.CaptureState.Screen
                 * @instance
                 */
                Screen.prototype.off = null;

                // OneOf field names bound to virtual getters and setters
                let $oneOfFields;

                /**
                 * Screen state.
                 * @member {"on"|"off"|undefined} state
                 * @memberof groupcall.ParticipantToParticipant.CaptureState.Screen
                 * @instance
                 */
                Object.defineProperty(Screen.prototype, "state", {
                    get: $util.oneOfGetter($oneOfFields = ["on", "off"]),
                    set: $util.oneOfSetter($oneOfFields)
                });

                /**
                 * Encodes the specified Screen message. Does not implicitly {@link groupcall.ParticipantToParticipant.CaptureState.Screen.verify|verify} messages.
                 * @function encode
                 * @memberof groupcall.ParticipantToParticipant.CaptureState.Screen
                 * @static
                 * @param {groupcall.ParticipantToParticipant.CaptureState.Screen} message Screen message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Screen.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.on != null && Object.hasOwnProperty.call(message, "on"))
                        $root.common.Unit.encode(message.on, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                    if (message.off != null && Object.hasOwnProperty.call(message, "off"))
                        $root.common.Unit.encode(message.off, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                    return writer;
                };

                /**
                 * Decodes a Screen message from the specified reader or buffer.
                 * @function decode
                 * @memberof groupcall.ParticipantToParticipant.CaptureState.Screen
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {groupcall.ParticipantToParticipant.CaptureState.Screen} Screen
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Screen.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.CaptureState.Screen();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.on = $root.common.Unit.decode(reader, reader.uint32());
                                break;
                            }
                        case 2: {
                                message.off = $root.common.Unit.decode(reader, reader.uint32());
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Screen;
            })();

            return CaptureState;
        })();

        ParticipantToParticipant.HoldState = (function() {

            /**
             * Properties of a HoldState.
             * @memberof groupcall.ParticipantToParticipant
             * @interface IHoldState
             */

            /**
             * Constructs a new HoldState.
             * @memberof groupcall.ParticipantToParticipant
             * @classdesc Represents a HoldState.
             * @implements IHoldState
             * @constructor
             * @param {groupcall.ParticipantToParticipant.IHoldState=} [properties] Properties to set
             */
            function HoldState(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Encodes the specified HoldState message. Does not implicitly {@link groupcall.ParticipantToParticipant.HoldState.verify|verify} messages.
             * @function encode
             * @memberof groupcall.ParticipantToParticipant.HoldState
             * @static
             * @param {groupcall.ParticipantToParticipant.HoldState} message HoldState message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            HoldState.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Decodes a HoldState message from the specified reader or buffer.
             * @function decode
             * @memberof groupcall.ParticipantToParticipant.HoldState
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {groupcall.ParticipantToParticipant.HoldState} HoldState
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            HoldState.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.groupcall.ParticipantToParticipant.HoldState();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return HoldState;
        })();

        return ParticipantToParticipant;
    })();

    return groupcall;
})();

export const history = $root.history = (() => {

    /**
     * Namespace history.
     * @exports history
     * @namespace
     */
    const history = {};

    history.DdToSd = (function() {

        /**
         * Properties of a DdToSd.
         * @memberof history
         * @interface IDdToSd
         * @property {history.GetSummary|null} [getSummary] DdToSd getSummary
         * @property {history.BeginTransfer|null} [beginTransfer] DdToSd beginTransfer
         */

        /**
         * Constructs a new DdToSd.
         * @memberof history
         * @classdesc Represents a DdToSd.
         * @implements IDdToSd
         * @constructor
         * @param {history.IDdToSd=} [properties] Properties to set
         */
        function DdToSd(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DdToSd getSummary.
         * @member {history.GetSummary|null|undefined} getSummary
         * @memberof history.DdToSd
         * @instance
         */
        DdToSd.prototype.getSummary = null;

        /**
         * DdToSd beginTransfer.
         * @member {history.BeginTransfer|null|undefined} beginTransfer
         * @memberof history.DdToSd
         * @instance
         */
        DdToSd.prototype.beginTransfer = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * DdToSd content.
         * @member {"getSummary"|"beginTransfer"|undefined} content
         * @memberof history.DdToSd
         * @instance
         */
        Object.defineProperty(DdToSd.prototype, "content", {
            get: $util.oneOfGetter($oneOfFields = ["getSummary", "beginTransfer"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified DdToSd message. Does not implicitly {@link history.DdToSd.verify|verify} messages.
         * @function encode
         * @memberof history.DdToSd
         * @static
         * @param {history.DdToSd} message DdToSd message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DdToSd.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.getSummary != null && Object.hasOwnProperty.call(message, "getSummary"))
                $root.history.GetSummary.encode(message.getSummary, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.beginTransfer != null && Object.hasOwnProperty.call(message, "beginTransfer"))
                $root.history.BeginTransfer.encode(message.beginTransfer, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a DdToSd message from the specified reader or buffer.
         * @function decode
         * @memberof history.DdToSd
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {history.DdToSd} DdToSd
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DdToSd.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.history.DdToSd();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.getSummary = $root.history.GetSummary.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.beginTransfer = $root.history.BeginTransfer.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return DdToSd;
    })();

    history.SdToDd = (function() {

        /**
         * Properties of a SdToDd.
         * @memberof history
         * @interface ISdToDd
         * @property {history.Summary|null} [summary] SdToDd summary
         * @property {common.BlobData|null} [blobData] SdToDd blobData
         * @property {history.Data|null} [data] SdToDd data
         */

        /**
         * Constructs a new SdToDd.
         * @memberof history
         * @classdesc Represents a SdToDd.
         * @implements ISdToDd
         * @constructor
         * @param {history.ISdToDd=} [properties] Properties to set
         */
        function SdToDd(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SdToDd summary.
         * @member {history.Summary|null|undefined} summary
         * @memberof history.SdToDd
         * @instance
         */
        SdToDd.prototype.summary = null;

        /**
         * SdToDd blobData.
         * @member {common.BlobData|null|undefined} blobData
         * @memberof history.SdToDd
         * @instance
         */
        SdToDd.prototype.blobData = null;

        /**
         * SdToDd data.
         * @member {history.Data|null|undefined} data
         * @memberof history.SdToDd
         * @instance
         */
        SdToDd.prototype.data = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * SdToDd content.
         * @member {"summary"|"blobData"|"data"|undefined} content
         * @memberof history.SdToDd
         * @instance
         */
        Object.defineProperty(SdToDd.prototype, "content", {
            get: $util.oneOfGetter($oneOfFields = ["summary", "blobData", "data"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified SdToDd message. Does not implicitly {@link history.SdToDd.verify|verify} messages.
         * @function encode
         * @memberof history.SdToDd
         * @static
         * @param {history.SdToDd} message SdToDd message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SdToDd.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.summary != null && Object.hasOwnProperty.call(message, "summary"))
                $root.history.Summary.encode(message.summary, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.blobData != null && Object.hasOwnProperty.call(message, "blobData"))
                $root.common.BlobData.encode(message.blobData, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                $root.history.Data.encode(message.data, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a SdToDd message from the specified reader or buffer.
         * @function decode
         * @memberof history.SdToDd
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {history.SdToDd} SdToDd
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SdToDd.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.history.SdToDd();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.summary = $root.history.Summary.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.blobData = $root.common.BlobData.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.data = $root.history.Data.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return SdToDd;
    })();

    /**
     * MediaType enum.
     * @name history.MediaType
     * @enum {number}
     * @property {number} ALL=0 ALL value
     */
    history.MediaType = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "ALL"] = 0;
        return values;
    })();

    history.GetSummary = (function() {

        /**
         * Properties of a GetSummary.
         * @memberof history
         * @interface IGetSummary
         * @property {number|null} [id] GetSummary id
         * @property {common.Timespan|null} [timespan] GetSummary timespan
         * @property {Array.<history.MediaType>|null} [media] GetSummary media
         */

        /**
         * Constructs a new GetSummary.
         * @memberof history
         * @classdesc Represents a GetSummary.
         * @implements IGetSummary
         * @constructor
         * @param {history.IGetSummary=} [properties] Properties to set
         */
        function GetSummary(properties) {
            this.media = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GetSummary id.
         * @member {number} id
         * @memberof history.GetSummary
         * @instance
         */
        GetSummary.prototype.id = 0;

        /**
         * GetSummary timespan.
         * @member {common.Timespan|null|undefined} timespan
         * @memberof history.GetSummary
         * @instance
         */
        GetSummary.prototype.timespan = null;

        /**
         * GetSummary media.
         * @member {Array.<history.MediaType>} media
         * @memberof history.GetSummary
         * @instance
         */
        GetSummary.prototype.media = $util.emptyArray;

        /**
         * Encodes the specified GetSummary message. Does not implicitly {@link history.GetSummary.verify|verify} messages.
         * @function encode
         * @memberof history.GetSummary
         * @static
         * @param {history.GetSummary} message GetSummary message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetSummary.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.id);
            if (message.timespan != null && Object.hasOwnProperty.call(message, "timespan"))
                $root.common.Timespan.encode(message.timespan, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.media != null && message.media.length) {
                writer.uint32(/* id 3, wireType 2 =*/26).fork();
                for (let i = 0; i < message.media.length; ++i)
                    writer.int32(message.media[i]);
                writer.ldelim();
            }
            return writer;
        };

        /**
         * Decodes a GetSummary message from the specified reader or buffer.
         * @function decode
         * @memberof history.GetSummary
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {history.GetSummary} GetSummary
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetSummary.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.history.GetSummary();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.uint32();
                        break;
                    }
                case 2: {
                        message.timespan = $root.common.Timespan.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        if (!(message.media && message.media.length))
                            message.media = [];
                        if ((tag & 7) === 2) {
                            let end2 = reader.uint32() + reader.pos;
                            while (reader.pos < end2)
                                message.media.push(reader.int32());
                        } else
                            message.media.push(reader.int32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return GetSummary;
    })();

    history.Summary = (function() {

        /**
         * Properties of a Summary.
         * @memberof history
         * @interface ISummary
         * @property {number|null} [id] Summary id
         * @property {number|null} [messages] Summary messages
         * @property {Long|null} [size] Summary size
         */

        /**
         * Constructs a new Summary.
         * @memberof history
         * @classdesc Represents a Summary.
         * @implements ISummary
         * @constructor
         * @param {history.ISummary=} [properties] Properties to set
         */
        function Summary(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Summary id.
         * @member {number} id
         * @memberof history.Summary
         * @instance
         */
        Summary.prototype.id = 0;

        /**
         * Summary messages.
         * @member {number} messages
         * @memberof history.Summary
         * @instance
         */
        Summary.prototype.messages = 0;

        /**
         * Summary size.
         * @member {Long} size
         * @memberof history.Summary
         * @instance
         */
        Summary.prototype.size = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Encodes the specified Summary message. Does not implicitly {@link history.Summary.verify|verify} messages.
         * @function encode
         * @memberof history.Summary
         * @static
         * @param {history.Summary} message Summary message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Summary.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.id);
            if (message.messages != null && Object.hasOwnProperty.call(message, "messages"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.messages);
            if (message.size != null && Object.hasOwnProperty.call(message, "size"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.size);
            return writer;
        };

        /**
         * Decodes a Summary message from the specified reader or buffer.
         * @function decode
         * @memberof history.Summary
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {history.Summary} Summary
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Summary.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.history.Summary();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.uint32();
                        break;
                    }
                case 2: {
                        message.messages = reader.uint32();
                        break;
                    }
                case 3: {
                        message.size = reader.uint64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return Summary;
    })();

    history.BeginTransfer = (function() {

        /**
         * Properties of a BeginTransfer.
         * @memberof history
         * @interface IBeginTransfer
         * @property {number|null} [id] BeginTransfer id
         */

        /**
         * Constructs a new BeginTransfer.
         * @memberof history
         * @classdesc Represents a BeginTransfer.
         * @implements IBeginTransfer
         * @constructor
         * @param {history.IBeginTransfer=} [properties] Properties to set
         */
        function BeginTransfer(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BeginTransfer id.
         * @member {number} id
         * @memberof history.BeginTransfer
         * @instance
         */
        BeginTransfer.prototype.id = 0;

        /**
         * Encodes the specified BeginTransfer message. Does not implicitly {@link history.BeginTransfer.verify|verify} messages.
         * @function encode
         * @memberof history.BeginTransfer
         * @static
         * @param {history.BeginTransfer} message BeginTransfer message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BeginTransfer.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.id);
            return writer;
        };

        /**
         * Decodes a BeginTransfer message from the specified reader or buffer.
         * @function decode
         * @memberof history.BeginTransfer
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {history.BeginTransfer} BeginTransfer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BeginTransfer.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.history.BeginTransfer();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return BeginTransfer;
    })();

    history.Data = (function() {

        /**
         * Properties of a Data.
         * @memberof history
         * @interface IData
         * @property {Array.<history.PastMessage>|null} [messages] Data messages
         * @property {Long|null} [remaining] Data remaining
         */

        /**
         * Constructs a new Data.
         * @memberof history
         * @classdesc Represents a Data.
         * @implements IData
         * @constructor
         * @param {history.IData=} [properties] Properties to set
         */
        function Data(properties) {
            this.messages = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Data messages.
         * @member {Array.<history.PastMessage>} messages
         * @memberof history.Data
         * @instance
         */
        Data.prototype.messages = $util.emptyArray;

        /**
         * Data remaining.
         * @member {Long} remaining
         * @memberof history.Data
         * @instance
         */
        Data.prototype.remaining = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Encodes the specified Data message. Does not implicitly {@link history.Data.verify|verify} messages.
         * @function encode
         * @memberof history.Data
         * @static
         * @param {history.Data} message Data message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Data.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.messages != null && message.messages.length)
                for (let i = 0; i < message.messages.length; ++i)
                    $root.history.PastMessage.encode(message.messages[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.remaining != null && Object.hasOwnProperty.call(message, "remaining"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.remaining);
            return writer;
        };

        /**
         * Decodes a Data message from the specified reader or buffer.
         * @function decode
         * @memberof history.Data
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {history.Data} Data
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Data.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.history.Data();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.messages && message.messages.length))
                            message.messages = [];
                        message.messages.push($root.history.PastMessage.decode(reader, reader.uint32()));
                        break;
                    }
                case 2: {
                        message.remaining = reader.uint64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return Data;
    })();

    history.PastMessage = (function() {

        /**
         * Properties of a PastMessage.
         * @memberof history
         * @interface IPastMessage
         * @property {history.PastIncomingMessage|null} [incoming] PastMessage incoming
         * @property {history.PastOutgoingMessage|null} [outgoing] PastMessage outgoing
         */

        /**
         * Constructs a new PastMessage.
         * @memberof history
         * @classdesc Represents a PastMessage.
         * @implements IPastMessage
         * @constructor
         * @param {history.IPastMessage=} [properties] Properties to set
         */
        function PastMessage(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PastMessage incoming.
         * @member {history.PastIncomingMessage|null|undefined} incoming
         * @memberof history.PastMessage
         * @instance
         */
        PastMessage.prototype.incoming = null;

        /**
         * PastMessage outgoing.
         * @member {history.PastOutgoingMessage|null|undefined} outgoing
         * @memberof history.PastMessage
         * @instance
         */
        PastMessage.prototype.outgoing = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * PastMessage message.
         * @member {"incoming"|"outgoing"|undefined} message
         * @memberof history.PastMessage
         * @instance
         */
        Object.defineProperty(PastMessage.prototype, "message", {
            get: $util.oneOfGetter($oneOfFields = ["incoming", "outgoing"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified PastMessage message. Does not implicitly {@link history.PastMessage.verify|verify} messages.
         * @function encode
         * @memberof history.PastMessage
         * @static
         * @param {history.PastMessage} message PastMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PastMessage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.incoming != null && Object.hasOwnProperty.call(message, "incoming"))
                $root.history.PastIncomingMessage.encode(message.incoming, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.outgoing != null && Object.hasOwnProperty.call(message, "outgoing"))
                $root.history.PastOutgoingMessage.encode(message.outgoing, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a PastMessage message from the specified reader or buffer.
         * @function decode
         * @memberof history.PastMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {history.PastMessage} PastMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PastMessage.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.history.PastMessage();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.incoming = $root.history.PastIncomingMessage.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.outgoing = $root.history.PastOutgoingMessage.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return PastMessage;
    })();

    history.Reaction = (function() {

        /**
         * Properties of a Reaction.
         * @memberof history
         * @interface IReaction
         * @property {Long|null} [at] Reaction at
         * @property {history.Reaction.Type|null} [type] Reaction type
         */

        /**
         * Constructs a new Reaction.
         * @memberof history
         * @classdesc Represents a Reaction.
         * @implements IReaction
         * @constructor
         * @param {history.IReaction=} [properties] Properties to set
         */
        function Reaction(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Reaction at.
         * @member {Long} at
         * @memberof history.Reaction
         * @instance
         */
        Reaction.prototype.at = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Reaction type.
         * @member {history.Reaction.Type} type
         * @memberof history.Reaction
         * @instance
         */
        Reaction.prototype.type = 0;

        /**
         * Encodes the specified Reaction message. Does not implicitly {@link history.Reaction.verify|verify} messages.
         * @function encode
         * @memberof history.Reaction
         * @static
         * @param {history.Reaction} message Reaction message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Reaction.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.at != null && Object.hasOwnProperty.call(message, "at"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.at);
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.type);
            return writer;
        };

        /**
         * Decodes a Reaction message from the specified reader or buffer.
         * @function decode
         * @memberof history.Reaction
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {history.Reaction} Reaction
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Reaction.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.history.Reaction();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.at = reader.uint64();
                        break;
                    }
                case 2: {
                        message.type = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Type enum.
         * @name history.Reaction.Type
         * @enum {number}
         * @property {number} ACKNOWLEDGE=0 ACKNOWLEDGE value
         * @property {number} DECLINE=1 DECLINE value
         */
        Reaction.Type = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "ACKNOWLEDGE"] = 0;
            values[valuesById[1] = "DECLINE"] = 1;
            return values;
        })();

        return Reaction;
    })();

    history.PastOutgoingMessage = (function() {

        /**
         * Properties of a PastOutgoingMessage.
         * @memberof history
         * @interface IPastOutgoingMessage
         * @property {d2d.OutgoingMessage|null} [message] PastOutgoingMessage message
         * @property {Long|null} [sentAt] PastOutgoingMessage sentAt
         * @property {Long|null} [readAt] PastOutgoingMessage readAt
         * @property {history.Reaction|null} [lastReactionAt] PastOutgoingMessage lastReactionAt
         */

        /**
         * Constructs a new PastOutgoingMessage.
         * @memberof history
         * @classdesc Represents a PastOutgoingMessage.
         * @implements IPastOutgoingMessage
         * @constructor
         * @param {history.IPastOutgoingMessage=} [properties] Properties to set
         */
        function PastOutgoingMessage(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PastOutgoingMessage message.
         * @member {d2d.OutgoingMessage|null|undefined} message
         * @memberof history.PastOutgoingMessage
         * @instance
         */
        PastOutgoingMessage.prototype.message = null;

        /**
         * PastOutgoingMessage sentAt.
         * @member {Long} sentAt
         * @memberof history.PastOutgoingMessage
         * @instance
         */
        PastOutgoingMessage.prototype.sentAt = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * PastOutgoingMessage readAt.
         * @member {Long|null|undefined} readAt
         * @memberof history.PastOutgoingMessage
         * @instance
         */
        PastOutgoingMessage.prototype.readAt = null;

        /**
         * PastOutgoingMessage lastReactionAt.
         * @member {history.Reaction|null|undefined} lastReactionAt
         * @memberof history.PastOutgoingMessage
         * @instance
         */
        PastOutgoingMessage.prototype.lastReactionAt = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * PastOutgoingMessage _readAt.
         * @member {"readAt"|undefined} _readAt
         * @memberof history.PastOutgoingMessage
         * @instance
         */
        Object.defineProperty(PastOutgoingMessage.prototype, "_readAt", {
            get: $util.oneOfGetter($oneOfFields = ["readAt"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified PastOutgoingMessage message. Does not implicitly {@link history.PastOutgoingMessage.verify|verify} messages.
         * @function encode
         * @memberof history.PastOutgoingMessage
         * @static
         * @param {history.PastOutgoingMessage} message PastOutgoingMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PastOutgoingMessage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                $root.d2d.OutgoingMessage.encode(message.message, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.sentAt != null && Object.hasOwnProperty.call(message, "sentAt"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.sentAt);
            if (message.readAt != null && Object.hasOwnProperty.call(message, "readAt"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.readAt);
            if (message.lastReactionAt != null && Object.hasOwnProperty.call(message, "lastReactionAt"))
                $root.history.Reaction.encode(message.lastReactionAt, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a PastOutgoingMessage message from the specified reader or buffer.
         * @function decode
         * @memberof history.PastOutgoingMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {history.PastOutgoingMessage} PastOutgoingMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PastOutgoingMessage.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.history.PastOutgoingMessage();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.message = $root.d2d.OutgoingMessage.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.sentAt = reader.uint64();
                        break;
                    }
                case 3: {
                        message.readAt = reader.uint64();
                        break;
                    }
                case 4: {
                        message.lastReactionAt = $root.history.Reaction.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return PastOutgoingMessage;
    })();

    history.PastIncomingMessage = (function() {

        /**
         * Properties of a PastIncomingMessage.
         * @memberof history
         * @interface IPastIncomingMessage
         * @property {d2d.IncomingMessage|null} [message] PastIncomingMessage message
         * @property {Long|null} [receivedAt] PastIncomingMessage receivedAt
         * @property {Long|null} [readAt] PastIncomingMessage readAt
         * @property {history.Reaction|null} [lastReactionAt] PastIncomingMessage lastReactionAt
         */

        /**
         * Constructs a new PastIncomingMessage.
         * @memberof history
         * @classdesc Represents a PastIncomingMessage.
         * @implements IPastIncomingMessage
         * @constructor
         * @param {history.IPastIncomingMessage=} [properties] Properties to set
         */
        function PastIncomingMessage(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PastIncomingMessage message.
         * @member {d2d.IncomingMessage|null|undefined} message
         * @memberof history.PastIncomingMessage
         * @instance
         */
        PastIncomingMessage.prototype.message = null;

        /**
         * PastIncomingMessage receivedAt.
         * @member {Long} receivedAt
         * @memberof history.PastIncomingMessage
         * @instance
         */
        PastIncomingMessage.prototype.receivedAt = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * PastIncomingMessage readAt.
         * @member {Long|null|undefined} readAt
         * @memberof history.PastIncomingMessage
         * @instance
         */
        PastIncomingMessage.prototype.readAt = null;

        /**
         * PastIncomingMessage lastReactionAt.
         * @member {history.Reaction|null|undefined} lastReactionAt
         * @memberof history.PastIncomingMessage
         * @instance
         */
        PastIncomingMessage.prototype.lastReactionAt = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * PastIncomingMessage _readAt.
         * @member {"readAt"|undefined} _readAt
         * @memberof history.PastIncomingMessage
         * @instance
         */
        Object.defineProperty(PastIncomingMessage.prototype, "_readAt", {
            get: $util.oneOfGetter($oneOfFields = ["readAt"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified PastIncomingMessage message. Does not implicitly {@link history.PastIncomingMessage.verify|verify} messages.
         * @function encode
         * @memberof history.PastIncomingMessage
         * @static
         * @param {history.PastIncomingMessage} message PastIncomingMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PastIncomingMessage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.message != null && Object.hasOwnProperty.call(message, "message"))
                $root.d2d.IncomingMessage.encode(message.message, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.receivedAt != null && Object.hasOwnProperty.call(message, "receivedAt"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.receivedAt);
            if (message.readAt != null && Object.hasOwnProperty.call(message, "readAt"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.readAt);
            if (message.lastReactionAt != null && Object.hasOwnProperty.call(message, "lastReactionAt"))
                $root.history.Reaction.encode(message.lastReactionAt, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a PastIncomingMessage message from the specified reader or buffer.
         * @function decode
         * @memberof history.PastIncomingMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {history.PastIncomingMessage} PastIncomingMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PastIncomingMessage.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.history.PastIncomingMessage();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.message = $root.d2d.IncomingMessage.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.receivedAt = reader.uint64();
                        break;
                    }
                case 3: {
                        message.readAt = reader.uint64();
                        break;
                    }
                case 4: {
                        message.lastReactionAt = $root.history.Reaction.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return PastIncomingMessage;
    })();

    return history;
})();

export const d2d = $root.d2d = (() => {

    /**
     * Namespace d2d.
     * @exports d2d
     * @namespace
     */
    const d2d = {};

    d2d.SharedDeviceData = (function() {

        /**
         * Properties of a SharedDeviceData.
         * @memberof d2d
         * @interface ISharedDeviceData
         * @property {Uint8Array|null} [padding] SharedDeviceData padding
         * @property {number|null} [version] SharedDeviceData version
         */

        /**
         * Constructs a new SharedDeviceData.
         * @memberof d2d
         * @classdesc Represents a SharedDeviceData.
         * @implements ISharedDeviceData
         * @constructor
         * @param {d2d.ISharedDeviceData=} [properties] Properties to set
         */
        function SharedDeviceData(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SharedDeviceData padding.
         * @member {Uint8Array} padding
         * @memberof d2d.SharedDeviceData
         * @instance
         */
        SharedDeviceData.prototype.padding = $util.newBuffer([]);

        /**
         * SharedDeviceData version.
         * @member {number} version
         * @memberof d2d.SharedDeviceData
         * @instance
         */
        SharedDeviceData.prototype.version = 0;

        /**
         * Encodes the specified SharedDeviceData message. Does not implicitly {@link d2d.SharedDeviceData.verify|verify} messages.
         * @function encode
         * @memberof d2d.SharedDeviceData
         * @static
         * @param {d2d.SharedDeviceData} message SharedDeviceData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SharedDeviceData.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.padding != null && Object.hasOwnProperty.call(message, "padding"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.padding);
            if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.version);
            return writer;
        };

        /**
         * Decodes a SharedDeviceData message from the specified reader or buffer.
         * @function decode
         * @memberof d2d.SharedDeviceData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2d.SharedDeviceData} SharedDeviceData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SharedDeviceData.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.SharedDeviceData();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.padding = reader.bytes();
                        break;
                    }
                case 2: {
                        message.version = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return SharedDeviceData;
    })();

    d2d.DeviceInfo = (function() {

        /**
         * Properties of a DeviceInfo.
         * @memberof d2d
         * @interface IDeviceInfo
         * @property {Uint8Array|null} [padding] DeviceInfo padding
         * @property {d2d.DeviceInfo.Platform|null} [platform] DeviceInfo platform
         * @property {string|null} [platformDetails] DeviceInfo platformDetails
         * @property {string|null} [appVersion] DeviceInfo appVersion
         * @property {string|null} [label] DeviceInfo label
         */

        /**
         * Constructs a new DeviceInfo.
         * @memberof d2d
         * @classdesc Represents a DeviceInfo.
         * @implements IDeviceInfo
         * @constructor
         * @param {d2d.IDeviceInfo=} [properties] Properties to set
         */
        function DeviceInfo(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DeviceInfo padding.
         * @member {Uint8Array} padding
         * @memberof d2d.DeviceInfo
         * @instance
         */
        DeviceInfo.prototype.padding = $util.newBuffer([]);

        /**
         * DeviceInfo platform.
         * @member {d2d.DeviceInfo.Platform} platform
         * @memberof d2d.DeviceInfo
         * @instance
         */
        DeviceInfo.prototype.platform = 0;

        /**
         * DeviceInfo platformDetails.
         * @member {string} platformDetails
         * @memberof d2d.DeviceInfo
         * @instance
         */
        DeviceInfo.prototype.platformDetails = "";

        /**
         * DeviceInfo appVersion.
         * @member {string} appVersion
         * @memberof d2d.DeviceInfo
         * @instance
         */
        DeviceInfo.prototype.appVersion = "";

        /**
         * DeviceInfo label.
         * @member {string} label
         * @memberof d2d.DeviceInfo
         * @instance
         */
        DeviceInfo.prototype.label = "";

        /**
         * Encodes the specified DeviceInfo message. Does not implicitly {@link d2d.DeviceInfo.verify|verify} messages.
         * @function encode
         * @memberof d2d.DeviceInfo
         * @static
         * @param {d2d.DeviceInfo} message DeviceInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DeviceInfo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.padding != null && Object.hasOwnProperty.call(message, "padding"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.padding);
            if (message.platform != null && Object.hasOwnProperty.call(message, "platform"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.platform);
            if (message.platformDetails != null && Object.hasOwnProperty.call(message, "platformDetails"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.platformDetails);
            if (message.appVersion != null && Object.hasOwnProperty.call(message, "appVersion"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.appVersion);
            if (message.label != null && Object.hasOwnProperty.call(message, "label"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.label);
            return writer;
        };

        /**
         * Decodes a DeviceInfo message from the specified reader or buffer.
         * @function decode
         * @memberof d2d.DeviceInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2d.DeviceInfo} DeviceInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeviceInfo.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.DeviceInfo();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.padding = reader.bytes();
                        break;
                    }
                case 2: {
                        message.platform = reader.int32();
                        break;
                    }
                case 3: {
                        message.platformDetails = reader.string();
                        break;
                    }
                case 4: {
                        message.appVersion = reader.string();
                        break;
                    }
                case 5: {
                        message.label = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Platform enum.
         * @name d2d.DeviceInfo.Platform
         * @enum {number}
         * @property {number} UNSPECIFIED=0 UNSPECIFIED value
         * @property {number} ANDROID=1 ANDROID value
         * @property {number} IOS=2 IOS value
         * @property {number} DESKTOP=3 DESKTOP value
         * @property {number} WEB=4 WEB value
         */
        DeviceInfo.Platform = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "UNSPECIFIED"] = 0;
            values[valuesById[1] = "ANDROID"] = 1;
            values[valuesById[2] = "IOS"] = 2;
            values[valuesById[3] = "DESKTOP"] = 3;
            values[valuesById[4] = "WEB"] = 4;
            return values;
        })();

        return DeviceInfo;
    })();

    d2d.TransactionScope = (function() {

        /**
         * Properties of a TransactionScope.
         * @memberof d2d
         * @interface ITransactionScope
         * @property {d2d.TransactionScope.Scope|null} [scope] TransactionScope scope
         */

        /**
         * Constructs a new TransactionScope.
         * @memberof d2d
         * @classdesc Represents a TransactionScope.
         * @implements ITransactionScope
         * @constructor
         * @param {d2d.ITransactionScope=} [properties] Properties to set
         */
        function TransactionScope(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TransactionScope scope.
         * @member {d2d.TransactionScope.Scope} scope
         * @memberof d2d.TransactionScope
         * @instance
         */
        TransactionScope.prototype.scope = 0;

        /**
         * Encodes the specified TransactionScope message. Does not implicitly {@link d2d.TransactionScope.verify|verify} messages.
         * @function encode
         * @memberof d2d.TransactionScope
         * @static
         * @param {d2d.TransactionScope} message TransactionScope message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TransactionScope.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.scope != null && Object.hasOwnProperty.call(message, "scope"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.scope);
            return writer;
        };

        /**
         * Decodes a TransactionScope message from the specified reader or buffer.
         * @function decode
         * @memberof d2d.TransactionScope
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2d.TransactionScope} TransactionScope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TransactionScope.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.TransactionScope();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.scope = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Scope enum.
         * @name d2d.TransactionScope.Scope
         * @enum {number}
         * @property {number} USER_PROFILE_SYNC=0 USER_PROFILE_SYNC value
         * @property {number} CONTACT_SYNC=1 CONTACT_SYNC value
         * @property {number} GROUP_SYNC=2 GROUP_SYNC value
         * @property {number} DISTRIBUTION_LIST_SYNC=3 DISTRIBUTION_LIST_SYNC value
         * @property {number} SETTINGS_SYNC=4 SETTINGS_SYNC value
         * @property {number} MDM_PARAMETER_SYNC=5 MDM_PARAMETER_SYNC value
         * @property {number} NEW_DEVICE_SYNC=6 NEW_DEVICE_SYNC value
         */
        TransactionScope.Scope = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "USER_PROFILE_SYNC"] = 0;
            values[valuesById[1] = "CONTACT_SYNC"] = 1;
            values[valuesById[2] = "GROUP_SYNC"] = 2;
            values[valuesById[3] = "DISTRIBUTION_LIST_SYNC"] = 3;
            values[valuesById[4] = "SETTINGS_SYNC"] = 4;
            values[valuesById[5] = "MDM_PARAMETER_SYNC"] = 5;
            values[valuesById[6] = "NEW_DEVICE_SYNC"] = 6;
            return values;
        })();

        return TransactionScope;
    })();

    d2d.Envelope = (function() {

        /**
         * Properties of an Envelope.
         * @memberof d2d
         * @interface IEnvelope
         * @property {Uint8Array|null} [padding] Envelope padding
         * @property {Long|null} [deviceId] Envelope deviceId
         * @property {d2d.OutgoingMessage|null} [outgoingMessage] Envelope outgoingMessage
         * @property {d2d.OutgoingMessageUpdate|null} [outgoingMessageUpdate] Envelope outgoingMessageUpdate
         * @property {d2d.IncomingMessage|null} [incomingMessage] Envelope incomingMessage
         * @property {d2d.IncomingMessageUpdate|null} [incomingMessageUpdate] Envelope incomingMessageUpdate
         * @property {d2d.UserProfileSync|null} [userProfileSync] Envelope userProfileSync
         * @property {d2d.ContactSync|null} [contactSync] Envelope contactSync
         * @property {d2d.GroupSync|null} [groupSync] Envelope groupSync
         * @property {d2d.DistributionListSync|null} [distributionListSync] Envelope distributionListSync
         * @property {d2d.SettingsSync|null} [settingsSync] Envelope settingsSync
         * @property {d2d.MdmParameterSync|null} [mdmParameterSync] Envelope mdmParameterSync
         */

        /**
         * Constructs a new Envelope.
         * @memberof d2d
         * @classdesc Represents an Envelope.
         * @implements IEnvelope
         * @constructor
         * @param {d2d.IEnvelope=} [properties] Properties to set
         */
        function Envelope(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Envelope padding.
         * @member {Uint8Array} padding
         * @memberof d2d.Envelope
         * @instance
         */
        Envelope.prototype.padding = $util.newBuffer([]);

        /**
         * Envelope deviceId.
         * @member {Long} deviceId
         * @memberof d2d.Envelope
         * @instance
         */
        Envelope.prototype.deviceId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Envelope outgoingMessage.
         * @member {d2d.OutgoingMessage|null|undefined} outgoingMessage
         * @memberof d2d.Envelope
         * @instance
         */
        Envelope.prototype.outgoingMessage = null;

        /**
         * Envelope outgoingMessageUpdate.
         * @member {d2d.OutgoingMessageUpdate|null|undefined} outgoingMessageUpdate
         * @memberof d2d.Envelope
         * @instance
         */
        Envelope.prototype.outgoingMessageUpdate = null;

        /**
         * Envelope incomingMessage.
         * @member {d2d.IncomingMessage|null|undefined} incomingMessage
         * @memberof d2d.Envelope
         * @instance
         */
        Envelope.prototype.incomingMessage = null;

        /**
         * Envelope incomingMessageUpdate.
         * @member {d2d.IncomingMessageUpdate|null|undefined} incomingMessageUpdate
         * @memberof d2d.Envelope
         * @instance
         */
        Envelope.prototype.incomingMessageUpdate = null;

        /**
         * Envelope userProfileSync.
         * @member {d2d.UserProfileSync|null|undefined} userProfileSync
         * @memberof d2d.Envelope
         * @instance
         */
        Envelope.prototype.userProfileSync = null;

        /**
         * Envelope contactSync.
         * @member {d2d.ContactSync|null|undefined} contactSync
         * @memberof d2d.Envelope
         * @instance
         */
        Envelope.prototype.contactSync = null;

        /**
         * Envelope groupSync.
         * @member {d2d.GroupSync|null|undefined} groupSync
         * @memberof d2d.Envelope
         * @instance
         */
        Envelope.prototype.groupSync = null;

        /**
         * Envelope distributionListSync.
         * @member {d2d.DistributionListSync|null|undefined} distributionListSync
         * @memberof d2d.Envelope
         * @instance
         */
        Envelope.prototype.distributionListSync = null;

        /**
         * Envelope settingsSync.
         * @member {d2d.SettingsSync|null|undefined} settingsSync
         * @memberof d2d.Envelope
         * @instance
         */
        Envelope.prototype.settingsSync = null;

        /**
         * Envelope mdmParameterSync.
         * @member {d2d.MdmParameterSync|null|undefined} mdmParameterSync
         * @memberof d2d.Envelope
         * @instance
         */
        Envelope.prototype.mdmParameterSync = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * Envelope content.
         * @member {"outgoingMessage"|"outgoingMessageUpdate"|"incomingMessage"|"incomingMessageUpdate"|"userProfileSync"|"contactSync"|"groupSync"|"distributionListSync"|"settingsSync"|"mdmParameterSync"|undefined} content
         * @memberof d2d.Envelope
         * @instance
         */
        Object.defineProperty(Envelope.prototype, "content", {
            get: $util.oneOfGetter($oneOfFields = ["outgoingMessage", "outgoingMessageUpdate", "incomingMessage", "incomingMessageUpdate", "userProfileSync", "contactSync", "groupSync", "distributionListSync", "settingsSync", "mdmParameterSync"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified Envelope message. Does not implicitly {@link d2d.Envelope.verify|verify} messages.
         * @function encode
         * @memberof d2d.Envelope
         * @static
         * @param {d2d.Envelope} message Envelope message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Envelope.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.padding != null && Object.hasOwnProperty.call(message, "padding"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.padding);
            if (message.outgoingMessage != null && Object.hasOwnProperty.call(message, "outgoingMessage"))
                $root.d2d.OutgoingMessage.encode(message.outgoingMessage, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.incomingMessage != null && Object.hasOwnProperty.call(message, "incomingMessage"))
                $root.d2d.IncomingMessage.encode(message.incomingMessage, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.userProfileSync != null && Object.hasOwnProperty.call(message, "userProfileSync"))
                $root.d2d.UserProfileSync.encode(message.userProfileSync, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            if (message.contactSync != null && Object.hasOwnProperty.call(message, "contactSync"))
                $root.d2d.ContactSync.encode(message.contactSync, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
            if (message.groupSync != null && Object.hasOwnProperty.call(message, "groupSync"))
                $root.d2d.GroupSync.encode(message.groupSync, writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
            if (message.distributionListSync != null && Object.hasOwnProperty.call(message, "distributionListSync"))
                $root.d2d.DistributionListSync.encode(message.distributionListSync, writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
            if (message.settingsSync != null && Object.hasOwnProperty.call(message, "settingsSync"))
                $root.d2d.SettingsSync.encode(message.settingsSync, writer.uint32(/* id 9, wireType 2 =*/74).fork()).ldelim();
            if (message.outgoingMessageUpdate != null && Object.hasOwnProperty.call(message, "outgoingMessageUpdate"))
                $root.d2d.OutgoingMessageUpdate.encode(message.outgoingMessageUpdate, writer.uint32(/* id 10, wireType 2 =*/82).fork()).ldelim();
            if (message.incomingMessageUpdate != null && Object.hasOwnProperty.call(message, "incomingMessageUpdate"))
                $root.d2d.IncomingMessageUpdate.encode(message.incomingMessageUpdate, writer.uint32(/* id 11, wireType 2 =*/90).fork()).ldelim();
            if (message.mdmParameterSync != null && Object.hasOwnProperty.call(message, "mdmParameterSync"))
                $root.d2d.MdmParameterSync.encode(message.mdmParameterSync, writer.uint32(/* id 12, wireType 2 =*/98).fork()).ldelim();
            if (message.deviceId != null && Object.hasOwnProperty.call(message, "deviceId"))
                writer.uint32(/* id 13, wireType 1 =*/105).fixed64(message.deviceId);
            return writer;
        };

        /**
         * Decodes an Envelope message from the specified reader or buffer.
         * @function decode
         * @memberof d2d.Envelope
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2d.Envelope} Envelope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Envelope.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.Envelope();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.padding = reader.bytes();
                        break;
                    }
                case 13: {
                        message.deviceId = reader.fixed64();
                        break;
                    }
                case 2: {
                        message.outgoingMessage = $root.d2d.OutgoingMessage.decode(reader, reader.uint32());
                        break;
                    }
                case 10: {
                        message.outgoingMessageUpdate = $root.d2d.OutgoingMessageUpdate.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.incomingMessage = $root.d2d.IncomingMessage.decode(reader, reader.uint32());
                        break;
                    }
                case 11: {
                        message.incomingMessageUpdate = $root.d2d.IncomingMessageUpdate.decode(reader, reader.uint32());
                        break;
                    }
                case 5: {
                        message.userProfileSync = $root.d2d.UserProfileSync.decode(reader, reader.uint32());
                        break;
                    }
                case 6: {
                        message.contactSync = $root.d2d.ContactSync.decode(reader, reader.uint32());
                        break;
                    }
                case 7: {
                        message.groupSync = $root.d2d.GroupSync.decode(reader, reader.uint32());
                        break;
                    }
                case 8: {
                        message.distributionListSync = $root.d2d.DistributionListSync.decode(reader, reader.uint32());
                        break;
                    }
                case 9: {
                        message.settingsSync = $root.d2d.SettingsSync.decode(reader, reader.uint32());
                        break;
                    }
                case 12: {
                        message.mdmParameterSync = $root.d2d.MdmParameterSync.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return Envelope;
    })();

    d2d.ConversationId = (function() {

        /**
         * Properties of a ConversationId.
         * @memberof d2d
         * @interface IConversationId
         * @property {string|null} [contact] ConversationId contact
         * @property {Long|null} [distributionList] ConversationId distributionList
         * @property {common.GroupIdentity|null} [group] ConversationId group
         */

        /**
         * Constructs a new ConversationId.
         * @memberof d2d
         * @classdesc Represents a ConversationId.
         * @implements IConversationId
         * @constructor
         * @param {d2d.IConversationId=} [properties] Properties to set
         */
        function ConversationId(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ConversationId contact.
         * @member {string|null|undefined} contact
         * @memberof d2d.ConversationId
         * @instance
         */
        ConversationId.prototype.contact = null;

        /**
         * ConversationId distributionList.
         * @member {Long|null|undefined} distributionList
         * @memberof d2d.ConversationId
         * @instance
         */
        ConversationId.prototype.distributionList = null;

        /**
         * ConversationId group.
         * @member {common.GroupIdentity|null|undefined} group
         * @memberof d2d.ConversationId
         * @instance
         */
        ConversationId.prototype.group = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * ConversationId id.
         * @member {"contact"|"distributionList"|"group"|undefined} id
         * @memberof d2d.ConversationId
         * @instance
         */
        Object.defineProperty(ConversationId.prototype, "id", {
            get: $util.oneOfGetter($oneOfFields = ["contact", "distributionList", "group"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified ConversationId message. Does not implicitly {@link d2d.ConversationId.verify|verify} messages.
         * @function encode
         * @memberof d2d.ConversationId
         * @static
         * @param {d2d.ConversationId} message ConversationId message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ConversationId.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.contact != null && Object.hasOwnProperty.call(message, "contact"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.contact);
            if (message.distributionList != null && Object.hasOwnProperty.call(message, "distributionList"))
                writer.uint32(/* id 2, wireType 1 =*/17).fixed64(message.distributionList);
            if (message.group != null && Object.hasOwnProperty.call(message, "group"))
                $root.common.GroupIdentity.encode(message.group, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a ConversationId message from the specified reader or buffer.
         * @function decode
         * @memberof d2d.ConversationId
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2d.ConversationId} ConversationId
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ConversationId.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.ConversationId();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.contact = reader.string();
                        break;
                    }
                case 2: {
                        message.distributionList = reader.fixed64();
                        break;
                    }
                case 3: {
                        message.group = $root.common.GroupIdentity.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return ConversationId;
    })();

    d2d.OutgoingMessage = (function() {

        /**
         * Properties of an OutgoingMessage.
         * @memberof d2d
         * @interface IOutgoingMessage
         * @property {d2d.ConversationId|null} [conversation] OutgoingMessage conversation
         * @property {Long|null} [messageId] OutgoingMessage messageId
         * @property {Long|null} [threadMessageId] OutgoingMessage threadMessageId
         * @property {Long|null} [createdAt] OutgoingMessage createdAt
         * @property {common.CspE2eMessageType|null} [type] OutgoingMessage type
         * @property {Uint8Array|null} [body] OutgoingMessage body
         * @property {Array.<Uint8Array>|null} [nonces] OutgoingMessage nonces
         */

        /**
         * Constructs a new OutgoingMessage.
         * @memberof d2d
         * @classdesc Represents an OutgoingMessage.
         * @implements IOutgoingMessage
         * @constructor
         * @param {d2d.IOutgoingMessage=} [properties] Properties to set
         */
        function OutgoingMessage(properties) {
            this.nonces = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * OutgoingMessage conversation.
         * @member {d2d.ConversationId|null|undefined} conversation
         * @memberof d2d.OutgoingMessage
         * @instance
         */
        OutgoingMessage.prototype.conversation = null;

        /**
         * OutgoingMessage messageId.
         * @member {Long} messageId
         * @memberof d2d.OutgoingMessage
         * @instance
         */
        OutgoingMessage.prototype.messageId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * OutgoingMessage threadMessageId.
         * @member {Long|null|undefined} threadMessageId
         * @memberof d2d.OutgoingMessage
         * @instance
         */
        OutgoingMessage.prototype.threadMessageId = null;

        /**
         * OutgoingMessage createdAt.
         * @member {Long} createdAt
         * @memberof d2d.OutgoingMessage
         * @instance
         */
        OutgoingMessage.prototype.createdAt = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * OutgoingMessage type.
         * @member {common.CspE2eMessageType} type
         * @memberof d2d.OutgoingMessage
         * @instance
         */
        OutgoingMessage.prototype.type = 0;

        /**
         * OutgoingMessage body.
         * @member {Uint8Array} body
         * @memberof d2d.OutgoingMessage
         * @instance
         */
        OutgoingMessage.prototype.body = $util.newBuffer([]);

        /**
         * OutgoingMessage nonces.
         * @member {Array.<Uint8Array>} nonces
         * @memberof d2d.OutgoingMessage
         * @instance
         */
        OutgoingMessage.prototype.nonces = $util.emptyArray;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * OutgoingMessage _threadMessageId.
         * @member {"threadMessageId"|undefined} _threadMessageId
         * @memberof d2d.OutgoingMessage
         * @instance
         */
        Object.defineProperty(OutgoingMessage.prototype, "_threadMessageId", {
            get: $util.oneOfGetter($oneOfFields = ["threadMessageId"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified OutgoingMessage message. Does not implicitly {@link d2d.OutgoingMessage.verify|verify} messages.
         * @function encode
         * @memberof d2d.OutgoingMessage
         * @static
         * @param {d2d.OutgoingMessage} message OutgoingMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        OutgoingMessage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.conversation != null && Object.hasOwnProperty.call(message, "conversation"))
                $root.d2d.ConversationId.encode(message.conversation, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.messageId != null && Object.hasOwnProperty.call(message, "messageId"))
                writer.uint32(/* id 2, wireType 1 =*/17).fixed64(message.messageId);
            if (message.createdAt != null && Object.hasOwnProperty.call(message, "createdAt"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.createdAt);
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.type);
            if (message.body != null && Object.hasOwnProperty.call(message, "body"))
                writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.body);
            if (message.threadMessageId != null && Object.hasOwnProperty.call(message, "threadMessageId"))
                writer.uint32(/* id 6, wireType 1 =*/49).fixed64(message.threadMessageId);
            if (message.nonces != null && message.nonces.length)
                for (let i = 0; i < message.nonces.length; ++i)
                    writer.uint32(/* id 7, wireType 2 =*/58).bytes(message.nonces[i]);
            return writer;
        };

        /**
         * Decodes an OutgoingMessage message from the specified reader or buffer.
         * @function decode
         * @memberof d2d.OutgoingMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2d.OutgoingMessage} OutgoingMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        OutgoingMessage.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.OutgoingMessage();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.conversation = $root.d2d.ConversationId.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.messageId = reader.fixed64();
                        break;
                    }
                case 6: {
                        message.threadMessageId = reader.fixed64();
                        break;
                    }
                case 3: {
                        message.createdAt = reader.uint64();
                        break;
                    }
                case 4: {
                        message.type = reader.int32();
                        break;
                    }
                case 5: {
                        message.body = reader.bytes();
                        break;
                    }
                case 7: {
                        if (!(message.nonces && message.nonces.length))
                            message.nonces = [];
                        message.nonces.push(reader.bytes());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return OutgoingMessage;
    })();

    d2d.OutgoingMessageUpdate = (function() {

        /**
         * Properties of an OutgoingMessageUpdate.
         * @memberof d2d
         * @interface IOutgoingMessageUpdate
         * @property {Array.<d2d.OutgoingMessageUpdate.Update>|null} [updates] OutgoingMessageUpdate updates
         */

        /**
         * Constructs a new OutgoingMessageUpdate.
         * @memberof d2d
         * @classdesc Represents an OutgoingMessageUpdate.
         * @implements IOutgoingMessageUpdate
         * @constructor
         * @param {d2d.IOutgoingMessageUpdate=} [properties] Properties to set
         */
        function OutgoingMessageUpdate(properties) {
            this.updates = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * OutgoingMessageUpdate updates.
         * @member {Array.<d2d.OutgoingMessageUpdate.Update>} updates
         * @memberof d2d.OutgoingMessageUpdate
         * @instance
         */
        OutgoingMessageUpdate.prototype.updates = $util.emptyArray;

        /**
         * Encodes the specified OutgoingMessageUpdate message. Does not implicitly {@link d2d.OutgoingMessageUpdate.verify|verify} messages.
         * @function encode
         * @memberof d2d.OutgoingMessageUpdate
         * @static
         * @param {d2d.OutgoingMessageUpdate} message OutgoingMessageUpdate message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        OutgoingMessageUpdate.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.updates != null && message.updates.length)
                for (let i = 0; i < message.updates.length; ++i)
                    $root.d2d.OutgoingMessageUpdate.Update.encode(message.updates[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes an OutgoingMessageUpdate message from the specified reader or buffer.
         * @function decode
         * @memberof d2d.OutgoingMessageUpdate
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2d.OutgoingMessageUpdate} OutgoingMessageUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        OutgoingMessageUpdate.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.OutgoingMessageUpdate();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.updates && message.updates.length))
                            message.updates = [];
                        message.updates.push($root.d2d.OutgoingMessageUpdate.Update.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        OutgoingMessageUpdate.Sent = (function() {

            /**
             * Properties of a Sent.
             * @memberof d2d.OutgoingMessageUpdate
             * @interface ISent
             */

            /**
             * Constructs a new Sent.
             * @memberof d2d.OutgoingMessageUpdate
             * @classdesc Represents a Sent.
             * @implements ISent
             * @constructor
             * @param {d2d.OutgoingMessageUpdate.ISent=} [properties] Properties to set
             */
            function Sent(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Encodes the specified Sent message. Does not implicitly {@link d2d.OutgoingMessageUpdate.Sent.verify|verify} messages.
             * @function encode
             * @memberof d2d.OutgoingMessageUpdate.Sent
             * @static
             * @param {d2d.OutgoingMessageUpdate.Sent} message Sent message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Sent.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Decodes a Sent message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.OutgoingMessageUpdate.Sent
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.OutgoingMessageUpdate.Sent} Sent
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Sent.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.OutgoingMessageUpdate.Sent();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Sent;
        })();

        OutgoingMessageUpdate.Update = (function() {

            /**
             * Properties of an Update.
             * @memberof d2d.OutgoingMessageUpdate
             * @interface IUpdate
             * @property {d2d.ConversationId|null} [conversation] Update conversation
             * @property {Long|null} [messageId] Update messageId
             * @property {d2d.OutgoingMessageUpdate.Sent|null} [sent] Update sent
             */

            /**
             * Constructs a new Update.
             * @memberof d2d.OutgoingMessageUpdate
             * @classdesc Represents an Update.
             * @implements IUpdate
             * @constructor
             * @param {d2d.OutgoingMessageUpdate.IUpdate=} [properties] Properties to set
             */
            function Update(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Update conversation.
             * @member {d2d.ConversationId|null|undefined} conversation
             * @memberof d2d.OutgoingMessageUpdate.Update
             * @instance
             */
            Update.prototype.conversation = null;

            /**
             * Update messageId.
             * @member {Long} messageId
             * @memberof d2d.OutgoingMessageUpdate.Update
             * @instance
             */
            Update.prototype.messageId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Update sent.
             * @member {d2d.OutgoingMessageUpdate.Sent|null|undefined} sent
             * @memberof d2d.OutgoingMessageUpdate.Update
             * @instance
             */
            Update.prototype.sent = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * Update update.
             * @member {"sent"|undefined} update
             * @memberof d2d.OutgoingMessageUpdate.Update
             * @instance
             */
            Object.defineProperty(Update.prototype, "update", {
                get: $util.oneOfGetter($oneOfFields = ["sent"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.OutgoingMessageUpdate.Update.verify|verify} messages.
             * @function encode
             * @memberof d2d.OutgoingMessageUpdate.Update
             * @static
             * @param {d2d.OutgoingMessageUpdate.Update} message Update message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Update.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.conversation != null && Object.hasOwnProperty.call(message, "conversation"))
                    $root.d2d.ConversationId.encode(message.conversation, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.messageId != null && Object.hasOwnProperty.call(message, "messageId"))
                    writer.uint32(/* id 2, wireType 1 =*/17).fixed64(message.messageId);
                if (message.sent != null && Object.hasOwnProperty.call(message, "sent"))
                    $root.d2d.OutgoingMessageUpdate.Sent.encode(message.sent, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes an Update message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.OutgoingMessageUpdate.Update
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.OutgoingMessageUpdate.Update} Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Update.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.OutgoingMessageUpdate.Update();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.conversation = $root.d2d.ConversationId.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.messageId = reader.fixed64();
                            break;
                        }
                    case 3: {
                            message.sent = $root.d2d.OutgoingMessageUpdate.Sent.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Update;
        })();

        return OutgoingMessageUpdate;
    })();

    d2d.IncomingMessage = (function() {

        /**
         * Properties of an IncomingMessage.
         * @memberof d2d
         * @interface IIncomingMessage
         * @property {string|null} [senderIdentity] IncomingMessage senderIdentity
         * @property {Long|null} [messageId] IncomingMessage messageId
         * @property {Long|null} [createdAt] IncomingMessage createdAt
         * @property {common.CspE2eMessageType|null} [type] IncomingMessage type
         * @property {Uint8Array|null} [body] IncomingMessage body
         * @property {Uint8Array|null} [nonce] IncomingMessage nonce
         */

        /**
         * Constructs a new IncomingMessage.
         * @memberof d2d
         * @classdesc Represents an IncomingMessage.
         * @implements IIncomingMessage
         * @constructor
         * @param {d2d.IIncomingMessage=} [properties] Properties to set
         */
        function IncomingMessage(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * IncomingMessage senderIdentity.
         * @member {string} senderIdentity
         * @memberof d2d.IncomingMessage
         * @instance
         */
        IncomingMessage.prototype.senderIdentity = "";

        /**
         * IncomingMessage messageId.
         * @member {Long} messageId
         * @memberof d2d.IncomingMessage
         * @instance
         */
        IncomingMessage.prototype.messageId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * IncomingMessage createdAt.
         * @member {Long} createdAt
         * @memberof d2d.IncomingMessage
         * @instance
         */
        IncomingMessage.prototype.createdAt = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * IncomingMessage type.
         * @member {common.CspE2eMessageType} type
         * @memberof d2d.IncomingMessage
         * @instance
         */
        IncomingMessage.prototype.type = 0;

        /**
         * IncomingMessage body.
         * @member {Uint8Array} body
         * @memberof d2d.IncomingMessage
         * @instance
         */
        IncomingMessage.prototype.body = $util.newBuffer([]);

        /**
         * IncomingMessage nonce.
         * @member {Uint8Array} nonce
         * @memberof d2d.IncomingMessage
         * @instance
         */
        IncomingMessage.prototype.nonce = $util.newBuffer([]);

        /**
         * Encodes the specified IncomingMessage message. Does not implicitly {@link d2d.IncomingMessage.verify|verify} messages.
         * @function encode
         * @memberof d2d.IncomingMessage
         * @static
         * @param {d2d.IncomingMessage} message IncomingMessage message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        IncomingMessage.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.senderIdentity != null && Object.hasOwnProperty.call(message, "senderIdentity"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.senderIdentity);
            if (message.messageId != null && Object.hasOwnProperty.call(message, "messageId"))
                writer.uint32(/* id 2, wireType 1 =*/17).fixed64(message.messageId);
            if (message.createdAt != null && Object.hasOwnProperty.call(message, "createdAt"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.createdAt);
            if (message.type != null && Object.hasOwnProperty.call(message, "type"))
                writer.uint32(/* id 5, wireType 0 =*/40).int32(message.type);
            if (message.body != null && Object.hasOwnProperty.call(message, "body"))
                writer.uint32(/* id 6, wireType 2 =*/50).bytes(message.body);
            if (message.nonce != null && Object.hasOwnProperty.call(message, "nonce"))
                writer.uint32(/* id 7, wireType 2 =*/58).bytes(message.nonce);
            return writer;
        };

        /**
         * Decodes an IncomingMessage message from the specified reader or buffer.
         * @function decode
         * @memberof d2d.IncomingMessage
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2d.IncomingMessage} IncomingMessage
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        IncomingMessage.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.IncomingMessage();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.senderIdentity = reader.string();
                        break;
                    }
                case 2: {
                        message.messageId = reader.fixed64();
                        break;
                    }
                case 3: {
                        message.createdAt = reader.uint64();
                        break;
                    }
                case 5: {
                        message.type = reader.int32();
                        break;
                    }
                case 6: {
                        message.body = reader.bytes();
                        break;
                    }
                case 7: {
                        message.nonce = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return IncomingMessage;
    })();

    d2d.IncomingMessageUpdate = (function() {

        /**
         * Properties of an IncomingMessageUpdate.
         * @memberof d2d
         * @interface IIncomingMessageUpdate
         * @property {Array.<d2d.IncomingMessageUpdate.Update>|null} [updates] IncomingMessageUpdate updates
         */

        /**
         * Constructs a new IncomingMessageUpdate.
         * @memberof d2d
         * @classdesc Represents an IncomingMessageUpdate.
         * @implements IIncomingMessageUpdate
         * @constructor
         * @param {d2d.IIncomingMessageUpdate=} [properties] Properties to set
         */
        function IncomingMessageUpdate(properties) {
            this.updates = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * IncomingMessageUpdate updates.
         * @member {Array.<d2d.IncomingMessageUpdate.Update>} updates
         * @memberof d2d.IncomingMessageUpdate
         * @instance
         */
        IncomingMessageUpdate.prototype.updates = $util.emptyArray;

        /**
         * Encodes the specified IncomingMessageUpdate message. Does not implicitly {@link d2d.IncomingMessageUpdate.verify|verify} messages.
         * @function encode
         * @memberof d2d.IncomingMessageUpdate
         * @static
         * @param {d2d.IncomingMessageUpdate} message IncomingMessageUpdate message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        IncomingMessageUpdate.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.updates != null && message.updates.length)
                for (let i = 0; i < message.updates.length; ++i)
                    $root.d2d.IncomingMessageUpdate.Update.encode(message.updates[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes an IncomingMessageUpdate message from the specified reader or buffer.
         * @function decode
         * @memberof d2d.IncomingMessageUpdate
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2d.IncomingMessageUpdate} IncomingMessageUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        IncomingMessageUpdate.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.IncomingMessageUpdate();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        if (!(message.updates && message.updates.length))
                            message.updates = [];
                        message.updates.push($root.d2d.IncomingMessageUpdate.Update.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        IncomingMessageUpdate.Read = (function() {

            /**
             * Properties of a Read.
             * @memberof d2d.IncomingMessageUpdate
             * @interface IRead
             * @property {Long|null} [at] Read at
             */

            /**
             * Constructs a new Read.
             * @memberof d2d.IncomingMessageUpdate
             * @classdesc Represents a Read.
             * @implements IRead
             * @constructor
             * @param {d2d.IncomingMessageUpdate.IRead=} [properties] Properties to set
             */
            function Read(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Read at.
             * @member {Long} at
             * @memberof d2d.IncomingMessageUpdate.Read
             * @instance
             */
            Read.prototype.at = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

            /**
             * Encodes the specified Read message. Does not implicitly {@link d2d.IncomingMessageUpdate.Read.verify|verify} messages.
             * @function encode
             * @memberof d2d.IncomingMessageUpdate.Read
             * @static
             * @param {d2d.IncomingMessageUpdate.Read} message Read message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Read.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.at != null && Object.hasOwnProperty.call(message, "at"))
                    writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.at);
                return writer;
            };

            /**
             * Decodes a Read message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.IncomingMessageUpdate.Read
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.IncomingMessageUpdate.Read} Read
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Read.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.IncomingMessageUpdate.Read();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.at = reader.uint64();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Read;
        })();

        IncomingMessageUpdate.Update = (function() {

            /**
             * Properties of an Update.
             * @memberof d2d.IncomingMessageUpdate
             * @interface IUpdate
             * @property {d2d.ConversationId|null} [conversation] Update conversation
             * @property {Long|null} [messageId] Update messageId
             * @property {d2d.IncomingMessageUpdate.Read|null} [read] Update read
             */

            /**
             * Constructs a new Update.
             * @memberof d2d.IncomingMessageUpdate
             * @classdesc Represents an Update.
             * @implements IUpdate
             * @constructor
             * @param {d2d.IncomingMessageUpdate.IUpdate=} [properties] Properties to set
             */
            function Update(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Update conversation.
             * @member {d2d.ConversationId|null|undefined} conversation
             * @memberof d2d.IncomingMessageUpdate.Update
             * @instance
             */
            Update.prototype.conversation = null;

            /**
             * Update messageId.
             * @member {Long} messageId
             * @memberof d2d.IncomingMessageUpdate.Update
             * @instance
             */
            Update.prototype.messageId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Update read.
             * @member {d2d.IncomingMessageUpdate.Read|null|undefined} read
             * @memberof d2d.IncomingMessageUpdate.Update
             * @instance
             */
            Update.prototype.read = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * Update update.
             * @member {"read"|undefined} update
             * @memberof d2d.IncomingMessageUpdate.Update
             * @instance
             */
            Object.defineProperty(Update.prototype, "update", {
                get: $util.oneOfGetter($oneOfFields = ["read"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.IncomingMessageUpdate.Update.verify|verify} messages.
             * @function encode
             * @memberof d2d.IncomingMessageUpdate.Update
             * @static
             * @param {d2d.IncomingMessageUpdate.Update} message Update message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Update.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.conversation != null && Object.hasOwnProperty.call(message, "conversation"))
                    $root.d2d.ConversationId.encode(message.conversation, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.messageId != null && Object.hasOwnProperty.call(message, "messageId"))
                    writer.uint32(/* id 2, wireType 1 =*/17).fixed64(message.messageId);
                if (message.read != null && Object.hasOwnProperty.call(message, "read"))
                    $root.d2d.IncomingMessageUpdate.Read.encode(message.read, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes an Update message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.IncomingMessageUpdate.Update
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.IncomingMessageUpdate.Update} Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Update.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.IncomingMessageUpdate.Update();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.conversation = $root.d2d.ConversationId.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.messageId = reader.fixed64();
                            break;
                        }
                    case 3: {
                            message.read = $root.d2d.IncomingMessageUpdate.Read.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Update;
        })();

        return IncomingMessageUpdate;
    })();

    d2d.UserProfileSync = (function() {

        /**
         * Properties of a UserProfileSync.
         * @memberof d2d
         * @interface IUserProfileSync
         * @property {d2d.UserProfileSync.Update|null} [update] UserProfileSync update
         */

        /**
         * Constructs a new UserProfileSync.
         * @memberof d2d
         * @classdesc Represents a UserProfileSync.
         * @implements IUserProfileSync
         * @constructor
         * @param {d2d.IUserProfileSync=} [properties] Properties to set
         */
        function UserProfileSync(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * UserProfileSync update.
         * @member {d2d.UserProfileSync.Update|null|undefined} update
         * @memberof d2d.UserProfileSync
         * @instance
         */
        UserProfileSync.prototype.update = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * UserProfileSync action.
         * @member {"update"|undefined} action
         * @memberof d2d.UserProfileSync
         * @instance
         */
        Object.defineProperty(UserProfileSync.prototype, "action", {
            get: $util.oneOfGetter($oneOfFields = ["update"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified UserProfileSync message. Does not implicitly {@link d2d.UserProfileSync.verify|verify} messages.
         * @function encode
         * @memberof d2d.UserProfileSync
         * @static
         * @param {d2d.UserProfileSync} message UserProfileSync message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UserProfileSync.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.update != null && Object.hasOwnProperty.call(message, "update"))
                $root.d2d.UserProfileSync.Update.encode(message.update, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a UserProfileSync message from the specified reader or buffer.
         * @function decode
         * @memberof d2d.UserProfileSync
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2d.UserProfileSync} UserProfileSync
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UserProfileSync.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.UserProfileSync();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.update = $root.d2d.UserProfileSync.Update.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        UserProfileSync.Update = (function() {

            /**
             * Properties of an Update.
             * @memberof d2d.UserProfileSync
             * @interface IUpdate
             * @property {sync.UserProfile|null} [userProfile] Update userProfile
             */

            /**
             * Constructs a new Update.
             * @memberof d2d.UserProfileSync
             * @classdesc Represents an Update.
             * @implements IUpdate
             * @constructor
             * @param {d2d.UserProfileSync.IUpdate=} [properties] Properties to set
             */
            function Update(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Update userProfile.
             * @member {sync.UserProfile|null|undefined} userProfile
             * @memberof d2d.UserProfileSync.Update
             * @instance
             */
            Update.prototype.userProfile = null;

            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.UserProfileSync.Update.verify|verify} messages.
             * @function encode
             * @memberof d2d.UserProfileSync.Update
             * @static
             * @param {d2d.UserProfileSync.Update} message Update message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Update.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.userProfile != null && Object.hasOwnProperty.call(message, "userProfile"))
                    $root.sync.UserProfile.encode(message.userProfile, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes an Update message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.UserProfileSync.Update
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.UserProfileSync.Update} Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Update.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.UserProfileSync.Update();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.userProfile = $root.sync.UserProfile.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Update;
        })();

        return UserProfileSync;
    })();

    d2d.ContactSync = (function() {

        /**
         * Properties of a ContactSync.
         * @memberof d2d
         * @interface IContactSync
         * @property {d2d.ContactSync.Create|null} [create] ContactSync create
         * @property {d2d.ContactSync.Update|null} [update] ContactSync update
         * @property {d2d.ContactSync.Delete|null} ["delete"] ContactSync delete
         */

        /**
         * Constructs a new ContactSync.
         * @memberof d2d
         * @classdesc Represents a ContactSync.
         * @implements IContactSync
         * @constructor
         * @param {d2d.IContactSync=} [properties] Properties to set
         */
        function ContactSync(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ContactSync create.
         * @member {d2d.ContactSync.Create|null|undefined} create
         * @memberof d2d.ContactSync
         * @instance
         */
        ContactSync.prototype.create = null;

        /**
         * ContactSync update.
         * @member {d2d.ContactSync.Update|null|undefined} update
         * @memberof d2d.ContactSync
         * @instance
         */
        ContactSync.prototype.update = null;

        /**
         * ContactSync delete.
         * @member {d2d.ContactSync.Delete|null|undefined} delete
         * @memberof d2d.ContactSync
         * @instance
         */
        ContactSync.prototype["delete"] = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * ContactSync action.
         * @member {"create"|"update"|"delete"|undefined} action
         * @memberof d2d.ContactSync
         * @instance
         */
        Object.defineProperty(ContactSync.prototype, "action", {
            get: $util.oneOfGetter($oneOfFields = ["create", "update", "delete"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified ContactSync message. Does not implicitly {@link d2d.ContactSync.verify|verify} messages.
         * @function encode
         * @memberof d2d.ContactSync
         * @static
         * @param {d2d.ContactSync} message ContactSync message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ContactSync.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.create != null && Object.hasOwnProperty.call(message, "create"))
                $root.d2d.ContactSync.Create.encode(message.create, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.update != null && Object.hasOwnProperty.call(message, "update"))
                $root.d2d.ContactSync.Update.encode(message.update, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message["delete"] != null && Object.hasOwnProperty.call(message, "delete"))
                $root.d2d.ContactSync.Delete.encode(message["delete"], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a ContactSync message from the specified reader or buffer.
         * @function decode
         * @memberof d2d.ContactSync
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2d.ContactSync} ContactSync
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ContactSync.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.ContactSync();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.create = $root.d2d.ContactSync.Create.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.update = $root.d2d.ContactSync.Update.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message["delete"] = $root.d2d.ContactSync.Delete.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        ContactSync.Create = (function() {

            /**
             * Properties of a Create.
             * @memberof d2d.ContactSync
             * @interface ICreate
             * @property {sync.Contact|null} [contact] Create contact
             */

            /**
             * Constructs a new Create.
             * @memberof d2d.ContactSync
             * @classdesc Represents a Create.
             * @implements ICreate
             * @constructor
             * @param {d2d.ContactSync.ICreate=} [properties] Properties to set
             */
            function Create(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Create contact.
             * @member {sync.Contact|null|undefined} contact
             * @memberof d2d.ContactSync.Create
             * @instance
             */
            Create.prototype.contact = null;

            /**
             * Encodes the specified Create message. Does not implicitly {@link d2d.ContactSync.Create.verify|verify} messages.
             * @function encode
             * @memberof d2d.ContactSync.Create
             * @static
             * @param {d2d.ContactSync.Create} message Create message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Create.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.contact != null && Object.hasOwnProperty.call(message, "contact"))
                    $root.sync.Contact.encode(message.contact, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes a Create message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.ContactSync.Create
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.ContactSync.Create} Create
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Create.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.ContactSync.Create();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.contact = $root.sync.Contact.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Create;
        })();

        ContactSync.Update = (function() {

            /**
             * Properties of an Update.
             * @memberof d2d.ContactSync
             * @interface IUpdate
             * @property {sync.Contact|null} [contact] Update contact
             */

            /**
             * Constructs a new Update.
             * @memberof d2d.ContactSync
             * @classdesc Represents an Update.
             * @implements IUpdate
             * @constructor
             * @param {d2d.ContactSync.IUpdate=} [properties] Properties to set
             */
            function Update(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Update contact.
             * @member {sync.Contact|null|undefined} contact
             * @memberof d2d.ContactSync.Update
             * @instance
             */
            Update.prototype.contact = null;

            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.ContactSync.Update.verify|verify} messages.
             * @function encode
             * @memberof d2d.ContactSync.Update
             * @static
             * @param {d2d.ContactSync.Update} message Update message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Update.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.contact != null && Object.hasOwnProperty.call(message, "contact"))
                    $root.sync.Contact.encode(message.contact, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes an Update message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.ContactSync.Update
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.ContactSync.Update} Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Update.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.ContactSync.Update();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.contact = $root.sync.Contact.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Update;
        })();

        ContactSync.Delete = (function() {

            /**
             * Properties of a Delete.
             * @memberof d2d.ContactSync
             * @interface IDelete
             * @property {string|null} [deleteIdentity] Delete deleteIdentity
             */

            /**
             * Constructs a new Delete.
             * @memberof d2d.ContactSync
             * @classdesc Represents a Delete.
             * @implements IDelete
             * @constructor
             * @param {d2d.ContactSync.IDelete=} [properties] Properties to set
             */
            function Delete(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Delete deleteIdentity.
             * @member {string} deleteIdentity
             * @memberof d2d.ContactSync.Delete
             * @instance
             */
            Delete.prototype.deleteIdentity = "";

            /**
             * Encodes the specified Delete message. Does not implicitly {@link d2d.ContactSync.Delete.verify|verify} messages.
             * @function encode
             * @memberof d2d.ContactSync.Delete
             * @static
             * @param {d2d.ContactSync.Delete} message Delete message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Delete.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.deleteIdentity != null && Object.hasOwnProperty.call(message, "deleteIdentity"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.deleteIdentity);
                return writer;
            };

            /**
             * Decodes a Delete message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.ContactSync.Delete
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.ContactSync.Delete} Delete
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Delete.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.ContactSync.Delete();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.deleteIdentity = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Delete;
        })();

        return ContactSync;
    })();

    d2d.GroupSync = (function() {

        /**
         * Properties of a GroupSync.
         * @memberof d2d
         * @interface IGroupSync
         * @property {d2d.GroupSync.Create|null} [create] GroupSync create
         * @property {d2d.GroupSync.Update|null} [update] GroupSync update
         * @property {d2d.GroupSync.Delete|null} ["delete"] GroupSync delete
         */

        /**
         * Constructs a new GroupSync.
         * @memberof d2d
         * @classdesc Represents a GroupSync.
         * @implements IGroupSync
         * @constructor
         * @param {d2d.IGroupSync=} [properties] Properties to set
         */
        function GroupSync(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GroupSync create.
         * @member {d2d.GroupSync.Create|null|undefined} create
         * @memberof d2d.GroupSync
         * @instance
         */
        GroupSync.prototype.create = null;

        /**
         * GroupSync update.
         * @member {d2d.GroupSync.Update|null|undefined} update
         * @memberof d2d.GroupSync
         * @instance
         */
        GroupSync.prototype.update = null;

        /**
         * GroupSync delete.
         * @member {d2d.GroupSync.Delete|null|undefined} delete
         * @memberof d2d.GroupSync
         * @instance
         */
        GroupSync.prototype["delete"] = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * GroupSync action.
         * @member {"create"|"update"|"delete"|undefined} action
         * @memberof d2d.GroupSync
         * @instance
         */
        Object.defineProperty(GroupSync.prototype, "action", {
            get: $util.oneOfGetter($oneOfFields = ["create", "update", "delete"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified GroupSync message. Does not implicitly {@link d2d.GroupSync.verify|verify} messages.
         * @function encode
         * @memberof d2d.GroupSync
         * @static
         * @param {d2d.GroupSync} message GroupSync message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GroupSync.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.create != null && Object.hasOwnProperty.call(message, "create"))
                $root.d2d.GroupSync.Create.encode(message.create, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.update != null && Object.hasOwnProperty.call(message, "update"))
                $root.d2d.GroupSync.Update.encode(message.update, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message["delete"] != null && Object.hasOwnProperty.call(message, "delete"))
                $root.d2d.GroupSync.Delete.encode(message["delete"], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a GroupSync message from the specified reader or buffer.
         * @function decode
         * @memberof d2d.GroupSync
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2d.GroupSync} GroupSync
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GroupSync.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.GroupSync();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.create = $root.d2d.GroupSync.Create.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.update = $root.d2d.GroupSync.Update.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message["delete"] = $root.d2d.GroupSync.Delete.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        GroupSync.Create = (function() {

            /**
             * Properties of a Create.
             * @memberof d2d.GroupSync
             * @interface ICreate
             * @property {sync.Group|null} [group] Create group
             */

            /**
             * Constructs a new Create.
             * @memberof d2d.GroupSync
             * @classdesc Represents a Create.
             * @implements ICreate
             * @constructor
             * @param {d2d.GroupSync.ICreate=} [properties] Properties to set
             */
            function Create(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Create group.
             * @member {sync.Group|null|undefined} group
             * @memberof d2d.GroupSync.Create
             * @instance
             */
            Create.prototype.group = null;

            /**
             * Encodes the specified Create message. Does not implicitly {@link d2d.GroupSync.Create.verify|verify} messages.
             * @function encode
             * @memberof d2d.GroupSync.Create
             * @static
             * @param {d2d.GroupSync.Create} message Create message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Create.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.group != null && Object.hasOwnProperty.call(message, "group"))
                    $root.sync.Group.encode(message.group, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes a Create message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.GroupSync.Create
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.GroupSync.Create} Create
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Create.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.GroupSync.Create();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.group = $root.sync.Group.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Create;
        })();

        GroupSync.Update = (function() {

            /**
             * Properties of an Update.
             * @memberof d2d.GroupSync
             * @interface IUpdate
             * @property {sync.Group|null} [group] Update group
             */

            /**
             * Constructs a new Update.
             * @memberof d2d.GroupSync
             * @classdesc Represents an Update.
             * @implements IUpdate
             * @constructor
             * @param {d2d.GroupSync.IUpdate=} [properties] Properties to set
             */
            function Update(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Update group.
             * @member {sync.Group|null|undefined} group
             * @memberof d2d.GroupSync.Update
             * @instance
             */
            Update.prototype.group = null;

            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.GroupSync.Update.verify|verify} messages.
             * @function encode
             * @memberof d2d.GroupSync.Update
             * @static
             * @param {d2d.GroupSync.Update} message Update message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Update.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.group != null && Object.hasOwnProperty.call(message, "group"))
                    $root.sync.Group.encode(message.group, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes an Update message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.GroupSync.Update
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.GroupSync.Update} Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Update.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.GroupSync.Update();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.group = $root.sync.Group.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Update;
        })();

        GroupSync.Delete = (function() {

            /**
             * Properties of a Delete.
             * @memberof d2d.GroupSync
             * @interface IDelete
             * @property {common.GroupIdentity|null} [groupIdentity] Delete groupIdentity
             */

            /**
             * Constructs a new Delete.
             * @memberof d2d.GroupSync
             * @classdesc Represents a Delete.
             * @implements IDelete
             * @constructor
             * @param {d2d.GroupSync.IDelete=} [properties] Properties to set
             */
            function Delete(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Delete groupIdentity.
             * @member {common.GroupIdentity|null|undefined} groupIdentity
             * @memberof d2d.GroupSync.Delete
             * @instance
             */
            Delete.prototype.groupIdentity = null;

            /**
             * Encodes the specified Delete message. Does not implicitly {@link d2d.GroupSync.Delete.verify|verify} messages.
             * @function encode
             * @memberof d2d.GroupSync.Delete
             * @static
             * @param {d2d.GroupSync.Delete} message Delete message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Delete.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.groupIdentity != null && Object.hasOwnProperty.call(message, "groupIdentity"))
                    $root.common.GroupIdentity.encode(message.groupIdentity, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes a Delete message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.GroupSync.Delete
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.GroupSync.Delete} Delete
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Delete.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.GroupSync.Delete();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.groupIdentity = $root.common.GroupIdentity.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Delete;
        })();

        return GroupSync;
    })();

    d2d.DistributionListSync = (function() {

        /**
         * Properties of a DistributionListSync.
         * @memberof d2d
         * @interface IDistributionListSync
         * @property {d2d.DistributionListSync.Create|null} [create] DistributionListSync create
         * @property {d2d.DistributionListSync.Update|null} [update] DistributionListSync update
         * @property {d2d.DistributionListSync.Delete|null} ["delete"] DistributionListSync delete
         */

        /**
         * Constructs a new DistributionListSync.
         * @memberof d2d
         * @classdesc Represents a DistributionListSync.
         * @implements IDistributionListSync
         * @constructor
         * @param {d2d.IDistributionListSync=} [properties] Properties to set
         */
        function DistributionListSync(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DistributionListSync create.
         * @member {d2d.DistributionListSync.Create|null|undefined} create
         * @memberof d2d.DistributionListSync
         * @instance
         */
        DistributionListSync.prototype.create = null;

        /**
         * DistributionListSync update.
         * @member {d2d.DistributionListSync.Update|null|undefined} update
         * @memberof d2d.DistributionListSync
         * @instance
         */
        DistributionListSync.prototype.update = null;

        /**
         * DistributionListSync delete.
         * @member {d2d.DistributionListSync.Delete|null|undefined} delete
         * @memberof d2d.DistributionListSync
         * @instance
         */
        DistributionListSync.prototype["delete"] = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * DistributionListSync action.
         * @member {"create"|"update"|"delete"|undefined} action
         * @memberof d2d.DistributionListSync
         * @instance
         */
        Object.defineProperty(DistributionListSync.prototype, "action", {
            get: $util.oneOfGetter($oneOfFields = ["create", "update", "delete"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified DistributionListSync message. Does not implicitly {@link d2d.DistributionListSync.verify|verify} messages.
         * @function encode
         * @memberof d2d.DistributionListSync
         * @static
         * @param {d2d.DistributionListSync} message DistributionListSync message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DistributionListSync.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.create != null && Object.hasOwnProperty.call(message, "create"))
                $root.d2d.DistributionListSync.Create.encode(message.create, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.update != null && Object.hasOwnProperty.call(message, "update"))
                $root.d2d.DistributionListSync.Update.encode(message.update, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message["delete"] != null && Object.hasOwnProperty.call(message, "delete"))
                $root.d2d.DistributionListSync.Delete.encode(message["delete"], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a DistributionListSync message from the specified reader or buffer.
         * @function decode
         * @memberof d2d.DistributionListSync
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2d.DistributionListSync} DistributionListSync
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DistributionListSync.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.DistributionListSync();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.create = $root.d2d.DistributionListSync.Create.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.update = $root.d2d.DistributionListSync.Update.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message["delete"] = $root.d2d.DistributionListSync.Delete.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        DistributionListSync.Create = (function() {

            /**
             * Properties of a Create.
             * @memberof d2d.DistributionListSync
             * @interface ICreate
             * @property {sync.DistributionList|null} [distributionList] Create distributionList
             */

            /**
             * Constructs a new Create.
             * @memberof d2d.DistributionListSync
             * @classdesc Represents a Create.
             * @implements ICreate
             * @constructor
             * @param {d2d.DistributionListSync.ICreate=} [properties] Properties to set
             */
            function Create(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Create distributionList.
             * @member {sync.DistributionList|null|undefined} distributionList
             * @memberof d2d.DistributionListSync.Create
             * @instance
             */
            Create.prototype.distributionList = null;

            /**
             * Encodes the specified Create message. Does not implicitly {@link d2d.DistributionListSync.Create.verify|verify} messages.
             * @function encode
             * @memberof d2d.DistributionListSync.Create
             * @static
             * @param {d2d.DistributionListSync.Create} message Create message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Create.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.distributionList != null && Object.hasOwnProperty.call(message, "distributionList"))
                    $root.sync.DistributionList.encode(message.distributionList, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes a Create message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.DistributionListSync.Create
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.DistributionListSync.Create} Create
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Create.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.DistributionListSync.Create();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.distributionList = $root.sync.DistributionList.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Create;
        })();

        DistributionListSync.Update = (function() {

            /**
             * Properties of an Update.
             * @memberof d2d.DistributionListSync
             * @interface IUpdate
             * @property {sync.DistributionList|null} [distributionList] Update distributionList
             */

            /**
             * Constructs a new Update.
             * @memberof d2d.DistributionListSync
             * @classdesc Represents an Update.
             * @implements IUpdate
             * @constructor
             * @param {d2d.DistributionListSync.IUpdate=} [properties] Properties to set
             */
            function Update(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Update distributionList.
             * @member {sync.DistributionList|null|undefined} distributionList
             * @memberof d2d.DistributionListSync.Update
             * @instance
             */
            Update.prototype.distributionList = null;

            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.DistributionListSync.Update.verify|verify} messages.
             * @function encode
             * @memberof d2d.DistributionListSync.Update
             * @static
             * @param {d2d.DistributionListSync.Update} message Update message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Update.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.distributionList != null && Object.hasOwnProperty.call(message, "distributionList"))
                    $root.sync.DistributionList.encode(message.distributionList, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes an Update message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.DistributionListSync.Update
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.DistributionListSync.Update} Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Update.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.DistributionListSync.Update();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.distributionList = $root.sync.DistributionList.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Update;
        })();

        DistributionListSync.Delete = (function() {

            /**
             * Properties of a Delete.
             * @memberof d2d.DistributionListSync
             * @interface IDelete
             * @property {Long|null} [distributionListId] Delete distributionListId
             */

            /**
             * Constructs a new Delete.
             * @memberof d2d.DistributionListSync
             * @classdesc Represents a Delete.
             * @implements IDelete
             * @constructor
             * @param {d2d.DistributionListSync.IDelete=} [properties] Properties to set
             */
            function Delete(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Delete distributionListId.
             * @member {Long} distributionListId
             * @memberof d2d.DistributionListSync.Delete
             * @instance
             */
            Delete.prototype.distributionListId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

            /**
             * Encodes the specified Delete message. Does not implicitly {@link d2d.DistributionListSync.Delete.verify|verify} messages.
             * @function encode
             * @memberof d2d.DistributionListSync.Delete
             * @static
             * @param {d2d.DistributionListSync.Delete} message Delete message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Delete.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.distributionListId != null && Object.hasOwnProperty.call(message, "distributionListId"))
                    writer.uint32(/* id 1, wireType 1 =*/9).fixed64(message.distributionListId);
                return writer;
            };

            /**
             * Decodes a Delete message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.DistributionListSync.Delete
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.DistributionListSync.Delete} Delete
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Delete.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.DistributionListSync.Delete();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.distributionListId = reader.fixed64();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Delete;
        })();

        return DistributionListSync;
    })();

    d2d.SettingsSync = (function() {

        /**
         * Properties of a SettingsSync.
         * @memberof d2d
         * @interface ISettingsSync
         * @property {d2d.SettingsSync.Update|null} [update] SettingsSync update
         */

        /**
         * Constructs a new SettingsSync.
         * @memberof d2d
         * @classdesc Represents a SettingsSync.
         * @implements ISettingsSync
         * @constructor
         * @param {d2d.ISettingsSync=} [properties] Properties to set
         */
        function SettingsSync(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SettingsSync update.
         * @member {d2d.SettingsSync.Update|null|undefined} update
         * @memberof d2d.SettingsSync
         * @instance
         */
        SettingsSync.prototype.update = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * SettingsSync action.
         * @member {"update"|undefined} action
         * @memberof d2d.SettingsSync
         * @instance
         */
        Object.defineProperty(SettingsSync.prototype, "action", {
            get: $util.oneOfGetter($oneOfFields = ["update"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified SettingsSync message. Does not implicitly {@link d2d.SettingsSync.verify|verify} messages.
         * @function encode
         * @memberof d2d.SettingsSync
         * @static
         * @param {d2d.SettingsSync} message SettingsSync message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SettingsSync.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.update != null && Object.hasOwnProperty.call(message, "update"))
                $root.d2d.SettingsSync.Update.encode(message.update, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a SettingsSync message from the specified reader or buffer.
         * @function decode
         * @memberof d2d.SettingsSync
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2d.SettingsSync} SettingsSync
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SettingsSync.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.SettingsSync();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.update = $root.d2d.SettingsSync.Update.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        SettingsSync.Update = (function() {

            /**
             * Properties of an Update.
             * @memberof d2d.SettingsSync
             * @interface IUpdate
             * @property {sync.Settings|null} [settings] Update settings
             */

            /**
             * Constructs a new Update.
             * @memberof d2d.SettingsSync
             * @classdesc Represents an Update.
             * @implements IUpdate
             * @constructor
             * @param {d2d.SettingsSync.IUpdate=} [properties] Properties to set
             */
            function Update(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Update settings.
             * @member {sync.Settings|null|undefined} settings
             * @memberof d2d.SettingsSync.Update
             * @instance
             */
            Update.prototype.settings = null;

            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.SettingsSync.Update.verify|verify} messages.
             * @function encode
             * @memberof d2d.SettingsSync.Update
             * @static
             * @param {d2d.SettingsSync.Update} message Update message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Update.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.settings != null && Object.hasOwnProperty.call(message, "settings"))
                    $root.sync.Settings.encode(message.settings, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes an Update message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.SettingsSync.Update
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.SettingsSync.Update} Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Update.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.SettingsSync.Update();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.settings = $root.sync.Settings.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Update;
        })();

        return SettingsSync;
    })();

    d2d.MdmParameterSync = (function() {

        /**
         * Properties of a MdmParameterSync.
         * @memberof d2d
         * @interface IMdmParameterSync
         * @property {d2d.MdmParameterSync.Update|null} [update] MdmParameterSync update
         */

        /**
         * Constructs a new MdmParameterSync.
         * @memberof d2d
         * @classdesc Represents a MdmParameterSync.
         * @implements IMdmParameterSync
         * @constructor
         * @param {d2d.IMdmParameterSync=} [properties] Properties to set
         */
        function MdmParameterSync(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * MdmParameterSync update.
         * @member {d2d.MdmParameterSync.Update|null|undefined} update
         * @memberof d2d.MdmParameterSync
         * @instance
         */
        MdmParameterSync.prototype.update = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * MdmParameterSync action.
         * @member {"update"|undefined} action
         * @memberof d2d.MdmParameterSync
         * @instance
         */
        Object.defineProperty(MdmParameterSync.prototype, "action", {
            get: $util.oneOfGetter($oneOfFields = ["update"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified MdmParameterSync message. Does not implicitly {@link d2d.MdmParameterSync.verify|verify} messages.
         * @function encode
         * @memberof d2d.MdmParameterSync
         * @static
         * @param {d2d.MdmParameterSync} message MdmParameterSync message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        MdmParameterSync.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.update != null && Object.hasOwnProperty.call(message, "update"))
                $root.d2d.MdmParameterSync.Update.encode(message.update, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a MdmParameterSync message from the specified reader or buffer.
         * @function decode
         * @memberof d2d.MdmParameterSync
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2d.MdmParameterSync} MdmParameterSync
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MdmParameterSync.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.MdmParameterSync();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.update = $root.d2d.MdmParameterSync.Update.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        MdmParameterSync.Update = (function() {

            /**
             * Properties of an Update.
             * @memberof d2d.MdmParameterSync
             * @interface IUpdate
             * @property {sync.MdmParameters|null} [parameters] Update parameters
             */

            /**
             * Constructs a new Update.
             * @memberof d2d.MdmParameterSync
             * @classdesc Represents an Update.
             * @implements IUpdate
             * @constructor
             * @param {d2d.MdmParameterSync.IUpdate=} [properties] Properties to set
             */
            function Update(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Update parameters.
             * @member {sync.MdmParameters|null|undefined} parameters
             * @memberof d2d.MdmParameterSync.Update
             * @instance
             */
            Update.prototype.parameters = null;

            /**
             * Encodes the specified Update message. Does not implicitly {@link d2d.MdmParameterSync.Update.verify|verify} messages.
             * @function encode
             * @memberof d2d.MdmParameterSync.Update
             * @static
             * @param {d2d.MdmParameterSync.Update} message Update message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Update.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.parameters != null && Object.hasOwnProperty.call(message, "parameters"))
                    $root.sync.MdmParameters.encode(message.parameters, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes an Update message from the specified reader or buffer.
             * @function decode
             * @memberof d2d.MdmParameterSync.Update
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2d.MdmParameterSync.Update} Update
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Update.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2d.MdmParameterSync.Update();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.parameters = $root.sync.MdmParameters.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Update;
        })();

        return MdmParameterSync;
    })();

    return d2d;
})();

export const sync = $root.sync = (() => {

    /**
     * Namespace sync.
     * @exports sync
     * @namespace
     */
    const sync = {};

    /**
     * ReadReceiptPolicy enum.
     * @name sync.ReadReceiptPolicy
     * @enum {number}
     * @property {number} SEND_READ_RECEIPT=0 SEND_READ_RECEIPT value
     * @property {number} DONT_SEND_READ_RECEIPT=1 DONT_SEND_READ_RECEIPT value
     */
    sync.ReadReceiptPolicy = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "SEND_READ_RECEIPT"] = 0;
        values[valuesById[1] = "DONT_SEND_READ_RECEIPT"] = 1;
        return values;
    })();

    /**
     * TypingIndicatorPolicy enum.
     * @name sync.TypingIndicatorPolicy
     * @enum {number}
     * @property {number} SEND_TYPING_INDICATOR=0 SEND_TYPING_INDICATOR value
     * @property {number} DONT_SEND_TYPING_INDICATOR=1 DONT_SEND_TYPING_INDICATOR value
     */
    sync.TypingIndicatorPolicy = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "SEND_TYPING_INDICATOR"] = 0;
        values[valuesById[1] = "DONT_SEND_TYPING_INDICATOR"] = 1;
        return values;
    })();

    /**
     * NotificationSoundPolicy enum.
     * @name sync.NotificationSoundPolicy
     * @enum {number}
     * @property {number} MUTED=0 MUTED value
     */
    sync.NotificationSoundPolicy = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "MUTED"] = 0;
        return values;
    })();

    /**
     * ConversationVisibility enum.
     * @name sync.ConversationVisibility
     * @enum {number}
     * @property {number} NORMAL=0 NORMAL value
     * @property {number} PINNED=2 PINNED value
     * @property {number} ARCHIVED=1 ARCHIVED value
     */
    sync.ConversationVisibility = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "NORMAL"] = 0;
        values[valuesById[2] = "PINNED"] = 2;
        values[valuesById[1] = "ARCHIVED"] = 1;
        return values;
    })();

    /**
     * ConversationCategory enum.
     * @name sync.ConversationCategory
     * @enum {number}
     * @property {number} DEFAULT=0 DEFAULT value
     * @property {number} PROTECTED=1 PROTECTED value
     */
    sync.ConversationCategory = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "DEFAULT"] = 0;
        values[valuesById[1] = "PROTECTED"] = 1;
        return values;
    })();

    sync.MdmParameters = (function() {

        /**
         * Properties of a MdmParameters.
         * @memberof sync
         * @interface IMdmParameters
         * @property {Object.<string,sync.MdmParameters.Parameter>|null} [externalParameters] MdmParameters externalParameters
         * @property {Object.<string,sync.MdmParameters.Parameter>|null} [threemaParameters] MdmParameters threemaParameters
         * @property {sync.MdmParameters.ParameterPrecedence|null} [parameterPrecedence] MdmParameters parameterPrecedence
         */

        /**
         * Constructs a new MdmParameters.
         * @memberof sync
         * @classdesc Represents a MdmParameters.
         * @implements IMdmParameters
         * @constructor
         * @param {sync.IMdmParameters=} [properties] Properties to set
         */
        function MdmParameters(properties) {
            this.externalParameters = {};
            this.threemaParameters = {};
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * MdmParameters externalParameters.
         * @member {Object.<string,sync.MdmParameters.Parameter>} externalParameters
         * @memberof sync.MdmParameters
         * @instance
         */
        MdmParameters.prototype.externalParameters = $util.emptyObject;

        /**
         * MdmParameters threemaParameters.
         * @member {Object.<string,sync.MdmParameters.Parameter>} threemaParameters
         * @memberof sync.MdmParameters
         * @instance
         */
        MdmParameters.prototype.threemaParameters = $util.emptyObject;

        /**
         * MdmParameters parameterPrecedence.
         * @member {sync.MdmParameters.ParameterPrecedence} parameterPrecedence
         * @memberof sync.MdmParameters
         * @instance
         */
        MdmParameters.prototype.parameterPrecedence = 0;

        /**
         * Encodes the specified MdmParameters message. Does not implicitly {@link sync.MdmParameters.verify|verify} messages.
         * @function encode
         * @memberof sync.MdmParameters
         * @static
         * @param {sync.MdmParameters} message MdmParameters message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        MdmParameters.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.externalParameters != null && Object.hasOwnProperty.call(message, "externalParameters"))
                for (let keys = Object.keys(message.externalParameters), i = 0; i < keys.length; ++i) {
                    writer.uint32(/* id 1, wireType 2 =*/10).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                    $root.sync.MdmParameters.Parameter.encode(message.externalParameters[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                }
            if (message.threemaParameters != null && Object.hasOwnProperty.call(message, "threemaParameters"))
                for (let keys = Object.keys(message.threemaParameters), i = 0; i < keys.length; ++i) {
                    writer.uint32(/* id 2, wireType 2 =*/18).fork().uint32(/* id 1, wireType 2 =*/10).string(keys[i]);
                    $root.sync.MdmParameters.Parameter.encode(message.threemaParameters[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                }
            if (message.parameterPrecedence != null && Object.hasOwnProperty.call(message, "parameterPrecedence"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.parameterPrecedence);
            return writer;
        };

        /**
         * Decodes a MdmParameters message from the specified reader or buffer.
         * @function decode
         * @memberof sync.MdmParameters
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sync.MdmParameters} MdmParameters
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        MdmParameters.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.MdmParameters(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        if (message.externalParameters === $util.emptyObject)
                            message.externalParameters = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = null;
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = $root.sync.MdmParameters.Parameter.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.externalParameters[key] = value;
                        break;
                    }
                case 2: {
                        if (message.threemaParameters === $util.emptyObject)
                            message.threemaParameters = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = "";
                        value = null;
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.string();
                                break;
                            case 2:
                                value = $root.sync.MdmParameters.Parameter.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.threemaParameters[key] = value;
                        break;
                    }
                case 3: {
                        message.parameterPrecedence = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        MdmParameters.Parameter = (function() {

            /**
             * Properties of a Parameter.
             * @memberof sync.MdmParameters
             * @interface IParameter
             * @property {string|null} [stringValue] Parameter stringValue
             * @property {boolean|null} [booleanValue] Parameter booleanValue
             */

            /**
             * Constructs a new Parameter.
             * @memberof sync.MdmParameters
             * @classdesc Represents a Parameter.
             * @implements IParameter
             * @constructor
             * @param {sync.MdmParameters.IParameter=} [properties] Properties to set
             */
            function Parameter(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Parameter stringValue.
             * @member {string|null|undefined} stringValue
             * @memberof sync.MdmParameters.Parameter
             * @instance
             */
            Parameter.prototype.stringValue = null;

            /**
             * Parameter booleanValue.
             * @member {boolean|null|undefined} booleanValue
             * @memberof sync.MdmParameters.Parameter
             * @instance
             */
            Parameter.prototype.booleanValue = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * Parameter value.
             * @member {"stringValue"|"booleanValue"|undefined} value
             * @memberof sync.MdmParameters.Parameter
             * @instance
             */
            Object.defineProperty(Parameter.prototype, "value", {
                get: $util.oneOfGetter($oneOfFields = ["stringValue", "booleanValue"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified Parameter message. Does not implicitly {@link sync.MdmParameters.Parameter.verify|verify} messages.
             * @function encode
             * @memberof sync.MdmParameters.Parameter
             * @static
             * @param {sync.MdmParameters.Parameter} message Parameter message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Parameter.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.stringValue != null && Object.hasOwnProperty.call(message, "stringValue"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.stringValue);
                if (message.booleanValue != null && Object.hasOwnProperty.call(message, "booleanValue"))
                    writer.uint32(/* id 2, wireType 0 =*/16).bool(message.booleanValue);
                return writer;
            };

            /**
             * Decodes a Parameter message from the specified reader or buffer.
             * @function decode
             * @memberof sync.MdmParameters.Parameter
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {sync.MdmParameters.Parameter} Parameter
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Parameter.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.MdmParameters.Parameter();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.stringValue = reader.string();
                            break;
                        }
                    case 2: {
                            message.booleanValue = reader.bool();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Parameter;
        })();

        /**
         * ParameterPrecedence enum.
         * @name sync.MdmParameters.ParameterPrecedence
         * @enum {number}
         * @property {number} THREEMA=0 THREEMA value
         * @property {number} EXTERNAL=1 EXTERNAL value
         */
        MdmParameters.ParameterPrecedence = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "THREEMA"] = 0;
            values[valuesById[1] = "EXTERNAL"] = 1;
            return values;
        })();

        return MdmParameters;
    })();

    sync.ThreemaWorkCredentials = (function() {

        /**
         * Properties of a ThreemaWorkCredentials.
         * @memberof sync
         * @interface IThreemaWorkCredentials
         * @property {string|null} [username] ThreemaWorkCredentials username
         * @property {string|null} [password] ThreemaWorkCredentials password
         */

        /**
         * Constructs a new ThreemaWorkCredentials.
         * @memberof sync
         * @classdesc Represents a ThreemaWorkCredentials.
         * @implements IThreemaWorkCredentials
         * @constructor
         * @param {sync.IThreemaWorkCredentials=} [properties] Properties to set
         */
        function ThreemaWorkCredentials(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ThreemaWorkCredentials username.
         * @member {string} username
         * @memberof sync.ThreemaWorkCredentials
         * @instance
         */
        ThreemaWorkCredentials.prototype.username = "";

        /**
         * ThreemaWorkCredentials password.
         * @member {string} password
         * @memberof sync.ThreemaWorkCredentials
         * @instance
         */
        ThreemaWorkCredentials.prototype.password = "";

        /**
         * Encodes the specified ThreemaWorkCredentials message. Does not implicitly {@link sync.ThreemaWorkCredentials.verify|verify} messages.
         * @function encode
         * @memberof sync.ThreemaWorkCredentials
         * @static
         * @param {sync.ThreemaWorkCredentials} message ThreemaWorkCredentials message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ThreemaWorkCredentials.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.username != null && Object.hasOwnProperty.call(message, "username"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.username);
            if (message.password != null && Object.hasOwnProperty.call(message, "password"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.password);
            return writer;
        };

        /**
         * Decodes a ThreemaWorkCredentials message from the specified reader or buffer.
         * @function decode
         * @memberof sync.ThreemaWorkCredentials
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sync.ThreemaWorkCredentials} ThreemaWorkCredentials
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ThreemaWorkCredentials.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.ThreemaWorkCredentials();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.username = reader.string();
                        break;
                    }
                case 2: {
                        message.password = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return ThreemaWorkCredentials;
    })();

    sync.UserProfile = (function() {

        /**
         * Properties of a UserProfile.
         * @memberof sync
         * @interface IUserProfile
         * @property {string|null} [nickname] UserProfile nickname
         * @property {common.DeltaImage|null} [profilePicture] UserProfile profilePicture
         * @property {sync.UserProfile.ProfilePictureShareWith|null} [profilePictureShareWith] UserProfile profilePictureShareWith
         * @property {sync.UserProfile.IdentityLinks|null} [identityLinks] UserProfile identityLinks
         */

        /**
         * Constructs a new UserProfile.
         * @memberof sync
         * @classdesc Represents a UserProfile.
         * @implements IUserProfile
         * @constructor
         * @param {sync.IUserProfile=} [properties] Properties to set
         */
        function UserProfile(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * UserProfile nickname.
         * @member {string|null|undefined} nickname
         * @memberof sync.UserProfile
         * @instance
         */
        UserProfile.prototype.nickname = null;

        /**
         * UserProfile profilePicture.
         * @member {common.DeltaImage|null|undefined} profilePicture
         * @memberof sync.UserProfile
         * @instance
         */
        UserProfile.prototype.profilePicture = null;

        /**
         * UserProfile profilePictureShareWith.
         * @member {sync.UserProfile.ProfilePictureShareWith|null|undefined} profilePictureShareWith
         * @memberof sync.UserProfile
         * @instance
         */
        UserProfile.prototype.profilePictureShareWith = null;

        /**
         * UserProfile identityLinks.
         * @member {sync.UserProfile.IdentityLinks|null|undefined} identityLinks
         * @memberof sync.UserProfile
         * @instance
         */
        UserProfile.prototype.identityLinks = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * UserProfile _nickname.
         * @member {"nickname"|undefined} _nickname
         * @memberof sync.UserProfile
         * @instance
         */
        Object.defineProperty(UserProfile.prototype, "_nickname", {
            get: $util.oneOfGetter($oneOfFields = ["nickname"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified UserProfile message. Does not implicitly {@link sync.UserProfile.verify|verify} messages.
         * @function encode
         * @memberof sync.UserProfile
         * @static
         * @param {sync.UserProfile} message UserProfile message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        UserProfile.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.nickname != null && Object.hasOwnProperty.call(message, "nickname"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.nickname);
            if (message.profilePicture != null && Object.hasOwnProperty.call(message, "profilePicture"))
                $root.common.DeltaImage.encode(message.profilePicture, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.profilePictureShareWith != null && Object.hasOwnProperty.call(message, "profilePictureShareWith"))
                $root.sync.UserProfile.ProfilePictureShareWith.encode(message.profilePictureShareWith, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.identityLinks != null && Object.hasOwnProperty.call(message, "identityLinks"))
                $root.sync.UserProfile.IdentityLinks.encode(message.identityLinks, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a UserProfile message from the specified reader or buffer.
         * @function decode
         * @memberof sync.UserProfile
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sync.UserProfile} UserProfile
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        UserProfile.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.UserProfile();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.nickname = reader.string();
                        break;
                    }
                case 2: {
                        message.profilePicture = $root.common.DeltaImage.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.profilePictureShareWith = $root.sync.UserProfile.ProfilePictureShareWith.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.identityLinks = $root.sync.UserProfile.IdentityLinks.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        UserProfile.ProfilePictureShareWith = (function() {

            /**
             * Properties of a ProfilePictureShareWith.
             * @memberof sync.UserProfile
             * @interface IProfilePictureShareWith
             * @property {common.Unit|null} [nobody] ProfilePictureShareWith nobody
             * @property {common.Unit|null} [everyone] ProfilePictureShareWith everyone
             * @property {common.Identities|null} [allowList] ProfilePictureShareWith allowList
             */

            /**
             * Constructs a new ProfilePictureShareWith.
             * @memberof sync.UserProfile
             * @classdesc Represents a ProfilePictureShareWith.
             * @implements IProfilePictureShareWith
             * @constructor
             * @param {sync.UserProfile.IProfilePictureShareWith=} [properties] Properties to set
             */
            function ProfilePictureShareWith(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ProfilePictureShareWith nobody.
             * @member {common.Unit|null|undefined} nobody
             * @memberof sync.UserProfile.ProfilePictureShareWith
             * @instance
             */
            ProfilePictureShareWith.prototype.nobody = null;

            /**
             * ProfilePictureShareWith everyone.
             * @member {common.Unit|null|undefined} everyone
             * @memberof sync.UserProfile.ProfilePictureShareWith
             * @instance
             */
            ProfilePictureShareWith.prototype.everyone = null;

            /**
             * ProfilePictureShareWith allowList.
             * @member {common.Identities|null|undefined} allowList
             * @memberof sync.UserProfile.ProfilePictureShareWith
             * @instance
             */
            ProfilePictureShareWith.prototype.allowList = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * ProfilePictureShareWith policy.
             * @member {"nobody"|"everyone"|"allowList"|undefined} policy
             * @memberof sync.UserProfile.ProfilePictureShareWith
             * @instance
             */
            Object.defineProperty(ProfilePictureShareWith.prototype, "policy", {
                get: $util.oneOfGetter($oneOfFields = ["nobody", "everyone", "allowList"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified ProfilePictureShareWith message. Does not implicitly {@link sync.UserProfile.ProfilePictureShareWith.verify|verify} messages.
             * @function encode
             * @memberof sync.UserProfile.ProfilePictureShareWith
             * @static
             * @param {sync.UserProfile.ProfilePictureShareWith} message ProfilePictureShareWith message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ProfilePictureShareWith.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.nobody != null && Object.hasOwnProperty.call(message, "nobody"))
                    $root.common.Unit.encode(message.nobody, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.everyone != null && Object.hasOwnProperty.call(message, "everyone"))
                    $root.common.Unit.encode(message.everyone, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                if (message.allowList != null && Object.hasOwnProperty.call(message, "allowList"))
                    $root.common.Identities.encode(message.allowList, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes a ProfilePictureShareWith message from the specified reader or buffer.
             * @function decode
             * @memberof sync.UserProfile.ProfilePictureShareWith
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {sync.UserProfile.ProfilePictureShareWith} ProfilePictureShareWith
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ProfilePictureShareWith.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.UserProfile.ProfilePictureShareWith();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.nobody = $root.common.Unit.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.everyone = $root.common.Unit.decode(reader, reader.uint32());
                            break;
                        }
                    case 3: {
                            message.allowList = $root.common.Identities.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return ProfilePictureShareWith;
        })();

        UserProfile.IdentityLinks = (function() {

            /**
             * Properties of an IdentityLinks.
             * @memberof sync.UserProfile
             * @interface IIdentityLinks
             * @property {Array.<sync.UserProfile.IdentityLinks.IdentityLink>|null} [links] IdentityLinks links
             */

            /**
             * Constructs a new IdentityLinks.
             * @memberof sync.UserProfile
             * @classdesc Represents an IdentityLinks.
             * @implements IIdentityLinks
             * @constructor
             * @param {sync.UserProfile.IIdentityLinks=} [properties] Properties to set
             */
            function IdentityLinks(properties) {
                this.links = [];
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * IdentityLinks links.
             * @member {Array.<sync.UserProfile.IdentityLinks.IdentityLink>} links
             * @memberof sync.UserProfile.IdentityLinks
             * @instance
             */
            IdentityLinks.prototype.links = $util.emptyArray;

            /**
             * Encodes the specified IdentityLinks message. Does not implicitly {@link sync.UserProfile.IdentityLinks.verify|verify} messages.
             * @function encode
             * @memberof sync.UserProfile.IdentityLinks
             * @static
             * @param {sync.UserProfile.IdentityLinks} message IdentityLinks message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            IdentityLinks.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.links != null && message.links.length)
                    for (let i = 0; i < message.links.length; ++i)
                        $root.sync.UserProfile.IdentityLinks.IdentityLink.encode(message.links[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes an IdentityLinks message from the specified reader or buffer.
             * @function decode
             * @memberof sync.UserProfile.IdentityLinks
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {sync.UserProfile.IdentityLinks} IdentityLinks
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            IdentityLinks.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.UserProfile.IdentityLinks();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            if (!(message.links && message.links.length))
                                message.links = [];
                            message.links.push($root.sync.UserProfile.IdentityLinks.IdentityLink.decode(reader, reader.uint32()));
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            IdentityLinks.IdentityLink = (function() {

                /**
                 * Properties of an IdentityLink.
                 * @memberof sync.UserProfile.IdentityLinks
                 * @interface IIdentityLink
                 * @property {string|null} [phoneNumber] IdentityLink phoneNumber
                 * @property {string|null} [email] IdentityLink email
                 * @property {string|null} [description] IdentityLink description
                 */

                /**
                 * Constructs a new IdentityLink.
                 * @memberof sync.UserProfile.IdentityLinks
                 * @classdesc Represents an IdentityLink.
                 * @implements IIdentityLink
                 * @constructor
                 * @param {sync.UserProfile.IdentityLinks.IIdentityLink=} [properties] Properties to set
                 */
                function IdentityLink(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * IdentityLink phoneNumber.
                 * @member {string|null|undefined} phoneNumber
                 * @memberof sync.UserProfile.IdentityLinks.IdentityLink
                 * @instance
                 */
                IdentityLink.prototype.phoneNumber = null;

                /**
                 * IdentityLink email.
                 * @member {string|null|undefined} email
                 * @memberof sync.UserProfile.IdentityLinks.IdentityLink
                 * @instance
                 */
                IdentityLink.prototype.email = null;

                /**
                 * IdentityLink description.
                 * @member {string} description
                 * @memberof sync.UserProfile.IdentityLinks.IdentityLink
                 * @instance
                 */
                IdentityLink.prototype.description = "";

                // OneOf field names bound to virtual getters and setters
                let $oneOfFields;

                /**
                 * IdentityLink type.
                 * @member {"phoneNumber"|"email"|undefined} type
                 * @memberof sync.UserProfile.IdentityLinks.IdentityLink
                 * @instance
                 */
                Object.defineProperty(IdentityLink.prototype, "type", {
                    get: $util.oneOfGetter($oneOfFields = ["phoneNumber", "email"]),
                    set: $util.oneOfSetter($oneOfFields)
                });

                /**
                 * Encodes the specified IdentityLink message. Does not implicitly {@link sync.UserProfile.IdentityLinks.IdentityLink.verify|verify} messages.
                 * @function encode
                 * @memberof sync.UserProfile.IdentityLinks.IdentityLink
                 * @static
                 * @param {sync.UserProfile.IdentityLinks.IdentityLink} message IdentityLink message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                IdentityLink.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.phoneNumber != null && Object.hasOwnProperty.call(message, "phoneNumber"))
                        writer.uint32(/* id 1, wireType 2 =*/10).string(message.phoneNumber);
                    if (message.email != null && Object.hasOwnProperty.call(message, "email"))
                        writer.uint32(/* id 2, wireType 2 =*/18).string(message.email);
                    if (message.description != null && Object.hasOwnProperty.call(message, "description"))
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.description);
                    return writer;
                };

                /**
                 * Decodes an IdentityLink message from the specified reader or buffer.
                 * @function decode
                 * @memberof sync.UserProfile.IdentityLinks.IdentityLink
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {sync.UserProfile.IdentityLinks.IdentityLink} IdentityLink
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                IdentityLink.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.UserProfile.IdentityLinks.IdentityLink();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.phoneNumber = reader.string();
                                break;
                            }
                        case 2: {
                                message.email = reader.string();
                                break;
                            }
                        case 3: {
                                message.description = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return IdentityLink;
            })();

            return IdentityLinks;
        })();

        return UserProfile;
    })();

    sync.Contact = (function() {

        /**
         * Properties of a Contact.
         * @memberof sync
         * @interface IContact
         * @property {string|null} [identity] Contact identity
         * @property {Uint8Array|null} [publicKey] Contact publicKey
         * @property {Long|null} [createdAt] Contact createdAt
         * @property {string|null} [firstName] Contact firstName
         * @property {string|null} [lastName] Contact lastName
         * @property {string|null} [nickname] Contact nickname
         * @property {sync.Contact.VerificationLevel|null} [verificationLevel] Contact verificationLevel
         * @property {sync.Contact.WorkVerificationLevel|null} [workVerificationLevel] Contact workVerificationLevel
         * @property {sync.Contact.IdentityType|null} [identityType] Contact identityType
         * @property {sync.Contact.AcquaintanceLevel|null} [acquaintanceLevel] Contact acquaintanceLevel
         * @property {sync.Contact.ActivityState|null} [activityState] Contact activityState
         * @property {Long|null} [featureMask] Contact featureMask
         * @property {sync.Contact.SyncState|null} [syncState] Contact syncState
         * @property {sync.Contact.ReadReceiptPolicyOverride|null} [readReceiptPolicyOverride] Contact readReceiptPolicyOverride
         * @property {sync.Contact.TypingIndicatorPolicyOverride|null} [typingIndicatorPolicyOverride] Contact typingIndicatorPolicyOverride
         * @property {sync.Contact.NotificationTriggerPolicyOverride|null} [notificationTriggerPolicyOverride] Contact notificationTriggerPolicyOverride
         * @property {sync.Contact.NotificationSoundPolicyOverride|null} [notificationSoundPolicyOverride] Contact notificationSoundPolicyOverride
         * @property {common.DeltaImage|null} [contactDefinedProfilePicture] Contact contactDefinedProfilePicture
         * @property {common.DeltaImage|null} [userDefinedProfilePicture] Contact userDefinedProfilePicture
         * @property {sync.ConversationCategory|null} [conversationCategory] Contact conversationCategory
         * @property {sync.ConversationVisibility|null} [conversationVisibility] Contact conversationVisibility
         */

        /**
         * Constructs a new Contact.
         * @memberof sync
         * @classdesc Represents a Contact.
         * @implements IContact
         * @constructor
         * @param {sync.IContact=} [properties] Properties to set
         */
        function Contact(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Contact identity.
         * @member {string} identity
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.identity = "";

        /**
         * Contact publicKey.
         * @member {Uint8Array|null|undefined} publicKey
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.publicKey = null;

        /**
         * Contact createdAt.
         * @member {Long|null|undefined} createdAt
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.createdAt = null;

        /**
         * Contact firstName.
         * @member {string|null|undefined} firstName
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.firstName = null;

        /**
         * Contact lastName.
         * @member {string|null|undefined} lastName
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.lastName = null;

        /**
         * Contact nickname.
         * @member {string|null|undefined} nickname
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.nickname = null;

        /**
         * Contact verificationLevel.
         * @member {sync.Contact.VerificationLevel|null|undefined} verificationLevel
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.verificationLevel = null;

        /**
         * Contact workVerificationLevel.
         * @member {sync.Contact.WorkVerificationLevel|null|undefined} workVerificationLevel
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.workVerificationLevel = null;

        /**
         * Contact identityType.
         * @member {sync.Contact.IdentityType|null|undefined} identityType
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.identityType = null;

        /**
         * Contact acquaintanceLevel.
         * @member {sync.Contact.AcquaintanceLevel|null|undefined} acquaintanceLevel
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.acquaintanceLevel = null;

        /**
         * Contact activityState.
         * @member {sync.Contact.ActivityState|null|undefined} activityState
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.activityState = null;

        /**
         * Contact featureMask.
         * @member {Long|null|undefined} featureMask
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.featureMask = null;

        /**
         * Contact syncState.
         * @member {sync.Contact.SyncState|null|undefined} syncState
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.syncState = null;

        /**
         * Contact readReceiptPolicyOverride.
         * @member {sync.Contact.ReadReceiptPolicyOverride|null|undefined} readReceiptPolicyOverride
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.readReceiptPolicyOverride = null;

        /**
         * Contact typingIndicatorPolicyOverride.
         * @member {sync.Contact.TypingIndicatorPolicyOverride|null|undefined} typingIndicatorPolicyOverride
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.typingIndicatorPolicyOverride = null;

        /**
         * Contact notificationTriggerPolicyOverride.
         * @member {sync.Contact.NotificationTriggerPolicyOverride|null|undefined} notificationTriggerPolicyOverride
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.notificationTriggerPolicyOverride = null;

        /**
         * Contact notificationSoundPolicyOverride.
         * @member {sync.Contact.NotificationSoundPolicyOverride|null|undefined} notificationSoundPolicyOverride
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.notificationSoundPolicyOverride = null;

        /**
         * Contact contactDefinedProfilePicture.
         * @member {common.DeltaImage|null|undefined} contactDefinedProfilePicture
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.contactDefinedProfilePicture = null;

        /**
         * Contact userDefinedProfilePicture.
         * @member {common.DeltaImage|null|undefined} userDefinedProfilePicture
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.userDefinedProfilePicture = null;

        /**
         * Contact conversationCategory.
         * @member {sync.ConversationCategory|null|undefined} conversationCategory
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.conversationCategory = null;

        /**
         * Contact conversationVisibility.
         * @member {sync.ConversationVisibility|null|undefined} conversationVisibility
         * @memberof sync.Contact
         * @instance
         */
        Contact.prototype.conversationVisibility = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * Contact _publicKey.
         * @member {"publicKey"|undefined} _publicKey
         * @memberof sync.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, "_publicKey", {
            get: $util.oneOfGetter($oneOfFields = ["publicKey"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Contact _createdAt.
         * @member {"createdAt"|undefined} _createdAt
         * @memberof sync.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, "_createdAt", {
            get: $util.oneOfGetter($oneOfFields = ["createdAt"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Contact _firstName.
         * @member {"firstName"|undefined} _firstName
         * @memberof sync.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, "_firstName", {
            get: $util.oneOfGetter($oneOfFields = ["firstName"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Contact _lastName.
         * @member {"lastName"|undefined} _lastName
         * @memberof sync.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, "_lastName", {
            get: $util.oneOfGetter($oneOfFields = ["lastName"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Contact _nickname.
         * @member {"nickname"|undefined} _nickname
         * @memberof sync.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, "_nickname", {
            get: $util.oneOfGetter($oneOfFields = ["nickname"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Contact _verificationLevel.
         * @member {"verificationLevel"|undefined} _verificationLevel
         * @memberof sync.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, "_verificationLevel", {
            get: $util.oneOfGetter($oneOfFields = ["verificationLevel"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Contact _workVerificationLevel.
         * @member {"workVerificationLevel"|undefined} _workVerificationLevel
         * @memberof sync.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, "_workVerificationLevel", {
            get: $util.oneOfGetter($oneOfFields = ["workVerificationLevel"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Contact _identityType.
         * @member {"identityType"|undefined} _identityType
         * @memberof sync.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, "_identityType", {
            get: $util.oneOfGetter($oneOfFields = ["identityType"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Contact _acquaintanceLevel.
         * @member {"acquaintanceLevel"|undefined} _acquaintanceLevel
         * @memberof sync.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, "_acquaintanceLevel", {
            get: $util.oneOfGetter($oneOfFields = ["acquaintanceLevel"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Contact _activityState.
         * @member {"activityState"|undefined} _activityState
         * @memberof sync.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, "_activityState", {
            get: $util.oneOfGetter($oneOfFields = ["activityState"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Contact _featureMask.
         * @member {"featureMask"|undefined} _featureMask
         * @memberof sync.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, "_featureMask", {
            get: $util.oneOfGetter($oneOfFields = ["featureMask"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Contact _syncState.
         * @member {"syncState"|undefined} _syncState
         * @memberof sync.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, "_syncState", {
            get: $util.oneOfGetter($oneOfFields = ["syncState"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Contact _conversationCategory.
         * @member {"conversationCategory"|undefined} _conversationCategory
         * @memberof sync.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, "_conversationCategory", {
            get: $util.oneOfGetter($oneOfFields = ["conversationCategory"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Contact _conversationVisibility.
         * @member {"conversationVisibility"|undefined} _conversationVisibility
         * @memberof sync.Contact
         * @instance
         */
        Object.defineProperty(Contact.prototype, "_conversationVisibility", {
            get: $util.oneOfGetter($oneOfFields = ["conversationVisibility"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified Contact message. Does not implicitly {@link sync.Contact.verify|verify} messages.
         * @function encode
         * @memberof sync.Contact
         * @static
         * @param {sync.Contact} message Contact message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Contact.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.identity != null && Object.hasOwnProperty.call(message, "identity"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.identity);
            if (message.publicKey != null && Object.hasOwnProperty.call(message, "publicKey"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.publicKey);
            if (message.createdAt != null && Object.hasOwnProperty.call(message, "createdAt"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.createdAt);
            if (message.firstName != null && Object.hasOwnProperty.call(message, "firstName"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.firstName);
            if (message.lastName != null && Object.hasOwnProperty.call(message, "lastName"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.lastName);
            if (message.nickname != null && Object.hasOwnProperty.call(message, "nickname"))
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.nickname);
            if (message.verificationLevel != null && Object.hasOwnProperty.call(message, "verificationLevel"))
                writer.uint32(/* id 7, wireType 0 =*/56).int32(message.verificationLevel);
            if (message.identityType != null && Object.hasOwnProperty.call(message, "identityType"))
                writer.uint32(/* id 8, wireType 0 =*/64).int32(message.identityType);
            if (message.acquaintanceLevel != null && Object.hasOwnProperty.call(message, "acquaintanceLevel"))
                writer.uint32(/* id 9, wireType 0 =*/72).int32(message.acquaintanceLevel);
            if (message.activityState != null && Object.hasOwnProperty.call(message, "activityState"))
                writer.uint32(/* id 10, wireType 0 =*/80).int32(message.activityState);
            if (message.conversationCategory != null && Object.hasOwnProperty.call(message, "conversationCategory"))
                writer.uint32(/* id 11, wireType 0 =*/88).int32(message.conversationCategory);
            if (message.conversationVisibility != null && Object.hasOwnProperty.call(message, "conversationVisibility"))
                writer.uint32(/* id 12, wireType 0 =*/96).int32(message.conversationVisibility);
            if (message.syncState != null && Object.hasOwnProperty.call(message, "syncState"))
                writer.uint32(/* id 13, wireType 0 =*/104).int32(message.syncState);
            if (message.contactDefinedProfilePicture != null && Object.hasOwnProperty.call(message, "contactDefinedProfilePicture"))
                $root.common.DeltaImage.encode(message.contactDefinedProfilePicture, writer.uint32(/* id 14, wireType 2 =*/114).fork()).ldelim();
            if (message.userDefinedProfilePicture != null && Object.hasOwnProperty.call(message, "userDefinedProfilePicture"))
                $root.common.DeltaImage.encode(message.userDefinedProfilePicture, writer.uint32(/* id 15, wireType 2 =*/122).fork()).ldelim();
            if (message.readReceiptPolicyOverride != null && Object.hasOwnProperty.call(message, "readReceiptPolicyOverride"))
                $root.sync.Contact.ReadReceiptPolicyOverride.encode(message.readReceiptPolicyOverride, writer.uint32(/* id 16, wireType 2 =*/130).fork()).ldelim();
            if (message.typingIndicatorPolicyOverride != null && Object.hasOwnProperty.call(message, "typingIndicatorPolicyOverride"))
                $root.sync.Contact.TypingIndicatorPolicyOverride.encode(message.typingIndicatorPolicyOverride, writer.uint32(/* id 17, wireType 2 =*/138).fork()).ldelim();
            if (message.featureMask != null && Object.hasOwnProperty.call(message, "featureMask"))
                writer.uint32(/* id 18, wireType 0 =*/144).uint64(message.featureMask);
            if (message.notificationTriggerPolicyOverride != null && Object.hasOwnProperty.call(message, "notificationTriggerPolicyOverride"))
                $root.sync.Contact.NotificationTriggerPolicyOverride.encode(message.notificationTriggerPolicyOverride, writer.uint32(/* id 19, wireType 2 =*/154).fork()).ldelim();
            if (message.notificationSoundPolicyOverride != null && Object.hasOwnProperty.call(message, "notificationSoundPolicyOverride"))
                $root.sync.Contact.NotificationSoundPolicyOverride.encode(message.notificationSoundPolicyOverride, writer.uint32(/* id 20, wireType 2 =*/162).fork()).ldelim();
            if (message.workVerificationLevel != null && Object.hasOwnProperty.call(message, "workVerificationLevel"))
                writer.uint32(/* id 21, wireType 0 =*/168).int32(message.workVerificationLevel);
            return writer;
        };

        /**
         * Decodes a Contact message from the specified reader or buffer.
         * @function decode
         * @memberof sync.Contact
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sync.Contact} Contact
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Contact.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.Contact();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.identity = reader.string();
                        break;
                    }
                case 2: {
                        message.publicKey = reader.bytes();
                        break;
                    }
                case 3: {
                        message.createdAt = reader.uint64();
                        break;
                    }
                case 4: {
                        message.firstName = reader.string();
                        break;
                    }
                case 5: {
                        message.lastName = reader.string();
                        break;
                    }
                case 6: {
                        message.nickname = reader.string();
                        break;
                    }
                case 7: {
                        message.verificationLevel = reader.int32();
                        break;
                    }
                case 21: {
                        message.workVerificationLevel = reader.int32();
                        break;
                    }
                case 8: {
                        message.identityType = reader.int32();
                        break;
                    }
                case 9: {
                        message.acquaintanceLevel = reader.int32();
                        break;
                    }
                case 10: {
                        message.activityState = reader.int32();
                        break;
                    }
                case 18: {
                        message.featureMask = reader.uint64();
                        break;
                    }
                case 13: {
                        message.syncState = reader.int32();
                        break;
                    }
                case 16: {
                        message.readReceiptPolicyOverride = $root.sync.Contact.ReadReceiptPolicyOverride.decode(reader, reader.uint32());
                        break;
                    }
                case 17: {
                        message.typingIndicatorPolicyOverride = $root.sync.Contact.TypingIndicatorPolicyOverride.decode(reader, reader.uint32());
                        break;
                    }
                case 19: {
                        message.notificationTriggerPolicyOverride = $root.sync.Contact.NotificationTriggerPolicyOverride.decode(reader, reader.uint32());
                        break;
                    }
                case 20: {
                        message.notificationSoundPolicyOverride = $root.sync.Contact.NotificationSoundPolicyOverride.decode(reader, reader.uint32());
                        break;
                    }
                case 14: {
                        message.contactDefinedProfilePicture = $root.common.DeltaImage.decode(reader, reader.uint32());
                        break;
                    }
                case 15: {
                        message.userDefinedProfilePicture = $root.common.DeltaImage.decode(reader, reader.uint32());
                        break;
                    }
                case 11: {
                        message.conversationCategory = reader.int32();
                        break;
                    }
                case 12: {
                        message.conversationVisibility = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * VerificationLevel enum.
         * @name sync.Contact.VerificationLevel
         * @enum {number}
         * @property {number} UNVERIFIED=0 UNVERIFIED value
         * @property {number} SERVER_VERIFIED=1 SERVER_VERIFIED value
         * @property {number} FULLY_VERIFIED=2 FULLY_VERIFIED value
         */
        Contact.VerificationLevel = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "UNVERIFIED"] = 0;
            values[valuesById[1] = "SERVER_VERIFIED"] = 1;
            values[valuesById[2] = "FULLY_VERIFIED"] = 2;
            return values;
        })();

        /**
         * WorkVerificationLevel enum.
         * @name sync.Contact.WorkVerificationLevel
         * @enum {number}
         * @property {number} NONE=0 NONE value
         * @property {number} WORK_SUBSCRIPTION_VERIFIED=1 WORK_SUBSCRIPTION_VERIFIED value
         */
        Contact.WorkVerificationLevel = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "NONE"] = 0;
            values[valuesById[1] = "WORK_SUBSCRIPTION_VERIFIED"] = 1;
            return values;
        })();

        /**
         * IdentityType enum.
         * @name sync.Contact.IdentityType
         * @enum {number}
         * @property {number} REGULAR=0 REGULAR value
         * @property {number} WORK=1 WORK value
         */
        Contact.IdentityType = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "REGULAR"] = 0;
            values[valuesById[1] = "WORK"] = 1;
            return values;
        })();

        /**
         * AcquaintanceLevel enum.
         * @name sync.Contact.AcquaintanceLevel
         * @enum {number}
         * @property {number} DIRECT=0 DIRECT value
         * @property {number} GROUP=1 GROUP value
         */
        Contact.AcquaintanceLevel = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "DIRECT"] = 0;
            values[valuesById[1] = "GROUP"] = 1;
            return values;
        })();

        /**
         * ActivityState enum.
         * @name sync.Contact.ActivityState
         * @enum {number}
         * @property {number} ACTIVE=0 ACTIVE value
         * @property {number} INACTIVE=1 INACTIVE value
         * @property {number} INVALID=2 INVALID value
         */
        Contact.ActivityState = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "ACTIVE"] = 0;
            values[valuesById[1] = "INACTIVE"] = 1;
            values[valuesById[2] = "INVALID"] = 2;
            return values;
        })();

        /**
         * SyncState enum.
         * @name sync.Contact.SyncState
         * @enum {number}
         * @property {number} INITIAL=0 INITIAL value
         * @property {number} IMPORTED=1 IMPORTED value
         * @property {number} CUSTOM=2 CUSTOM value
         */
        Contact.SyncState = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "INITIAL"] = 0;
            values[valuesById[1] = "IMPORTED"] = 1;
            values[valuesById[2] = "CUSTOM"] = 2;
            return values;
        })();

        Contact.ReadReceiptPolicyOverride = (function() {

            /**
             * Properties of a ReadReceiptPolicyOverride.
             * @memberof sync.Contact
             * @interface IReadReceiptPolicyOverride
             * @property {common.Unit|null} ["default"] ReadReceiptPolicyOverride default
             * @property {sync.ReadReceiptPolicy|null} [policy] ReadReceiptPolicyOverride policy
             */

            /**
             * Constructs a new ReadReceiptPolicyOverride.
             * @memberof sync.Contact
             * @classdesc Represents a ReadReceiptPolicyOverride.
             * @implements IReadReceiptPolicyOverride
             * @constructor
             * @param {sync.Contact.IReadReceiptPolicyOverride=} [properties] Properties to set
             */
            function ReadReceiptPolicyOverride(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * ReadReceiptPolicyOverride default.
             * @member {common.Unit|null|undefined} default
             * @memberof sync.Contact.ReadReceiptPolicyOverride
             * @instance
             */
            ReadReceiptPolicyOverride.prototype["default"] = null;

            /**
             * ReadReceiptPolicyOverride policy.
             * @member {sync.ReadReceiptPolicy|null|undefined} policy
             * @memberof sync.Contact.ReadReceiptPolicyOverride
             * @instance
             */
            ReadReceiptPolicyOverride.prototype.policy = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * ReadReceiptPolicyOverride override.
             * @member {"default"|"policy"|undefined} override
             * @memberof sync.Contact.ReadReceiptPolicyOverride
             * @instance
             */
            Object.defineProperty(ReadReceiptPolicyOverride.prototype, "override", {
                get: $util.oneOfGetter($oneOfFields = ["default", "policy"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified ReadReceiptPolicyOverride message. Does not implicitly {@link sync.Contact.ReadReceiptPolicyOverride.verify|verify} messages.
             * @function encode
             * @memberof sync.Contact.ReadReceiptPolicyOverride
             * @static
             * @param {sync.Contact.ReadReceiptPolicyOverride} message ReadReceiptPolicyOverride message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            ReadReceiptPolicyOverride.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message["default"] != null && Object.hasOwnProperty.call(message, "default"))
                    $root.common.Unit.encode(message["default"], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.policy != null && Object.hasOwnProperty.call(message, "policy"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.policy);
                return writer;
            };

            /**
             * Decodes a ReadReceiptPolicyOverride message from the specified reader or buffer.
             * @function decode
             * @memberof sync.Contact.ReadReceiptPolicyOverride
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {sync.Contact.ReadReceiptPolicyOverride} ReadReceiptPolicyOverride
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            ReadReceiptPolicyOverride.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.Contact.ReadReceiptPolicyOverride();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message["default"] = $root.common.Unit.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.policy = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return ReadReceiptPolicyOverride;
        })();

        Contact.TypingIndicatorPolicyOverride = (function() {

            /**
             * Properties of a TypingIndicatorPolicyOverride.
             * @memberof sync.Contact
             * @interface ITypingIndicatorPolicyOverride
             * @property {common.Unit|null} ["default"] TypingIndicatorPolicyOverride default
             * @property {sync.TypingIndicatorPolicy|null} [policy] TypingIndicatorPolicyOverride policy
             */

            /**
             * Constructs a new TypingIndicatorPolicyOverride.
             * @memberof sync.Contact
             * @classdesc Represents a TypingIndicatorPolicyOverride.
             * @implements ITypingIndicatorPolicyOverride
             * @constructor
             * @param {sync.Contact.ITypingIndicatorPolicyOverride=} [properties] Properties to set
             */
            function TypingIndicatorPolicyOverride(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * TypingIndicatorPolicyOverride default.
             * @member {common.Unit|null|undefined} default
             * @memberof sync.Contact.TypingIndicatorPolicyOverride
             * @instance
             */
            TypingIndicatorPolicyOverride.prototype["default"] = null;

            /**
             * TypingIndicatorPolicyOverride policy.
             * @member {sync.TypingIndicatorPolicy|null|undefined} policy
             * @memberof sync.Contact.TypingIndicatorPolicyOverride
             * @instance
             */
            TypingIndicatorPolicyOverride.prototype.policy = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * TypingIndicatorPolicyOverride override.
             * @member {"default"|"policy"|undefined} override
             * @memberof sync.Contact.TypingIndicatorPolicyOverride
             * @instance
             */
            Object.defineProperty(TypingIndicatorPolicyOverride.prototype, "override", {
                get: $util.oneOfGetter($oneOfFields = ["default", "policy"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified TypingIndicatorPolicyOverride message. Does not implicitly {@link sync.Contact.TypingIndicatorPolicyOverride.verify|verify} messages.
             * @function encode
             * @memberof sync.Contact.TypingIndicatorPolicyOverride
             * @static
             * @param {sync.Contact.TypingIndicatorPolicyOverride} message TypingIndicatorPolicyOverride message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            TypingIndicatorPolicyOverride.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message["default"] != null && Object.hasOwnProperty.call(message, "default"))
                    $root.common.Unit.encode(message["default"], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.policy != null && Object.hasOwnProperty.call(message, "policy"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.policy);
                return writer;
            };

            /**
             * Decodes a TypingIndicatorPolicyOverride message from the specified reader or buffer.
             * @function decode
             * @memberof sync.Contact.TypingIndicatorPolicyOverride
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {sync.Contact.TypingIndicatorPolicyOverride} TypingIndicatorPolicyOverride
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            TypingIndicatorPolicyOverride.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.Contact.TypingIndicatorPolicyOverride();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message["default"] = $root.common.Unit.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.policy = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return TypingIndicatorPolicyOverride;
        })();

        Contact.NotificationTriggerPolicyOverride = (function() {

            /**
             * Properties of a NotificationTriggerPolicyOverride.
             * @memberof sync.Contact
             * @interface INotificationTriggerPolicyOverride
             * @property {common.Unit|null} ["default"] NotificationTriggerPolicyOverride default
             * @property {sync.Contact.NotificationTriggerPolicyOverride.Policy|null} [policy] NotificationTriggerPolicyOverride policy
             */

            /**
             * Constructs a new NotificationTriggerPolicyOverride.
             * @memberof sync.Contact
             * @classdesc Represents a NotificationTriggerPolicyOverride.
             * @implements INotificationTriggerPolicyOverride
             * @constructor
             * @param {sync.Contact.INotificationTriggerPolicyOverride=} [properties] Properties to set
             */
            function NotificationTriggerPolicyOverride(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * NotificationTriggerPolicyOverride default.
             * @member {common.Unit|null|undefined} default
             * @memberof sync.Contact.NotificationTriggerPolicyOverride
             * @instance
             */
            NotificationTriggerPolicyOverride.prototype["default"] = null;

            /**
             * NotificationTriggerPolicyOverride policy.
             * @member {sync.Contact.NotificationTriggerPolicyOverride.Policy|null|undefined} policy
             * @memberof sync.Contact.NotificationTriggerPolicyOverride
             * @instance
             */
            NotificationTriggerPolicyOverride.prototype.policy = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * NotificationTriggerPolicyOverride override.
             * @member {"default"|"policy"|undefined} override
             * @memberof sync.Contact.NotificationTriggerPolicyOverride
             * @instance
             */
            Object.defineProperty(NotificationTriggerPolicyOverride.prototype, "override", {
                get: $util.oneOfGetter($oneOfFields = ["default", "policy"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified NotificationTriggerPolicyOverride message. Does not implicitly {@link sync.Contact.NotificationTriggerPolicyOverride.verify|verify} messages.
             * @function encode
             * @memberof sync.Contact.NotificationTriggerPolicyOverride
             * @static
             * @param {sync.Contact.NotificationTriggerPolicyOverride} message NotificationTriggerPolicyOverride message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NotificationTriggerPolicyOverride.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message["default"] != null && Object.hasOwnProperty.call(message, "default"))
                    $root.common.Unit.encode(message["default"], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.policy != null && Object.hasOwnProperty.call(message, "policy"))
                    $root.sync.Contact.NotificationTriggerPolicyOverride.Policy.encode(message.policy, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes a NotificationTriggerPolicyOverride message from the specified reader or buffer.
             * @function decode
             * @memberof sync.Contact.NotificationTriggerPolicyOverride
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {sync.Contact.NotificationTriggerPolicyOverride} NotificationTriggerPolicyOverride
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NotificationTriggerPolicyOverride.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.Contact.NotificationTriggerPolicyOverride();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message["default"] = $root.common.Unit.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.policy = $root.sync.Contact.NotificationTriggerPolicyOverride.Policy.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            NotificationTriggerPolicyOverride.Policy = (function() {

                /**
                 * Properties of a Policy.
                 * @memberof sync.Contact.NotificationTriggerPolicyOverride
                 * @interface IPolicy
                 * @property {sync.Contact.NotificationTriggerPolicyOverride.Policy.NotificationTriggerPolicy|null} [policy] Policy policy
                 * @property {Long|null} [expiresAt] Policy expiresAt
                 */

                /**
                 * Constructs a new Policy.
                 * @memberof sync.Contact.NotificationTriggerPolicyOverride
                 * @classdesc Represents a Policy.
                 * @implements IPolicy
                 * @constructor
                 * @param {sync.Contact.NotificationTriggerPolicyOverride.IPolicy=} [properties] Properties to set
                 */
                function Policy(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Policy policy.
                 * @member {sync.Contact.NotificationTriggerPolicyOverride.Policy.NotificationTriggerPolicy} policy
                 * @memberof sync.Contact.NotificationTriggerPolicyOverride.Policy
                 * @instance
                 */
                Policy.prototype.policy = 0;

                /**
                 * Policy expiresAt.
                 * @member {Long|null|undefined} expiresAt
                 * @memberof sync.Contact.NotificationTriggerPolicyOverride.Policy
                 * @instance
                 */
                Policy.prototype.expiresAt = null;

                // OneOf field names bound to virtual getters and setters
                let $oneOfFields;

                /**
                 * Policy _expiresAt.
                 * @member {"expiresAt"|undefined} _expiresAt
                 * @memberof sync.Contact.NotificationTriggerPolicyOverride.Policy
                 * @instance
                 */
                Object.defineProperty(Policy.prototype, "_expiresAt", {
                    get: $util.oneOfGetter($oneOfFields = ["expiresAt"]),
                    set: $util.oneOfSetter($oneOfFields)
                });

                /**
                 * Encodes the specified Policy message. Does not implicitly {@link sync.Contact.NotificationTriggerPolicyOverride.Policy.verify|verify} messages.
                 * @function encode
                 * @memberof sync.Contact.NotificationTriggerPolicyOverride.Policy
                 * @static
                 * @param {sync.Contact.NotificationTriggerPolicyOverride.Policy} message Policy message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Policy.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.policy != null && Object.hasOwnProperty.call(message, "policy"))
                        writer.uint32(/* id 1, wireType 0 =*/8).int32(message.policy);
                    if (message.expiresAt != null && Object.hasOwnProperty.call(message, "expiresAt"))
                        writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.expiresAt);
                    return writer;
                };

                /**
                 * Decodes a Policy message from the specified reader or buffer.
                 * @function decode
                 * @memberof sync.Contact.NotificationTriggerPolicyOverride.Policy
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {sync.Contact.NotificationTriggerPolicyOverride.Policy} Policy
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Policy.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.Contact.NotificationTriggerPolicyOverride.Policy();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.policy = reader.int32();
                                break;
                            }
                        case 2: {
                                message.expiresAt = reader.uint64();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * NotificationTriggerPolicy enum.
                 * @name sync.Contact.NotificationTriggerPolicyOverride.Policy.NotificationTriggerPolicy
                 * @enum {number}
                 * @property {number} NEVER=0 NEVER value
                 */
                Policy.NotificationTriggerPolicy = (function() {
                    const valuesById = {}, values = Object.create(valuesById);
                    values[valuesById[0] = "NEVER"] = 0;
                    return values;
                })();

                return Policy;
            })();

            return NotificationTriggerPolicyOverride;
        })();

        Contact.NotificationSoundPolicyOverride = (function() {

            /**
             * Properties of a NotificationSoundPolicyOverride.
             * @memberof sync.Contact
             * @interface INotificationSoundPolicyOverride
             * @property {common.Unit|null} ["default"] NotificationSoundPolicyOverride default
             * @property {sync.NotificationSoundPolicy|null} [policy] NotificationSoundPolicyOverride policy
             */

            /**
             * Constructs a new NotificationSoundPolicyOverride.
             * @memberof sync.Contact
             * @classdesc Represents a NotificationSoundPolicyOverride.
             * @implements INotificationSoundPolicyOverride
             * @constructor
             * @param {sync.Contact.INotificationSoundPolicyOverride=} [properties] Properties to set
             */
            function NotificationSoundPolicyOverride(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * NotificationSoundPolicyOverride default.
             * @member {common.Unit|null|undefined} default
             * @memberof sync.Contact.NotificationSoundPolicyOverride
             * @instance
             */
            NotificationSoundPolicyOverride.prototype["default"] = null;

            /**
             * NotificationSoundPolicyOverride policy.
             * @member {sync.NotificationSoundPolicy|null|undefined} policy
             * @memberof sync.Contact.NotificationSoundPolicyOverride
             * @instance
             */
            NotificationSoundPolicyOverride.prototype.policy = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * NotificationSoundPolicyOverride override.
             * @member {"default"|"policy"|undefined} override
             * @memberof sync.Contact.NotificationSoundPolicyOverride
             * @instance
             */
            Object.defineProperty(NotificationSoundPolicyOverride.prototype, "override", {
                get: $util.oneOfGetter($oneOfFields = ["default", "policy"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified NotificationSoundPolicyOverride message. Does not implicitly {@link sync.Contact.NotificationSoundPolicyOverride.verify|verify} messages.
             * @function encode
             * @memberof sync.Contact.NotificationSoundPolicyOverride
             * @static
             * @param {sync.Contact.NotificationSoundPolicyOverride} message NotificationSoundPolicyOverride message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NotificationSoundPolicyOverride.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message["default"] != null && Object.hasOwnProperty.call(message, "default"))
                    $root.common.Unit.encode(message["default"], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.policy != null && Object.hasOwnProperty.call(message, "policy"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.policy);
                return writer;
            };

            /**
             * Decodes a NotificationSoundPolicyOverride message from the specified reader or buffer.
             * @function decode
             * @memberof sync.Contact.NotificationSoundPolicyOverride
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {sync.Contact.NotificationSoundPolicyOverride} NotificationSoundPolicyOverride
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NotificationSoundPolicyOverride.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.Contact.NotificationSoundPolicyOverride();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message["default"] = $root.common.Unit.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.policy = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return NotificationSoundPolicyOverride;
        })();

        return Contact;
    })();

    sync.Group = (function() {

        /**
         * Properties of a Group.
         * @memberof sync
         * @interface IGroup
         * @property {common.GroupIdentity|null} [groupIdentity] Group groupIdentity
         * @property {string|null} [name] Group name
         * @property {Long|null} [createdAt] Group createdAt
         * @property {sync.Group.UserState|null} [userState] Group userState
         * @property {sync.Group.NotificationTriggerPolicyOverride|null} [notificationTriggerPolicyOverride] Group notificationTriggerPolicyOverride
         * @property {sync.Group.NotificationSoundPolicyOverride|null} [notificationSoundPolicyOverride] Group notificationSoundPolicyOverride
         * @property {common.DeltaImage|null} [profilePicture] Group profilePicture
         * @property {common.Identities|null} [memberIdentities] Group memberIdentities
         * @property {sync.ConversationCategory|null} [conversationCategory] Group conversationCategory
         * @property {sync.ConversationVisibility|null} [conversationVisibility] Group conversationVisibility
         */

        /**
         * Constructs a new Group.
         * @memberof sync
         * @classdesc Represents a Group.
         * @implements IGroup
         * @constructor
         * @param {sync.IGroup=} [properties] Properties to set
         */
        function Group(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Group groupIdentity.
         * @member {common.GroupIdentity|null|undefined} groupIdentity
         * @memberof sync.Group
         * @instance
         */
        Group.prototype.groupIdentity = null;

        /**
         * Group name.
         * @member {string|null|undefined} name
         * @memberof sync.Group
         * @instance
         */
        Group.prototype.name = null;

        /**
         * Group createdAt.
         * @member {Long|null|undefined} createdAt
         * @memberof sync.Group
         * @instance
         */
        Group.prototype.createdAt = null;

        /**
         * Group userState.
         * @member {sync.Group.UserState|null|undefined} userState
         * @memberof sync.Group
         * @instance
         */
        Group.prototype.userState = null;

        /**
         * Group notificationTriggerPolicyOverride.
         * @member {sync.Group.NotificationTriggerPolicyOverride|null|undefined} notificationTriggerPolicyOverride
         * @memberof sync.Group
         * @instance
         */
        Group.prototype.notificationTriggerPolicyOverride = null;

        /**
         * Group notificationSoundPolicyOverride.
         * @member {sync.Group.NotificationSoundPolicyOverride|null|undefined} notificationSoundPolicyOverride
         * @memberof sync.Group
         * @instance
         */
        Group.prototype.notificationSoundPolicyOverride = null;

        /**
         * Group profilePicture.
         * @member {common.DeltaImage|null|undefined} profilePicture
         * @memberof sync.Group
         * @instance
         */
        Group.prototype.profilePicture = null;

        /**
         * Group memberIdentities.
         * @member {common.Identities|null|undefined} memberIdentities
         * @memberof sync.Group
         * @instance
         */
        Group.prototype.memberIdentities = null;

        /**
         * Group conversationCategory.
         * @member {sync.ConversationCategory|null|undefined} conversationCategory
         * @memberof sync.Group
         * @instance
         */
        Group.prototype.conversationCategory = null;

        /**
         * Group conversationVisibility.
         * @member {sync.ConversationVisibility|null|undefined} conversationVisibility
         * @memberof sync.Group
         * @instance
         */
        Group.prototype.conversationVisibility = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * Group _name.
         * @member {"name"|undefined} _name
         * @memberof sync.Group
         * @instance
         */
        Object.defineProperty(Group.prototype, "_name", {
            get: $util.oneOfGetter($oneOfFields = ["name"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Group _createdAt.
         * @member {"createdAt"|undefined} _createdAt
         * @memberof sync.Group
         * @instance
         */
        Object.defineProperty(Group.prototype, "_createdAt", {
            get: $util.oneOfGetter($oneOfFields = ["createdAt"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Group _userState.
         * @member {"userState"|undefined} _userState
         * @memberof sync.Group
         * @instance
         */
        Object.defineProperty(Group.prototype, "_userState", {
            get: $util.oneOfGetter($oneOfFields = ["userState"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Group _conversationCategory.
         * @member {"conversationCategory"|undefined} _conversationCategory
         * @memberof sync.Group
         * @instance
         */
        Object.defineProperty(Group.prototype, "_conversationCategory", {
            get: $util.oneOfGetter($oneOfFields = ["conversationCategory"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Group _conversationVisibility.
         * @member {"conversationVisibility"|undefined} _conversationVisibility
         * @memberof sync.Group
         * @instance
         */
        Object.defineProperty(Group.prototype, "_conversationVisibility", {
            get: $util.oneOfGetter($oneOfFields = ["conversationVisibility"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified Group message. Does not implicitly {@link sync.Group.verify|verify} messages.
         * @function encode
         * @memberof sync.Group
         * @static
         * @param {sync.Group} message Group message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Group.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.groupIdentity != null && Object.hasOwnProperty.call(message, "groupIdentity"))
                $root.common.GroupIdentity.encode(message.groupIdentity, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.name);
            if (message.createdAt != null && Object.hasOwnProperty.call(message, "createdAt"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.createdAt);
            if (message.conversationCategory != null && Object.hasOwnProperty.call(message, "conversationCategory"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.conversationCategory);
            if (message.conversationVisibility != null && Object.hasOwnProperty.call(message, "conversationVisibility"))
                writer.uint32(/* id 5, wireType 0 =*/40).int32(message.conversationVisibility);
            if (message.userState != null && Object.hasOwnProperty.call(message, "userState"))
                writer.uint32(/* id 6, wireType 0 =*/48).int32(message.userState);
            if (message.profilePicture != null && Object.hasOwnProperty.call(message, "profilePicture"))
                $root.common.DeltaImage.encode(message.profilePicture, writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
            if (message.memberIdentities != null && Object.hasOwnProperty.call(message, "memberIdentities"))
                $root.common.Identities.encode(message.memberIdentities, writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
            if (message.notificationTriggerPolicyOverride != null && Object.hasOwnProperty.call(message, "notificationTriggerPolicyOverride"))
                $root.sync.Group.NotificationTriggerPolicyOverride.encode(message.notificationTriggerPolicyOverride, writer.uint32(/* id 9, wireType 2 =*/74).fork()).ldelim();
            if (message.notificationSoundPolicyOverride != null && Object.hasOwnProperty.call(message, "notificationSoundPolicyOverride"))
                $root.sync.Group.NotificationSoundPolicyOverride.encode(message.notificationSoundPolicyOverride, writer.uint32(/* id 10, wireType 2 =*/82).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a Group message from the specified reader or buffer.
         * @function decode
         * @memberof sync.Group
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sync.Group} Group
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Group.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.Group();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.groupIdentity = $root.common.GroupIdentity.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.name = reader.string();
                        break;
                    }
                case 3: {
                        message.createdAt = reader.uint64();
                        break;
                    }
                case 6: {
                        message.userState = reader.int32();
                        break;
                    }
                case 9: {
                        message.notificationTriggerPolicyOverride = $root.sync.Group.NotificationTriggerPolicyOverride.decode(reader, reader.uint32());
                        break;
                    }
                case 10: {
                        message.notificationSoundPolicyOverride = $root.sync.Group.NotificationSoundPolicyOverride.decode(reader, reader.uint32());
                        break;
                    }
                case 7: {
                        message.profilePicture = $root.common.DeltaImage.decode(reader, reader.uint32());
                        break;
                    }
                case 8: {
                        message.memberIdentities = $root.common.Identities.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.conversationCategory = reader.int32();
                        break;
                    }
                case 5: {
                        message.conversationVisibility = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * UserState enum.
         * @name sync.Group.UserState
         * @enum {number}
         * @property {number} MEMBER=0 MEMBER value
         * @property {number} KICKED=1 KICKED value
         * @property {number} LEFT=2 LEFT value
         */
        Group.UserState = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "MEMBER"] = 0;
            values[valuesById[1] = "KICKED"] = 1;
            values[valuesById[2] = "LEFT"] = 2;
            return values;
        })();

        Group.NotificationTriggerPolicyOverride = (function() {

            /**
             * Properties of a NotificationTriggerPolicyOverride.
             * @memberof sync.Group
             * @interface INotificationTriggerPolicyOverride
             * @property {common.Unit|null} ["default"] NotificationTriggerPolicyOverride default
             * @property {sync.Group.NotificationTriggerPolicyOverride.Policy|null} [policy] NotificationTriggerPolicyOverride policy
             */

            /**
             * Constructs a new NotificationTriggerPolicyOverride.
             * @memberof sync.Group
             * @classdesc Represents a NotificationTriggerPolicyOverride.
             * @implements INotificationTriggerPolicyOverride
             * @constructor
             * @param {sync.Group.INotificationTriggerPolicyOverride=} [properties] Properties to set
             */
            function NotificationTriggerPolicyOverride(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * NotificationTriggerPolicyOverride default.
             * @member {common.Unit|null|undefined} default
             * @memberof sync.Group.NotificationTriggerPolicyOverride
             * @instance
             */
            NotificationTriggerPolicyOverride.prototype["default"] = null;

            /**
             * NotificationTriggerPolicyOverride policy.
             * @member {sync.Group.NotificationTriggerPolicyOverride.Policy|null|undefined} policy
             * @memberof sync.Group.NotificationTriggerPolicyOverride
             * @instance
             */
            NotificationTriggerPolicyOverride.prototype.policy = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * NotificationTriggerPolicyOverride override.
             * @member {"default"|"policy"|undefined} override
             * @memberof sync.Group.NotificationTriggerPolicyOverride
             * @instance
             */
            Object.defineProperty(NotificationTriggerPolicyOverride.prototype, "override", {
                get: $util.oneOfGetter($oneOfFields = ["default", "policy"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified NotificationTriggerPolicyOverride message. Does not implicitly {@link sync.Group.NotificationTriggerPolicyOverride.verify|verify} messages.
             * @function encode
             * @memberof sync.Group.NotificationTriggerPolicyOverride
             * @static
             * @param {sync.Group.NotificationTriggerPolicyOverride} message NotificationTriggerPolicyOverride message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NotificationTriggerPolicyOverride.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message["default"] != null && Object.hasOwnProperty.call(message, "default"))
                    $root.common.Unit.encode(message["default"], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.policy != null && Object.hasOwnProperty.call(message, "policy"))
                    $root.sync.Group.NotificationTriggerPolicyOverride.Policy.encode(message.policy, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes a NotificationTriggerPolicyOverride message from the specified reader or buffer.
             * @function decode
             * @memberof sync.Group.NotificationTriggerPolicyOverride
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {sync.Group.NotificationTriggerPolicyOverride} NotificationTriggerPolicyOverride
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NotificationTriggerPolicyOverride.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.Group.NotificationTriggerPolicyOverride();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message["default"] = $root.common.Unit.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.policy = $root.sync.Group.NotificationTriggerPolicyOverride.Policy.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            NotificationTriggerPolicyOverride.Policy = (function() {

                /**
                 * Properties of a Policy.
                 * @memberof sync.Group.NotificationTriggerPolicyOverride
                 * @interface IPolicy
                 * @property {sync.Group.NotificationTriggerPolicyOverride.Policy.NotificationTriggerPolicy|null} [policy] Policy policy
                 * @property {Long|null} [expiresAt] Policy expiresAt
                 */

                /**
                 * Constructs a new Policy.
                 * @memberof sync.Group.NotificationTriggerPolicyOverride
                 * @classdesc Represents a Policy.
                 * @implements IPolicy
                 * @constructor
                 * @param {sync.Group.NotificationTriggerPolicyOverride.IPolicy=} [properties] Properties to set
                 */
                function Policy(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Policy policy.
                 * @member {sync.Group.NotificationTriggerPolicyOverride.Policy.NotificationTriggerPolicy} policy
                 * @memberof sync.Group.NotificationTriggerPolicyOverride.Policy
                 * @instance
                 */
                Policy.prototype.policy = 0;

                /**
                 * Policy expiresAt.
                 * @member {Long|null|undefined} expiresAt
                 * @memberof sync.Group.NotificationTriggerPolicyOverride.Policy
                 * @instance
                 */
                Policy.prototype.expiresAt = null;

                // OneOf field names bound to virtual getters and setters
                let $oneOfFields;

                /**
                 * Policy _expiresAt.
                 * @member {"expiresAt"|undefined} _expiresAt
                 * @memberof sync.Group.NotificationTriggerPolicyOverride.Policy
                 * @instance
                 */
                Object.defineProperty(Policy.prototype, "_expiresAt", {
                    get: $util.oneOfGetter($oneOfFields = ["expiresAt"]),
                    set: $util.oneOfSetter($oneOfFields)
                });

                /**
                 * Encodes the specified Policy message. Does not implicitly {@link sync.Group.NotificationTriggerPolicyOverride.Policy.verify|verify} messages.
                 * @function encode
                 * @memberof sync.Group.NotificationTriggerPolicyOverride.Policy
                 * @static
                 * @param {sync.Group.NotificationTriggerPolicyOverride.Policy} message Policy message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Policy.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.policy != null && Object.hasOwnProperty.call(message, "policy"))
                        writer.uint32(/* id 1, wireType 0 =*/8).int32(message.policy);
                    if (message.expiresAt != null && Object.hasOwnProperty.call(message, "expiresAt"))
                        writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.expiresAt);
                    return writer;
                };

                /**
                 * Decodes a Policy message from the specified reader or buffer.
                 * @function decode
                 * @memberof sync.Group.NotificationTriggerPolicyOverride.Policy
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {sync.Group.NotificationTriggerPolicyOverride.Policy} Policy
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Policy.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.Group.NotificationTriggerPolicyOverride.Policy();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.policy = reader.int32();
                                break;
                            }
                        case 2: {
                                message.expiresAt = reader.uint64();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                /**
                 * NotificationTriggerPolicy enum.
                 * @name sync.Group.NotificationTriggerPolicyOverride.Policy.NotificationTriggerPolicy
                 * @enum {number}
                 * @property {number} MENTIONED=0 MENTIONED value
                 * @property {number} NEVER=1 NEVER value
                 */
                Policy.NotificationTriggerPolicy = (function() {
                    const valuesById = {}, values = Object.create(valuesById);
                    values[valuesById[0] = "MENTIONED"] = 0;
                    values[valuesById[1] = "NEVER"] = 1;
                    return values;
                })();

                return Policy;
            })();

            return NotificationTriggerPolicyOverride;
        })();

        Group.NotificationSoundPolicyOverride = (function() {

            /**
             * Properties of a NotificationSoundPolicyOverride.
             * @memberof sync.Group
             * @interface INotificationSoundPolicyOverride
             * @property {common.Unit|null} ["default"] NotificationSoundPolicyOverride default
             * @property {sync.NotificationSoundPolicy|null} [policy] NotificationSoundPolicyOverride policy
             */

            /**
             * Constructs a new NotificationSoundPolicyOverride.
             * @memberof sync.Group
             * @classdesc Represents a NotificationSoundPolicyOverride.
             * @implements INotificationSoundPolicyOverride
             * @constructor
             * @param {sync.Group.INotificationSoundPolicyOverride=} [properties] Properties to set
             */
            function NotificationSoundPolicyOverride(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * NotificationSoundPolicyOverride default.
             * @member {common.Unit|null|undefined} default
             * @memberof sync.Group.NotificationSoundPolicyOverride
             * @instance
             */
            NotificationSoundPolicyOverride.prototype["default"] = null;

            /**
             * NotificationSoundPolicyOverride policy.
             * @member {sync.NotificationSoundPolicy|null|undefined} policy
             * @memberof sync.Group.NotificationSoundPolicyOverride
             * @instance
             */
            NotificationSoundPolicyOverride.prototype.policy = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * NotificationSoundPolicyOverride override.
             * @member {"default"|"policy"|undefined} override
             * @memberof sync.Group.NotificationSoundPolicyOverride
             * @instance
             */
            Object.defineProperty(NotificationSoundPolicyOverride.prototype, "override", {
                get: $util.oneOfGetter($oneOfFields = ["default", "policy"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified NotificationSoundPolicyOverride message. Does not implicitly {@link sync.Group.NotificationSoundPolicyOverride.verify|verify} messages.
             * @function encode
             * @memberof sync.Group.NotificationSoundPolicyOverride
             * @static
             * @param {sync.Group.NotificationSoundPolicyOverride} message NotificationSoundPolicyOverride message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            NotificationSoundPolicyOverride.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message["default"] != null && Object.hasOwnProperty.call(message, "default"))
                    $root.common.Unit.encode(message["default"], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.policy != null && Object.hasOwnProperty.call(message, "policy"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.policy);
                return writer;
            };

            /**
             * Decodes a NotificationSoundPolicyOverride message from the specified reader or buffer.
             * @function decode
             * @memberof sync.Group.NotificationSoundPolicyOverride
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {sync.Group.NotificationSoundPolicyOverride} NotificationSoundPolicyOverride
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            NotificationSoundPolicyOverride.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.Group.NotificationSoundPolicyOverride();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message["default"] = $root.common.Unit.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.policy = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return NotificationSoundPolicyOverride;
        })();

        return Group;
    })();

    sync.DistributionList = (function() {

        /**
         * Properties of a DistributionList.
         * @memberof sync
         * @interface IDistributionList
         * @property {Long|null} [distributionListId] DistributionList distributionListId
         * @property {string|null} [name] DistributionList name
         * @property {Long|null} [createdAt] DistributionList createdAt
         * @property {common.Identities|null} [memberIdentities] DistributionList memberIdentities
         * @property {sync.ConversationCategory|null} [conversationCategory] DistributionList conversationCategory
         * @property {sync.ConversationVisibility|null} [conversationVisibility] DistributionList conversationVisibility
         */

        /**
         * Constructs a new DistributionList.
         * @memberof sync
         * @classdesc Represents a DistributionList.
         * @implements IDistributionList
         * @constructor
         * @param {sync.IDistributionList=} [properties] Properties to set
         */
        function DistributionList(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DistributionList distributionListId.
         * @member {Long} distributionListId
         * @memberof sync.DistributionList
         * @instance
         */
        DistributionList.prototype.distributionListId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * DistributionList name.
         * @member {string|null|undefined} name
         * @memberof sync.DistributionList
         * @instance
         */
        DistributionList.prototype.name = null;

        /**
         * DistributionList createdAt.
         * @member {Long|null|undefined} createdAt
         * @memberof sync.DistributionList
         * @instance
         */
        DistributionList.prototype.createdAt = null;

        /**
         * DistributionList memberIdentities.
         * @member {common.Identities|null|undefined} memberIdentities
         * @memberof sync.DistributionList
         * @instance
         */
        DistributionList.prototype.memberIdentities = null;

        /**
         * DistributionList conversationCategory.
         * @member {sync.ConversationCategory|null|undefined} conversationCategory
         * @memberof sync.DistributionList
         * @instance
         */
        DistributionList.prototype.conversationCategory = null;

        /**
         * DistributionList conversationVisibility.
         * @member {sync.ConversationVisibility|null|undefined} conversationVisibility
         * @memberof sync.DistributionList
         * @instance
         */
        DistributionList.prototype.conversationVisibility = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * DistributionList _name.
         * @member {"name"|undefined} _name
         * @memberof sync.DistributionList
         * @instance
         */
        Object.defineProperty(DistributionList.prototype, "_name", {
            get: $util.oneOfGetter($oneOfFields = ["name"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * DistributionList _createdAt.
         * @member {"createdAt"|undefined} _createdAt
         * @memberof sync.DistributionList
         * @instance
         */
        Object.defineProperty(DistributionList.prototype, "_createdAt", {
            get: $util.oneOfGetter($oneOfFields = ["createdAt"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * DistributionList _conversationCategory.
         * @member {"conversationCategory"|undefined} _conversationCategory
         * @memberof sync.DistributionList
         * @instance
         */
        Object.defineProperty(DistributionList.prototype, "_conversationCategory", {
            get: $util.oneOfGetter($oneOfFields = ["conversationCategory"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * DistributionList _conversationVisibility.
         * @member {"conversationVisibility"|undefined} _conversationVisibility
         * @memberof sync.DistributionList
         * @instance
         */
        Object.defineProperty(DistributionList.prototype, "_conversationVisibility", {
            get: $util.oneOfGetter($oneOfFields = ["conversationVisibility"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified DistributionList message. Does not implicitly {@link sync.DistributionList.verify|verify} messages.
         * @function encode
         * @memberof sync.DistributionList
         * @static
         * @param {sync.DistributionList} message DistributionList message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DistributionList.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.distributionListId != null && Object.hasOwnProperty.call(message, "distributionListId"))
                writer.uint32(/* id 1, wireType 1 =*/9).fixed64(message.distributionListId);
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.name);
            if (message.createdAt != null && Object.hasOwnProperty.call(message, "createdAt"))
                writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.createdAt);
            if (message.conversationCategory != null && Object.hasOwnProperty.call(message, "conversationCategory"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.conversationCategory);
            if (message.conversationVisibility != null && Object.hasOwnProperty.call(message, "conversationVisibility"))
                writer.uint32(/* id 5, wireType 0 =*/40).int32(message.conversationVisibility);
            if (message.memberIdentities != null && Object.hasOwnProperty.call(message, "memberIdentities"))
                $root.common.Identities.encode(message.memberIdentities, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a DistributionList message from the specified reader or buffer.
         * @function decode
         * @memberof sync.DistributionList
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sync.DistributionList} DistributionList
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DistributionList.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.DistributionList();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.distributionListId = reader.fixed64();
                        break;
                    }
                case 2: {
                        message.name = reader.string();
                        break;
                    }
                case 3: {
                        message.createdAt = reader.uint64();
                        break;
                    }
                case 6: {
                        message.memberIdentities = $root.common.Identities.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.conversationCategory = reader.int32();
                        break;
                    }
                case 5: {
                        message.conversationVisibility = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return DistributionList;
    })();

    sync.Settings = (function() {

        /**
         * Properties of a Settings.
         * @memberof sync
         * @interface ISettings
         * @property {sync.Settings.ContactSyncPolicy|null} [contactSyncPolicy] Settings contactSyncPolicy
         * @property {sync.Settings.UnknownContactPolicy|null} [unknownContactPolicy] Settings unknownContactPolicy
         * @property {sync.ReadReceiptPolicy|null} [readReceiptPolicy] Settings readReceiptPolicy
         * @property {sync.TypingIndicatorPolicy|null} [typingIndicatorPolicy] Settings typingIndicatorPolicy
         * @property {sync.Settings.CallPolicy|null} [callPolicy] Settings callPolicy
         * @property {sync.Settings.CallConnectionPolicy|null} [callConnectionPolicy] Settings callConnectionPolicy
         * @property {sync.Settings.ScreenshotPolicy|null} [screenshotPolicy] Settings screenshotPolicy
         * @property {sync.Settings.KeyboardDataCollectionPolicy|null} [keyboardDataCollectionPolicy] Settings keyboardDataCollectionPolicy
         * @property {common.Identities|null} [blockedIdentities] Settings blockedIdentities
         * @property {common.Identities|null} [excludeFromSyncIdentities] Settings excludeFromSyncIdentities
         */

        /**
         * Constructs a new Settings.
         * @memberof sync
         * @classdesc Represents a Settings.
         * @implements ISettings
         * @constructor
         * @param {sync.ISettings=} [properties] Properties to set
         */
        function Settings(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Settings contactSyncPolicy.
         * @member {sync.Settings.ContactSyncPolicy|null|undefined} contactSyncPolicy
         * @memberof sync.Settings
         * @instance
         */
        Settings.prototype.contactSyncPolicy = null;

        /**
         * Settings unknownContactPolicy.
         * @member {sync.Settings.UnknownContactPolicy|null|undefined} unknownContactPolicy
         * @memberof sync.Settings
         * @instance
         */
        Settings.prototype.unknownContactPolicy = null;

        /**
         * Settings readReceiptPolicy.
         * @member {sync.ReadReceiptPolicy|null|undefined} readReceiptPolicy
         * @memberof sync.Settings
         * @instance
         */
        Settings.prototype.readReceiptPolicy = null;

        /**
         * Settings typingIndicatorPolicy.
         * @member {sync.TypingIndicatorPolicy|null|undefined} typingIndicatorPolicy
         * @memberof sync.Settings
         * @instance
         */
        Settings.prototype.typingIndicatorPolicy = null;

        /**
         * Settings callPolicy.
         * @member {sync.Settings.CallPolicy|null|undefined} callPolicy
         * @memberof sync.Settings
         * @instance
         */
        Settings.prototype.callPolicy = null;

        /**
         * Settings callConnectionPolicy.
         * @member {sync.Settings.CallConnectionPolicy|null|undefined} callConnectionPolicy
         * @memberof sync.Settings
         * @instance
         */
        Settings.prototype.callConnectionPolicy = null;

        /**
         * Settings screenshotPolicy.
         * @member {sync.Settings.ScreenshotPolicy|null|undefined} screenshotPolicy
         * @memberof sync.Settings
         * @instance
         */
        Settings.prototype.screenshotPolicy = null;

        /**
         * Settings keyboardDataCollectionPolicy.
         * @member {sync.Settings.KeyboardDataCollectionPolicy|null|undefined} keyboardDataCollectionPolicy
         * @memberof sync.Settings
         * @instance
         */
        Settings.prototype.keyboardDataCollectionPolicy = null;

        /**
         * Settings blockedIdentities.
         * @member {common.Identities|null|undefined} blockedIdentities
         * @memberof sync.Settings
         * @instance
         */
        Settings.prototype.blockedIdentities = null;

        /**
         * Settings excludeFromSyncIdentities.
         * @member {common.Identities|null|undefined} excludeFromSyncIdentities
         * @memberof sync.Settings
         * @instance
         */
        Settings.prototype.excludeFromSyncIdentities = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * Settings _contactSyncPolicy.
         * @member {"contactSyncPolicy"|undefined} _contactSyncPolicy
         * @memberof sync.Settings
         * @instance
         */
        Object.defineProperty(Settings.prototype, "_contactSyncPolicy", {
            get: $util.oneOfGetter($oneOfFields = ["contactSyncPolicy"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Settings _unknownContactPolicy.
         * @member {"unknownContactPolicy"|undefined} _unknownContactPolicy
         * @memberof sync.Settings
         * @instance
         */
        Object.defineProperty(Settings.prototype, "_unknownContactPolicy", {
            get: $util.oneOfGetter($oneOfFields = ["unknownContactPolicy"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Settings _readReceiptPolicy.
         * @member {"readReceiptPolicy"|undefined} _readReceiptPolicy
         * @memberof sync.Settings
         * @instance
         */
        Object.defineProperty(Settings.prototype, "_readReceiptPolicy", {
            get: $util.oneOfGetter($oneOfFields = ["readReceiptPolicy"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Settings _typingIndicatorPolicy.
         * @member {"typingIndicatorPolicy"|undefined} _typingIndicatorPolicy
         * @memberof sync.Settings
         * @instance
         */
        Object.defineProperty(Settings.prototype, "_typingIndicatorPolicy", {
            get: $util.oneOfGetter($oneOfFields = ["typingIndicatorPolicy"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Settings _callPolicy.
         * @member {"callPolicy"|undefined} _callPolicy
         * @memberof sync.Settings
         * @instance
         */
        Object.defineProperty(Settings.prototype, "_callPolicy", {
            get: $util.oneOfGetter($oneOfFields = ["callPolicy"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Settings _callConnectionPolicy.
         * @member {"callConnectionPolicy"|undefined} _callConnectionPolicy
         * @memberof sync.Settings
         * @instance
         */
        Object.defineProperty(Settings.prototype, "_callConnectionPolicy", {
            get: $util.oneOfGetter($oneOfFields = ["callConnectionPolicy"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Settings _screenshotPolicy.
         * @member {"screenshotPolicy"|undefined} _screenshotPolicy
         * @memberof sync.Settings
         * @instance
         */
        Object.defineProperty(Settings.prototype, "_screenshotPolicy", {
            get: $util.oneOfGetter($oneOfFields = ["screenshotPolicy"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Settings _keyboardDataCollectionPolicy.
         * @member {"keyboardDataCollectionPolicy"|undefined} _keyboardDataCollectionPolicy
         * @memberof sync.Settings
         * @instance
         */
        Object.defineProperty(Settings.prototype, "_keyboardDataCollectionPolicy", {
            get: $util.oneOfGetter($oneOfFields = ["keyboardDataCollectionPolicy"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified Settings message. Does not implicitly {@link sync.Settings.verify|verify} messages.
         * @function encode
         * @memberof sync.Settings
         * @static
         * @param {sync.Settings} message Settings message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Settings.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.contactSyncPolicy != null && Object.hasOwnProperty.call(message, "contactSyncPolicy"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.contactSyncPolicy);
            if (message.unknownContactPolicy != null && Object.hasOwnProperty.call(message, "unknownContactPolicy"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.unknownContactPolicy);
            if (message.readReceiptPolicy != null && Object.hasOwnProperty.call(message, "readReceiptPolicy"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.readReceiptPolicy);
            if (message.typingIndicatorPolicy != null && Object.hasOwnProperty.call(message, "typingIndicatorPolicy"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.typingIndicatorPolicy);
            if (message.callPolicy != null && Object.hasOwnProperty.call(message, "callPolicy"))
                writer.uint32(/* id 5, wireType 0 =*/40).int32(message.callPolicy);
            if (message.callConnectionPolicy != null && Object.hasOwnProperty.call(message, "callConnectionPolicy"))
                writer.uint32(/* id 6, wireType 0 =*/48).int32(message.callConnectionPolicy);
            if (message.screenshotPolicy != null && Object.hasOwnProperty.call(message, "screenshotPolicy"))
                writer.uint32(/* id 7, wireType 0 =*/56).int32(message.screenshotPolicy);
            if (message.keyboardDataCollectionPolicy != null && Object.hasOwnProperty.call(message, "keyboardDataCollectionPolicy"))
                writer.uint32(/* id 8, wireType 0 =*/64).int32(message.keyboardDataCollectionPolicy);
            if (message.blockedIdentities != null && Object.hasOwnProperty.call(message, "blockedIdentities"))
                $root.common.Identities.encode(message.blockedIdentities, writer.uint32(/* id 9, wireType 2 =*/74).fork()).ldelim();
            if (message.excludeFromSyncIdentities != null && Object.hasOwnProperty.call(message, "excludeFromSyncIdentities"))
                $root.common.Identities.encode(message.excludeFromSyncIdentities, writer.uint32(/* id 10, wireType 2 =*/82).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a Settings message from the specified reader or buffer.
         * @function decode
         * @memberof sync.Settings
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {sync.Settings} Settings
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Settings.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.sync.Settings();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.contactSyncPolicy = reader.int32();
                        break;
                    }
                case 2: {
                        message.unknownContactPolicy = reader.int32();
                        break;
                    }
                case 3: {
                        message.readReceiptPolicy = reader.int32();
                        break;
                    }
                case 4: {
                        message.typingIndicatorPolicy = reader.int32();
                        break;
                    }
                case 5: {
                        message.callPolicy = reader.int32();
                        break;
                    }
                case 6: {
                        message.callConnectionPolicy = reader.int32();
                        break;
                    }
                case 7: {
                        message.screenshotPolicy = reader.int32();
                        break;
                    }
                case 8: {
                        message.keyboardDataCollectionPolicy = reader.int32();
                        break;
                    }
                case 9: {
                        message.blockedIdentities = $root.common.Identities.decode(reader, reader.uint32());
                        break;
                    }
                case 10: {
                        message.excludeFromSyncIdentities = $root.common.Identities.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * ContactSyncPolicy enum.
         * @name sync.Settings.ContactSyncPolicy
         * @enum {number}
         * @property {number} NOT_SYNCED=0 NOT_SYNCED value
         * @property {number} SYNC=1 SYNC value
         */
        Settings.ContactSyncPolicy = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "NOT_SYNCED"] = 0;
            values[valuesById[1] = "SYNC"] = 1;
            return values;
        })();

        /**
         * UnknownContactPolicy enum.
         * @name sync.Settings.UnknownContactPolicy
         * @enum {number}
         * @property {number} ALLOW_UNKNOWN=0 ALLOW_UNKNOWN value
         * @property {number} BLOCK_UNKNOWN=1 BLOCK_UNKNOWN value
         */
        Settings.UnknownContactPolicy = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "ALLOW_UNKNOWN"] = 0;
            values[valuesById[1] = "BLOCK_UNKNOWN"] = 1;
            return values;
        })();

        /**
         * CallPolicy enum.
         * @name sync.Settings.CallPolicy
         * @enum {number}
         * @property {number} ALLOW_CALL=0 ALLOW_CALL value
         * @property {number} DENY_CALL=1 DENY_CALL value
         */
        Settings.CallPolicy = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "ALLOW_CALL"] = 0;
            values[valuesById[1] = "DENY_CALL"] = 1;
            return values;
        })();

        /**
         * CallConnectionPolicy enum.
         * @name sync.Settings.CallConnectionPolicy
         * @enum {number}
         * @property {number} ALLOW_DIRECT=0 ALLOW_DIRECT value
         * @property {number} REQUIRE_RELAY=1 REQUIRE_RELAY value
         */
        Settings.CallConnectionPolicy = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "ALLOW_DIRECT"] = 0;
            values[valuesById[1] = "REQUIRE_RELAY"] = 1;
            return values;
        })();

        /**
         * ScreenshotPolicy enum.
         * @name sync.Settings.ScreenshotPolicy
         * @enum {number}
         * @property {number} ALLOW_SCREENSHOT=0 ALLOW_SCREENSHOT value
         * @property {number} DENY_SCREENSHOT=1 DENY_SCREENSHOT value
         */
        Settings.ScreenshotPolicy = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "ALLOW_SCREENSHOT"] = 0;
            values[valuesById[1] = "DENY_SCREENSHOT"] = 1;
            return values;
        })();

        /**
         * KeyboardDataCollectionPolicy enum.
         * @name sync.Settings.KeyboardDataCollectionPolicy
         * @enum {number}
         * @property {number} ALLOW_DATA_COLLECTION=0 ALLOW_DATA_COLLECTION value
         * @property {number} DENY_DATA_COLLECTION=1 DENY_DATA_COLLECTION value
         */
        Settings.KeyboardDataCollectionPolicy = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "ALLOW_DATA_COLLECTION"] = 0;
            values[valuesById[1] = "DENY_DATA_COLLECTION"] = 1;
            return values;
        })();

        return Settings;
    })();

    return sync;
})();

export const join = $root.join = (() => {

    /**
     * Namespace join.
     * @exports join
     * @namespace
     */
    const join = {};

    join.NdToEd = (function() {

        /**
         * Properties of a NdToEd.
         * @memberof join
         * @interface INdToEd
         * @property {join.Registered|null} [registered] NdToEd registered
         */

        /**
         * Constructs a new NdToEd.
         * @memberof join
         * @classdesc Represents a NdToEd.
         * @implements INdToEd
         * @constructor
         * @param {join.INdToEd=} [properties] Properties to set
         */
        function NdToEd(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * NdToEd registered.
         * @member {join.Registered|null|undefined} registered
         * @memberof join.NdToEd
         * @instance
         */
        NdToEd.prototype.registered = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * NdToEd content.
         * @member {"registered"|undefined} content
         * @memberof join.NdToEd
         * @instance
         */
        Object.defineProperty(NdToEd.prototype, "content", {
            get: $util.oneOfGetter($oneOfFields = ["registered"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified NdToEd message. Does not implicitly {@link join.NdToEd.verify|verify} messages.
         * @function encode
         * @memberof join.NdToEd
         * @static
         * @param {join.NdToEd} message NdToEd message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        NdToEd.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.registered != null && Object.hasOwnProperty.call(message, "registered"))
                $root.join.Registered.encode(message.registered, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a NdToEd message from the specified reader or buffer.
         * @function decode
         * @memberof join.NdToEd
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {join.NdToEd} NdToEd
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        NdToEd.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.join.NdToEd();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.registered = $root.join.Registered.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return NdToEd;
    })();

    join.EdToNd = (function() {

        /**
         * Properties of an EdToNd.
         * @memberof join
         * @interface IEdToNd
         * @property {join.Begin|null} [begin] EdToNd begin
         * @property {common.BlobData|null} [blobData] EdToNd blobData
         * @property {join.EssentialData|null} [essentialData] EdToNd essentialData
         */

        /**
         * Constructs a new EdToNd.
         * @memberof join
         * @classdesc Represents an EdToNd.
         * @implements IEdToNd
         * @constructor
         * @param {join.IEdToNd=} [properties] Properties to set
         */
        function EdToNd(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * EdToNd begin.
         * @member {join.Begin|null|undefined} begin
         * @memberof join.EdToNd
         * @instance
         */
        EdToNd.prototype.begin = null;

        /**
         * EdToNd blobData.
         * @member {common.BlobData|null|undefined} blobData
         * @memberof join.EdToNd
         * @instance
         */
        EdToNd.prototype.blobData = null;

        /**
         * EdToNd essentialData.
         * @member {join.EssentialData|null|undefined} essentialData
         * @memberof join.EdToNd
         * @instance
         */
        EdToNd.prototype.essentialData = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * EdToNd content.
         * @member {"begin"|"blobData"|"essentialData"|undefined} content
         * @memberof join.EdToNd
         * @instance
         */
        Object.defineProperty(EdToNd.prototype, "content", {
            get: $util.oneOfGetter($oneOfFields = ["begin", "blobData", "essentialData"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified EdToNd message. Does not implicitly {@link join.EdToNd.verify|verify} messages.
         * @function encode
         * @memberof join.EdToNd
         * @static
         * @param {join.EdToNd} message EdToNd message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EdToNd.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.begin != null && Object.hasOwnProperty.call(message, "begin"))
                $root.join.Begin.encode(message.begin, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.blobData != null && Object.hasOwnProperty.call(message, "blobData"))
                $root.common.BlobData.encode(message.blobData, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.essentialData != null && Object.hasOwnProperty.call(message, "essentialData"))
                $root.join.EssentialData.encode(message.essentialData, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes an EdToNd message from the specified reader or buffer.
         * @function decode
         * @memberof join.EdToNd
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {join.EdToNd} EdToNd
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EdToNd.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.join.EdToNd();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.begin = $root.join.Begin.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        message.blobData = $root.common.BlobData.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.essentialData = $root.join.EssentialData.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return EdToNd;
    })();

    join.Begin = (function() {

        /**
         * Properties of a Begin.
         * @memberof join
         * @interface IBegin
         */

        /**
         * Constructs a new Begin.
         * @memberof join
         * @classdesc Represents a Begin.
         * @implements IBegin
         * @constructor
         * @param {join.IBegin=} [properties] Properties to set
         */
        function Begin(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified Begin message. Does not implicitly {@link join.Begin.verify|verify} messages.
         * @function encode
         * @memberof join.Begin
         * @static
         * @param {join.Begin} message Begin message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Begin.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes a Begin message from the specified reader or buffer.
         * @function decode
         * @memberof join.Begin
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {join.Begin} Begin
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Begin.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.join.Begin();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return Begin;
    })();

    join.EssentialData = (function() {

        /**
         * Properties of an EssentialData.
         * @memberof join
         * @interface IEssentialData
         * @property {join.EssentialData.IdentityData|null} [identityData] EssentialData identityData
         * @property {sync.ThreemaWorkCredentials|null} [workCredentials] EssentialData workCredentials
         * @property {join.EssentialData.DeviceGroupData|null} [deviceGroupData] EssentialData deviceGroupData
         * @property {sync.UserProfile|null} [userProfile] EssentialData userProfile
         * @property {sync.Settings|null} [settings] EssentialData settings
         * @property {sync.MdmParameters|null} [mdmParameters] EssentialData mdmParameters
         * @property {Array.<join.EssentialData.AugmentedContact>|null} [contacts] EssentialData contacts
         * @property {Array.<join.EssentialData.AugmentedGroup>|null} [groups] EssentialData groups
         * @property {Array.<join.EssentialData.AugmentedDistributionList>|null} [distributionLists] EssentialData distributionLists
         * @property {Array.<Uint8Array>|null} [cspHashedNonces] EssentialData cspHashedNonces
         * @property {Array.<Uint8Array>|null} [d2dHashedNonces] EssentialData d2dHashedNonces
         */

        /**
         * Constructs a new EssentialData.
         * @memberof join
         * @classdesc Represents an EssentialData.
         * @implements IEssentialData
         * @constructor
         * @param {join.IEssentialData=} [properties] Properties to set
         */
        function EssentialData(properties) {
            this.contacts = [];
            this.groups = [];
            this.distributionLists = [];
            this.cspHashedNonces = [];
            this.d2dHashedNonces = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * EssentialData identityData.
         * @member {join.EssentialData.IdentityData|null|undefined} identityData
         * @memberof join.EssentialData
         * @instance
         */
        EssentialData.prototype.identityData = null;

        /**
         * EssentialData workCredentials.
         * @member {sync.ThreemaWorkCredentials|null|undefined} workCredentials
         * @memberof join.EssentialData
         * @instance
         */
        EssentialData.prototype.workCredentials = null;

        /**
         * EssentialData deviceGroupData.
         * @member {join.EssentialData.DeviceGroupData|null|undefined} deviceGroupData
         * @memberof join.EssentialData
         * @instance
         */
        EssentialData.prototype.deviceGroupData = null;

        /**
         * EssentialData userProfile.
         * @member {sync.UserProfile|null|undefined} userProfile
         * @memberof join.EssentialData
         * @instance
         */
        EssentialData.prototype.userProfile = null;

        /**
         * EssentialData settings.
         * @member {sync.Settings|null|undefined} settings
         * @memberof join.EssentialData
         * @instance
         */
        EssentialData.prototype.settings = null;

        /**
         * EssentialData mdmParameters.
         * @member {sync.MdmParameters|null|undefined} mdmParameters
         * @memberof join.EssentialData
         * @instance
         */
        EssentialData.prototype.mdmParameters = null;

        /**
         * EssentialData contacts.
         * @member {Array.<join.EssentialData.AugmentedContact>} contacts
         * @memberof join.EssentialData
         * @instance
         */
        EssentialData.prototype.contacts = $util.emptyArray;

        /**
         * EssentialData groups.
         * @member {Array.<join.EssentialData.AugmentedGroup>} groups
         * @memberof join.EssentialData
         * @instance
         */
        EssentialData.prototype.groups = $util.emptyArray;

        /**
         * EssentialData distributionLists.
         * @member {Array.<join.EssentialData.AugmentedDistributionList>} distributionLists
         * @memberof join.EssentialData
         * @instance
         */
        EssentialData.prototype.distributionLists = $util.emptyArray;

        /**
         * EssentialData cspHashedNonces.
         * @member {Array.<Uint8Array>} cspHashedNonces
         * @memberof join.EssentialData
         * @instance
         */
        EssentialData.prototype.cspHashedNonces = $util.emptyArray;

        /**
         * EssentialData d2dHashedNonces.
         * @member {Array.<Uint8Array>} d2dHashedNonces
         * @memberof join.EssentialData
         * @instance
         */
        EssentialData.prototype.d2dHashedNonces = $util.emptyArray;

        /**
         * Encodes the specified EssentialData message. Does not implicitly {@link join.EssentialData.verify|verify} messages.
         * @function encode
         * @memberof join.EssentialData
         * @static
         * @param {join.EssentialData} message EssentialData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EssentialData.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.identityData != null && Object.hasOwnProperty.call(message, "identityData"))
                $root.join.EssentialData.IdentityData.encode(message.identityData, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.deviceGroupData != null && Object.hasOwnProperty.call(message, "deviceGroupData"))
                $root.join.EssentialData.DeviceGroupData.encode(message.deviceGroupData, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.userProfile != null && Object.hasOwnProperty.call(message, "userProfile"))
                $root.sync.UserProfile.encode(message.userProfile, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.settings != null && Object.hasOwnProperty.call(message, "settings"))
                $root.sync.Settings.encode(message.settings, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            if (message.mdmParameters != null && Object.hasOwnProperty.call(message, "mdmParameters"))
                $root.sync.MdmParameters.encode(message.mdmParameters, writer.uint32(/* id 6, wireType 2 =*/50).fork()).ldelim();
            if (message.contacts != null && message.contacts.length)
                for (let i = 0; i < message.contacts.length; ++i)
                    $root.join.EssentialData.AugmentedContact.encode(message.contacts[i], writer.uint32(/* id 7, wireType 2 =*/58).fork()).ldelim();
            if (message.groups != null && message.groups.length)
                for (let i = 0; i < message.groups.length; ++i)
                    $root.join.EssentialData.AugmentedGroup.encode(message.groups[i], writer.uint32(/* id 8, wireType 2 =*/66).fork()).ldelim();
            if (message.distributionLists != null && message.distributionLists.length)
                for (let i = 0; i < message.distributionLists.length; ++i)
                    $root.join.EssentialData.AugmentedDistributionList.encode(message.distributionLists[i], writer.uint32(/* id 9, wireType 2 =*/74).fork()).ldelim();
            if (message.cspHashedNonces != null && message.cspHashedNonces.length)
                for (let i = 0; i < message.cspHashedNonces.length; ++i)
                    writer.uint32(/* id 10, wireType 2 =*/82).bytes(message.cspHashedNonces[i]);
            if (message.d2dHashedNonces != null && message.d2dHashedNonces.length)
                for (let i = 0; i < message.d2dHashedNonces.length; ++i)
                    writer.uint32(/* id 11, wireType 2 =*/90).bytes(message.d2dHashedNonces[i]);
            if (message.workCredentials != null && Object.hasOwnProperty.call(message, "workCredentials"))
                $root.sync.ThreemaWorkCredentials.encode(message.workCredentials, writer.uint32(/* id 12, wireType 2 =*/98).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes an EssentialData message from the specified reader or buffer.
         * @function decode
         * @memberof join.EssentialData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {join.EssentialData} EssentialData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EssentialData.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.join.EssentialData();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 2: {
                        message.identityData = $root.join.EssentialData.IdentityData.decode(reader, reader.uint32());
                        break;
                    }
                case 12: {
                        message.workCredentials = $root.sync.ThreemaWorkCredentials.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.deviceGroupData = $root.join.EssentialData.DeviceGroupData.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.userProfile = $root.sync.UserProfile.decode(reader, reader.uint32());
                        break;
                    }
                case 5: {
                        message.settings = $root.sync.Settings.decode(reader, reader.uint32());
                        break;
                    }
                case 6: {
                        message.mdmParameters = $root.sync.MdmParameters.decode(reader, reader.uint32());
                        break;
                    }
                case 7: {
                        if (!(message.contacts && message.contacts.length))
                            message.contacts = [];
                        message.contacts.push($root.join.EssentialData.AugmentedContact.decode(reader, reader.uint32()));
                        break;
                    }
                case 8: {
                        if (!(message.groups && message.groups.length))
                            message.groups = [];
                        message.groups.push($root.join.EssentialData.AugmentedGroup.decode(reader, reader.uint32()));
                        break;
                    }
                case 9: {
                        if (!(message.distributionLists && message.distributionLists.length))
                            message.distributionLists = [];
                        message.distributionLists.push($root.join.EssentialData.AugmentedDistributionList.decode(reader, reader.uint32()));
                        break;
                    }
                case 10: {
                        if (!(message.cspHashedNonces && message.cspHashedNonces.length))
                            message.cspHashedNonces = [];
                        message.cspHashedNonces.push(reader.bytes());
                        break;
                    }
                case 11: {
                        if (!(message.d2dHashedNonces && message.d2dHashedNonces.length))
                            message.d2dHashedNonces = [];
                        message.d2dHashedNonces.push(reader.bytes());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        EssentialData.IdentityData = (function() {

            /**
             * Properties of an IdentityData.
             * @memberof join.EssentialData
             * @interface IIdentityData
             * @property {string|null} [identity] IdentityData identity
             * @property {Uint8Array|null} [ck] IdentityData ck
             * @property {Uint8Array|null} [cspDeviceCookie] IdentityData cspDeviceCookie
             * @property {string|null} [cspServerGroup] IdentityData cspServerGroup
             */

            /**
             * Constructs a new IdentityData.
             * @memberof join.EssentialData
             * @classdesc Represents an IdentityData.
             * @implements IIdentityData
             * @constructor
             * @param {join.EssentialData.IIdentityData=} [properties] Properties to set
             */
            function IdentityData(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * IdentityData identity.
             * @member {string} identity
             * @memberof join.EssentialData.IdentityData
             * @instance
             */
            IdentityData.prototype.identity = "";

            /**
             * IdentityData ck.
             * @member {Uint8Array} ck
             * @memberof join.EssentialData.IdentityData
             * @instance
             */
            IdentityData.prototype.ck = $util.newBuffer([]);

            /**
             * IdentityData cspDeviceCookie.
             * @member {Uint8Array} cspDeviceCookie
             * @memberof join.EssentialData.IdentityData
             * @instance
             */
            IdentityData.prototype.cspDeviceCookie = $util.newBuffer([]);

            /**
             * IdentityData cspServerGroup.
             * @member {string} cspServerGroup
             * @memberof join.EssentialData.IdentityData
             * @instance
             */
            IdentityData.prototype.cspServerGroup = "";

            /**
             * Encodes the specified IdentityData message. Does not implicitly {@link join.EssentialData.IdentityData.verify|verify} messages.
             * @function encode
             * @memberof join.EssentialData.IdentityData
             * @static
             * @param {join.EssentialData.IdentityData} message IdentityData message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            IdentityData.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.identity != null && Object.hasOwnProperty.call(message, "identity"))
                    writer.uint32(/* id 1, wireType 2 =*/10).string(message.identity);
                if (message.ck != null && Object.hasOwnProperty.call(message, "ck"))
                    writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.ck);
                if (message.cspDeviceCookie != null && Object.hasOwnProperty.call(message, "cspDeviceCookie"))
                    writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.cspDeviceCookie);
                if (message.cspServerGroup != null && Object.hasOwnProperty.call(message, "cspServerGroup"))
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.cspServerGroup);
                return writer;
            };

            /**
             * Decodes an IdentityData message from the specified reader or buffer.
             * @function decode
             * @memberof join.EssentialData.IdentityData
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {join.EssentialData.IdentityData} IdentityData
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            IdentityData.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.join.EssentialData.IdentityData();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.identity = reader.string();
                            break;
                        }
                    case 2: {
                            message.ck = reader.bytes();
                            break;
                        }
                    case 3: {
                            message.cspDeviceCookie = reader.bytes();
                            break;
                        }
                    case 4: {
                            message.cspServerGroup = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return IdentityData;
        })();

        EssentialData.DeviceGroupData = (function() {

            /**
             * Properties of a DeviceGroupData.
             * @memberof join.EssentialData
             * @interface IDeviceGroupData
             * @property {Uint8Array|null} [dgk] DeviceGroupData dgk
             */

            /**
             * Constructs a new DeviceGroupData.
             * @memberof join.EssentialData
             * @classdesc Represents a DeviceGroupData.
             * @implements IDeviceGroupData
             * @constructor
             * @param {join.EssentialData.IDeviceGroupData=} [properties] Properties to set
             */
            function DeviceGroupData(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * DeviceGroupData dgk.
             * @member {Uint8Array} dgk
             * @memberof join.EssentialData.DeviceGroupData
             * @instance
             */
            DeviceGroupData.prototype.dgk = $util.newBuffer([]);

            /**
             * Encodes the specified DeviceGroupData message. Does not implicitly {@link join.EssentialData.DeviceGroupData.verify|verify} messages.
             * @function encode
             * @memberof join.EssentialData.DeviceGroupData
             * @static
             * @param {join.EssentialData.DeviceGroupData} message DeviceGroupData message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            DeviceGroupData.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.dgk != null && Object.hasOwnProperty.call(message, "dgk"))
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.dgk);
                return writer;
            };

            /**
             * Decodes a DeviceGroupData message from the specified reader or buffer.
             * @function decode
             * @memberof join.EssentialData.DeviceGroupData
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {join.EssentialData.DeviceGroupData} DeviceGroupData
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            DeviceGroupData.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.join.EssentialData.DeviceGroupData();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.dgk = reader.bytes();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return DeviceGroupData;
        })();

        EssentialData.AugmentedContact = (function() {

            /**
             * Properties of an AugmentedContact.
             * @memberof join.EssentialData
             * @interface IAugmentedContact
             * @property {sync.Contact|null} [contact] AugmentedContact contact
             * @property {Long|null} [lastUpdateAt] AugmentedContact lastUpdateAt
             */

            /**
             * Constructs a new AugmentedContact.
             * @memberof join.EssentialData
             * @classdesc Represents an AugmentedContact.
             * @implements IAugmentedContact
             * @constructor
             * @param {join.EssentialData.IAugmentedContact=} [properties] Properties to set
             */
            function AugmentedContact(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * AugmentedContact contact.
             * @member {sync.Contact|null|undefined} contact
             * @memberof join.EssentialData.AugmentedContact
             * @instance
             */
            AugmentedContact.prototype.contact = null;

            /**
             * AugmentedContact lastUpdateAt.
             * @member {Long|null|undefined} lastUpdateAt
             * @memberof join.EssentialData.AugmentedContact
             * @instance
             */
            AugmentedContact.prototype.lastUpdateAt = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * AugmentedContact _lastUpdateAt.
             * @member {"lastUpdateAt"|undefined} _lastUpdateAt
             * @memberof join.EssentialData.AugmentedContact
             * @instance
             */
            Object.defineProperty(AugmentedContact.prototype, "_lastUpdateAt", {
                get: $util.oneOfGetter($oneOfFields = ["lastUpdateAt"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified AugmentedContact message. Does not implicitly {@link join.EssentialData.AugmentedContact.verify|verify} messages.
             * @function encode
             * @memberof join.EssentialData.AugmentedContact
             * @static
             * @param {join.EssentialData.AugmentedContact} message AugmentedContact message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AugmentedContact.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.contact != null && Object.hasOwnProperty.call(message, "contact"))
                    $root.sync.Contact.encode(message.contact, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.lastUpdateAt != null && Object.hasOwnProperty.call(message, "lastUpdateAt"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.lastUpdateAt);
                return writer;
            };

            /**
             * Decodes an AugmentedContact message from the specified reader or buffer.
             * @function decode
             * @memberof join.EssentialData.AugmentedContact
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {join.EssentialData.AugmentedContact} AugmentedContact
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AugmentedContact.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.join.EssentialData.AugmentedContact();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.contact = $root.sync.Contact.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.lastUpdateAt = reader.uint64();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return AugmentedContact;
        })();

        EssentialData.AugmentedGroup = (function() {

            /**
             * Properties of an AugmentedGroup.
             * @memberof join.EssentialData
             * @interface IAugmentedGroup
             * @property {sync.Group|null} [group] AugmentedGroup group
             * @property {Long|null} [lastUpdateAt] AugmentedGroup lastUpdateAt
             */

            /**
             * Constructs a new AugmentedGroup.
             * @memberof join.EssentialData
             * @classdesc Represents an AugmentedGroup.
             * @implements IAugmentedGroup
             * @constructor
             * @param {join.EssentialData.IAugmentedGroup=} [properties] Properties to set
             */
            function AugmentedGroup(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * AugmentedGroup group.
             * @member {sync.Group|null|undefined} group
             * @memberof join.EssentialData.AugmentedGroup
             * @instance
             */
            AugmentedGroup.prototype.group = null;

            /**
             * AugmentedGroup lastUpdateAt.
             * @member {Long} lastUpdateAt
             * @memberof join.EssentialData.AugmentedGroup
             * @instance
             */
            AugmentedGroup.prototype.lastUpdateAt = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

            /**
             * Encodes the specified AugmentedGroup message. Does not implicitly {@link join.EssentialData.AugmentedGroup.verify|verify} messages.
             * @function encode
             * @memberof join.EssentialData.AugmentedGroup
             * @static
             * @param {join.EssentialData.AugmentedGroup} message AugmentedGroup message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AugmentedGroup.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.group != null && Object.hasOwnProperty.call(message, "group"))
                    $root.sync.Group.encode(message.group, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.lastUpdateAt != null && Object.hasOwnProperty.call(message, "lastUpdateAt"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.lastUpdateAt);
                return writer;
            };

            /**
             * Decodes an AugmentedGroup message from the specified reader or buffer.
             * @function decode
             * @memberof join.EssentialData.AugmentedGroup
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {join.EssentialData.AugmentedGroup} AugmentedGroup
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AugmentedGroup.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.join.EssentialData.AugmentedGroup();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.group = $root.sync.Group.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.lastUpdateAt = reader.uint64();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return AugmentedGroup;
        })();

        EssentialData.AugmentedDistributionList = (function() {

            /**
             * Properties of an AugmentedDistributionList.
             * @memberof join.EssentialData
             * @interface IAugmentedDistributionList
             * @property {sync.DistributionList|null} [distributionList] AugmentedDistributionList distributionList
             * @property {Long|null} [lastUpdateAt] AugmentedDistributionList lastUpdateAt
             */

            /**
             * Constructs a new AugmentedDistributionList.
             * @memberof join.EssentialData
             * @classdesc Represents an AugmentedDistributionList.
             * @implements IAugmentedDistributionList
             * @constructor
             * @param {join.EssentialData.IAugmentedDistributionList=} [properties] Properties to set
             */
            function AugmentedDistributionList(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * AugmentedDistributionList distributionList.
             * @member {sync.DistributionList|null|undefined} distributionList
             * @memberof join.EssentialData.AugmentedDistributionList
             * @instance
             */
            AugmentedDistributionList.prototype.distributionList = null;

            /**
             * AugmentedDistributionList lastUpdateAt.
             * @member {Long} lastUpdateAt
             * @memberof join.EssentialData.AugmentedDistributionList
             * @instance
             */
            AugmentedDistributionList.prototype.lastUpdateAt = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

            /**
             * Encodes the specified AugmentedDistributionList message. Does not implicitly {@link join.EssentialData.AugmentedDistributionList.verify|verify} messages.
             * @function encode
             * @memberof join.EssentialData.AugmentedDistributionList
             * @static
             * @param {join.EssentialData.AugmentedDistributionList} message AugmentedDistributionList message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AugmentedDistributionList.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.distributionList != null && Object.hasOwnProperty.call(message, "distributionList"))
                    $root.sync.DistributionList.encode(message.distributionList, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.lastUpdateAt != null && Object.hasOwnProperty.call(message, "lastUpdateAt"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.lastUpdateAt);
                return writer;
            };

            /**
             * Decodes an AugmentedDistributionList message from the specified reader or buffer.
             * @function decode
             * @memberof join.EssentialData.AugmentedDistributionList
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {join.EssentialData.AugmentedDistributionList} AugmentedDistributionList
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AugmentedDistributionList.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.join.EssentialData.AugmentedDistributionList();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.distributionList = $root.sync.DistributionList.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.lastUpdateAt = reader.uint64();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return AugmentedDistributionList;
        })();

        return EssentialData;
    })();

    join.Registered = (function() {

        /**
         * Properties of a Registered.
         * @memberof join
         * @interface IRegistered
         */

        /**
         * Constructs a new Registered.
         * @memberof join
         * @classdesc Represents a Registered.
         * @implements IRegistered
         * @constructor
         * @param {join.IRegistered=} [properties] Properties to set
         */
        function Registered(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified Registered message. Does not implicitly {@link join.Registered.verify|verify} messages.
         * @function encode
         * @memberof join.Registered
         * @static
         * @param {join.Registered} message Registered message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Registered.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes a Registered message from the specified reader or buffer.
         * @function decode
         * @memberof join.Registered
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {join.Registered} Registered
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Registered.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.join.Registered();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return Registered;
    })();

    return join;
})();

export const rendezvous = $root.rendezvous = (() => {

    /**
     * Namespace rendezvous.
     * @exports rendezvous
     * @namespace
     */
    const rendezvous = {};

    rendezvous.RendezvousInit = (function() {

        /**
         * Properties of a RendezvousInit.
         * @memberof rendezvous
         * @interface IRendezvousInit
         * @property {rendezvous.RendezvousInit.Version|null} [version] RendezvousInit version
         * @property {Uint8Array|null} [ak] RendezvousInit ak
         * @property {rendezvous.RendezvousInit.RelayedWebSocket|null} [relayedWebSocket] RendezvousInit relayedWebSocket
         * @property {rendezvous.RendezvousInit.DirectTcpServer|null} [directTcpServer] RendezvousInit directTcpServer
         */

        /**
         * Constructs a new RendezvousInit.
         * @memberof rendezvous
         * @classdesc Represents a RendezvousInit.
         * @implements IRendezvousInit
         * @constructor
         * @param {rendezvous.IRendezvousInit=} [properties] Properties to set
         */
        function RendezvousInit(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * RendezvousInit version.
         * @member {rendezvous.RendezvousInit.Version} version
         * @memberof rendezvous.RendezvousInit
         * @instance
         */
        RendezvousInit.prototype.version = 0;

        /**
         * RendezvousInit ak.
         * @member {Uint8Array} ak
         * @memberof rendezvous.RendezvousInit
         * @instance
         */
        RendezvousInit.prototype.ak = $util.newBuffer([]);

        /**
         * RendezvousInit relayedWebSocket.
         * @member {rendezvous.RendezvousInit.RelayedWebSocket|null|undefined} relayedWebSocket
         * @memberof rendezvous.RendezvousInit
         * @instance
         */
        RendezvousInit.prototype.relayedWebSocket = null;

        /**
         * RendezvousInit directTcpServer.
         * @member {rendezvous.RendezvousInit.DirectTcpServer|null|undefined} directTcpServer
         * @memberof rendezvous.RendezvousInit
         * @instance
         */
        RendezvousInit.prototype.directTcpServer = null;

        /**
         * Encodes the specified RendezvousInit message. Does not implicitly {@link rendezvous.RendezvousInit.verify|verify} messages.
         * @function encode
         * @memberof rendezvous.RendezvousInit
         * @static
         * @param {rendezvous.RendezvousInit} message RendezvousInit message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RendezvousInit.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.version);
            if (message.ak != null && Object.hasOwnProperty.call(message, "ak"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.ak);
            if (message.relayedWebSocket != null && Object.hasOwnProperty.call(message, "relayedWebSocket"))
                $root.rendezvous.RendezvousInit.RelayedWebSocket.encode(message.relayedWebSocket, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.directTcpServer != null && Object.hasOwnProperty.call(message, "directTcpServer"))
                $root.rendezvous.RendezvousInit.DirectTcpServer.encode(message.directTcpServer, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a RendezvousInit message from the specified reader or buffer.
         * @function decode
         * @memberof rendezvous.RendezvousInit
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {rendezvous.RendezvousInit} RendezvousInit
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RendezvousInit.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.rendezvous.RendezvousInit();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.version = reader.int32();
                        break;
                    }
                case 2: {
                        message.ak = reader.bytes();
                        break;
                    }
                case 3: {
                        message.relayedWebSocket = $root.rendezvous.RendezvousInit.RelayedWebSocket.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.directTcpServer = $root.rendezvous.RendezvousInit.DirectTcpServer.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Version enum.
         * @name rendezvous.RendezvousInit.Version
         * @enum {number}
         * @property {number} V1_0=0 V1_0 value
         */
        RendezvousInit.Version = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "V1_0"] = 0;
            return values;
        })();

        /**
         * NetworkCost enum.
         * @name rendezvous.RendezvousInit.NetworkCost
         * @enum {number}
         * @property {number} UNKNOWN=0 UNKNOWN value
         * @property {number} UNMETERED=1 UNMETERED value
         * @property {number} METERED=2 METERED value
         */
        RendezvousInit.NetworkCost = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "UNKNOWN"] = 0;
            values[valuesById[1] = "UNMETERED"] = 1;
            values[valuesById[2] = "METERED"] = 2;
            return values;
        })();

        RendezvousInit.RelayedWebSocket = (function() {

            /**
             * Properties of a RelayedWebSocket.
             * @memberof rendezvous.RendezvousInit
             * @interface IRelayedWebSocket
             * @property {number|null} [pathId] RelayedWebSocket pathId
             * @property {rendezvous.RendezvousInit.NetworkCost|null} [networkCost] RelayedWebSocket networkCost
             * @property {string|null} [url] RelayedWebSocket url
             */

            /**
             * Constructs a new RelayedWebSocket.
             * @memberof rendezvous.RendezvousInit
             * @classdesc Represents a RelayedWebSocket.
             * @implements IRelayedWebSocket
             * @constructor
             * @param {rendezvous.RendezvousInit.IRelayedWebSocket=} [properties] Properties to set
             */
            function RelayedWebSocket(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * RelayedWebSocket pathId.
             * @member {number} pathId
             * @memberof rendezvous.RendezvousInit.RelayedWebSocket
             * @instance
             */
            RelayedWebSocket.prototype.pathId = 0;

            /**
             * RelayedWebSocket networkCost.
             * @member {rendezvous.RendezvousInit.NetworkCost} networkCost
             * @memberof rendezvous.RendezvousInit.RelayedWebSocket
             * @instance
             */
            RelayedWebSocket.prototype.networkCost = 0;

            /**
             * RelayedWebSocket url.
             * @member {string} url
             * @memberof rendezvous.RendezvousInit.RelayedWebSocket
             * @instance
             */
            RelayedWebSocket.prototype.url = "";

            /**
             * Encodes the specified RelayedWebSocket message. Does not implicitly {@link rendezvous.RendezvousInit.RelayedWebSocket.verify|verify} messages.
             * @function encode
             * @memberof rendezvous.RendezvousInit.RelayedWebSocket
             * @static
             * @param {rendezvous.RendezvousInit.RelayedWebSocket} message RelayedWebSocket message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RelayedWebSocket.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.pathId != null && Object.hasOwnProperty.call(message, "pathId"))
                    writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.pathId);
                if (message.networkCost != null && Object.hasOwnProperty.call(message, "networkCost"))
                    writer.uint32(/* id 2, wireType 0 =*/16).int32(message.networkCost);
                if (message.url != null && Object.hasOwnProperty.call(message, "url"))
                    writer.uint32(/* id 3, wireType 2 =*/26).string(message.url);
                return writer;
            };

            /**
             * Decodes a RelayedWebSocket message from the specified reader or buffer.
             * @function decode
             * @memberof rendezvous.RendezvousInit.RelayedWebSocket
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {rendezvous.RendezvousInit.RelayedWebSocket} RelayedWebSocket
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RelayedWebSocket.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.rendezvous.RendezvousInit.RelayedWebSocket();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.pathId = reader.uint32();
                            break;
                        }
                    case 2: {
                            message.networkCost = reader.int32();
                            break;
                        }
                    case 3: {
                            message.url = reader.string();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return RelayedWebSocket;
        })();

        RendezvousInit.DirectTcpServer = (function() {

            /**
             * Properties of a DirectTcpServer.
             * @memberof rendezvous.RendezvousInit
             * @interface IDirectTcpServer
             * @property {number|null} [port] DirectTcpServer port
             * @property {Array.<rendezvous.RendezvousInit.DirectTcpServer.IpAddress>|null} [ipAddresses] DirectTcpServer ipAddresses
             */

            /**
             * Constructs a new DirectTcpServer.
             * @memberof rendezvous.RendezvousInit
             * @classdesc Represents a DirectTcpServer.
             * @implements IDirectTcpServer
             * @constructor
             * @param {rendezvous.RendezvousInit.IDirectTcpServer=} [properties] Properties to set
             */
            function DirectTcpServer(properties) {
                this.ipAddresses = [];
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * DirectTcpServer port.
             * @member {number} port
             * @memberof rendezvous.RendezvousInit.DirectTcpServer
             * @instance
             */
            DirectTcpServer.prototype.port = 0;

            /**
             * DirectTcpServer ipAddresses.
             * @member {Array.<rendezvous.RendezvousInit.DirectTcpServer.IpAddress>} ipAddresses
             * @memberof rendezvous.RendezvousInit.DirectTcpServer
             * @instance
             */
            DirectTcpServer.prototype.ipAddresses = $util.emptyArray;

            /**
             * Encodes the specified DirectTcpServer message. Does not implicitly {@link rendezvous.RendezvousInit.DirectTcpServer.verify|verify} messages.
             * @function encode
             * @memberof rendezvous.RendezvousInit.DirectTcpServer
             * @static
             * @param {rendezvous.RendezvousInit.DirectTcpServer} message DirectTcpServer message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            DirectTcpServer.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.port != null && Object.hasOwnProperty.call(message, "port"))
                    writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.port);
                if (message.ipAddresses != null && message.ipAddresses.length)
                    for (let i = 0; i < message.ipAddresses.length; ++i)
                        $root.rendezvous.RendezvousInit.DirectTcpServer.IpAddress.encode(message.ipAddresses[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes a DirectTcpServer message from the specified reader or buffer.
             * @function decode
             * @memberof rendezvous.RendezvousInit.DirectTcpServer
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {rendezvous.RendezvousInit.DirectTcpServer} DirectTcpServer
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            DirectTcpServer.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.rendezvous.RendezvousInit.DirectTcpServer();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.port = reader.uint32();
                            break;
                        }
                    case 2: {
                            if (!(message.ipAddresses && message.ipAddresses.length))
                                message.ipAddresses = [];
                            message.ipAddresses.push($root.rendezvous.RendezvousInit.DirectTcpServer.IpAddress.decode(reader, reader.uint32()));
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            DirectTcpServer.IpAddress = (function() {

                /**
                 * Properties of an IpAddress.
                 * @memberof rendezvous.RendezvousInit.DirectTcpServer
                 * @interface IIpAddress
                 * @property {number|null} [pathId] IpAddress pathId
                 * @property {rendezvous.RendezvousInit.NetworkCost|null} [networkCost] IpAddress networkCost
                 * @property {string|null} [ip] IpAddress ip
                 */

                /**
                 * Constructs a new IpAddress.
                 * @memberof rendezvous.RendezvousInit.DirectTcpServer
                 * @classdesc Represents an IpAddress.
                 * @implements IIpAddress
                 * @constructor
                 * @param {rendezvous.RendezvousInit.DirectTcpServer.IIpAddress=} [properties] Properties to set
                 */
                function IpAddress(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * IpAddress pathId.
                 * @member {number} pathId
                 * @memberof rendezvous.RendezvousInit.DirectTcpServer.IpAddress
                 * @instance
                 */
                IpAddress.prototype.pathId = 0;

                /**
                 * IpAddress networkCost.
                 * @member {rendezvous.RendezvousInit.NetworkCost} networkCost
                 * @memberof rendezvous.RendezvousInit.DirectTcpServer.IpAddress
                 * @instance
                 */
                IpAddress.prototype.networkCost = 0;

                /**
                 * IpAddress ip.
                 * @member {string} ip
                 * @memberof rendezvous.RendezvousInit.DirectTcpServer.IpAddress
                 * @instance
                 */
                IpAddress.prototype.ip = "";

                /**
                 * Encodes the specified IpAddress message. Does not implicitly {@link rendezvous.RendezvousInit.DirectTcpServer.IpAddress.verify|verify} messages.
                 * @function encode
                 * @memberof rendezvous.RendezvousInit.DirectTcpServer.IpAddress
                 * @static
                 * @param {rendezvous.RendezvousInit.DirectTcpServer.IpAddress} message IpAddress message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                IpAddress.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.pathId != null && Object.hasOwnProperty.call(message, "pathId"))
                        writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.pathId);
                    if (message.networkCost != null && Object.hasOwnProperty.call(message, "networkCost"))
                        writer.uint32(/* id 2, wireType 0 =*/16).int32(message.networkCost);
                    if (message.ip != null && Object.hasOwnProperty.call(message, "ip"))
                        writer.uint32(/* id 3, wireType 2 =*/26).string(message.ip);
                    return writer;
                };

                /**
                 * Decodes an IpAddress message from the specified reader or buffer.
                 * @function decode
                 * @memberof rendezvous.RendezvousInit.DirectTcpServer.IpAddress
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {rendezvous.RendezvousInit.DirectTcpServer.IpAddress} IpAddress
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                IpAddress.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.rendezvous.RendezvousInit.DirectTcpServer.IpAddress();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.pathId = reader.uint32();
                                break;
                            }
                        case 2: {
                                message.networkCost = reader.int32();
                                break;
                            }
                        case 3: {
                                message.ip = reader.string();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return IpAddress;
            })();

            return DirectTcpServer;
        })();

        return RendezvousInit;
    })();

    rendezvous.Handshake = (function() {

        /**
         * Properties of a Handshake.
         * @memberof rendezvous
         * @interface IHandshake
         */

        /**
         * Constructs a new Handshake.
         * @memberof rendezvous
         * @classdesc Represents a Handshake.
         * @implements IHandshake
         * @constructor
         * @param {rendezvous.IHandshake=} [properties] Properties to set
         */
        function Handshake(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified Handshake message. Does not implicitly {@link rendezvous.Handshake.verify|verify} messages.
         * @function encode
         * @memberof rendezvous.Handshake
         * @static
         * @param {rendezvous.Handshake} message Handshake message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Handshake.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes a Handshake message from the specified reader or buffer.
         * @function decode
         * @memberof rendezvous.Handshake
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {rendezvous.Handshake} Handshake
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Handshake.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.rendezvous.Handshake();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        Handshake.RrdToRid = (function() {

            /**
             * Properties of a RrdToRid.
             * @memberof rendezvous.Handshake
             * @interface IRrdToRid
             */

            /**
             * Constructs a new RrdToRid.
             * @memberof rendezvous.Handshake
             * @classdesc Represents a RrdToRid.
             * @implements IRrdToRid
             * @constructor
             * @param {rendezvous.Handshake.IRrdToRid=} [properties] Properties to set
             */
            function RrdToRid(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Encodes the specified RrdToRid message. Does not implicitly {@link rendezvous.Handshake.RrdToRid.verify|verify} messages.
             * @function encode
             * @memberof rendezvous.Handshake.RrdToRid
             * @static
             * @param {rendezvous.Handshake.RrdToRid} message RrdToRid message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RrdToRid.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Decodes a RrdToRid message from the specified reader or buffer.
             * @function decode
             * @memberof rendezvous.Handshake.RrdToRid
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {rendezvous.Handshake.RrdToRid} RrdToRid
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RrdToRid.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.rendezvous.Handshake.RrdToRid();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            RrdToRid.Hello = (function() {

                /**
                 * Properties of a Hello.
                 * @memberof rendezvous.Handshake.RrdToRid
                 * @interface IHello
                 * @property {Uint8Array|null} [challenge] Hello challenge
                 * @property {Uint8Array|null} [etk] Hello etk
                 */

                /**
                 * Constructs a new Hello.
                 * @memberof rendezvous.Handshake.RrdToRid
                 * @classdesc Represents a Hello.
                 * @implements IHello
                 * @constructor
                 * @param {rendezvous.Handshake.RrdToRid.IHello=} [properties] Properties to set
                 */
                function Hello(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Hello challenge.
                 * @member {Uint8Array} challenge
                 * @memberof rendezvous.Handshake.RrdToRid.Hello
                 * @instance
                 */
                Hello.prototype.challenge = $util.newBuffer([]);

                /**
                 * Hello etk.
                 * @member {Uint8Array} etk
                 * @memberof rendezvous.Handshake.RrdToRid.Hello
                 * @instance
                 */
                Hello.prototype.etk = $util.newBuffer([]);

                /**
                 * Encodes the specified Hello message. Does not implicitly {@link rendezvous.Handshake.RrdToRid.Hello.verify|verify} messages.
                 * @function encode
                 * @memberof rendezvous.Handshake.RrdToRid.Hello
                 * @static
                 * @param {rendezvous.Handshake.RrdToRid.Hello} message Hello message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Hello.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.challenge != null && Object.hasOwnProperty.call(message, "challenge"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.challenge);
                    if (message.etk != null && Object.hasOwnProperty.call(message, "etk"))
                        writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.etk);
                    return writer;
                };

                /**
                 * Decodes a Hello message from the specified reader or buffer.
                 * @function decode
                 * @memberof rendezvous.Handshake.RrdToRid.Hello
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {rendezvous.Handshake.RrdToRid.Hello} Hello
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Hello.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.rendezvous.Handshake.RrdToRid.Hello();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.challenge = reader.bytes();
                                break;
                            }
                        case 2: {
                                message.etk = reader.bytes();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Hello;
            })();

            RrdToRid.Auth = (function() {

                /**
                 * Properties of an Auth.
                 * @memberof rendezvous.Handshake.RrdToRid
                 * @interface IAuth
                 * @property {Uint8Array|null} [response] Auth response
                 */

                /**
                 * Constructs a new Auth.
                 * @memberof rendezvous.Handshake.RrdToRid
                 * @classdesc Represents an Auth.
                 * @implements IAuth
                 * @constructor
                 * @param {rendezvous.Handshake.RrdToRid.IAuth=} [properties] Properties to set
                 */
                function Auth(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * Auth response.
                 * @member {Uint8Array} response
                 * @memberof rendezvous.Handshake.RrdToRid.Auth
                 * @instance
                 */
                Auth.prototype.response = $util.newBuffer([]);

                /**
                 * Encodes the specified Auth message. Does not implicitly {@link rendezvous.Handshake.RrdToRid.Auth.verify|verify} messages.
                 * @function encode
                 * @memberof rendezvous.Handshake.RrdToRid.Auth
                 * @static
                 * @param {rendezvous.Handshake.RrdToRid.Auth} message Auth message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                Auth.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.response != null && Object.hasOwnProperty.call(message, "response"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.response);
                    return writer;
                };

                /**
                 * Decodes an Auth message from the specified reader or buffer.
                 * @function decode
                 * @memberof rendezvous.Handshake.RrdToRid.Auth
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {rendezvous.Handshake.RrdToRid.Auth} Auth
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                Auth.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.rendezvous.Handshake.RrdToRid.Auth();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.response = reader.bytes();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return Auth;
            })();

            return RrdToRid;
        })();

        Handshake.RidToRrd = (function() {

            /**
             * Properties of a RidToRrd.
             * @memberof rendezvous.Handshake
             * @interface IRidToRrd
             */

            /**
             * Constructs a new RidToRrd.
             * @memberof rendezvous.Handshake
             * @classdesc Represents a RidToRrd.
             * @implements IRidToRrd
             * @constructor
             * @param {rendezvous.Handshake.IRidToRrd=} [properties] Properties to set
             */
            function RidToRrd(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Encodes the specified RidToRrd message. Does not implicitly {@link rendezvous.Handshake.RidToRrd.verify|verify} messages.
             * @function encode
             * @memberof rendezvous.Handshake.RidToRrd
             * @static
             * @param {rendezvous.Handshake.RidToRrd} message RidToRrd message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            RidToRrd.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                return writer;
            };

            /**
             * Decodes a RidToRrd message from the specified reader or buffer.
             * @function decode
             * @memberof rendezvous.Handshake.RidToRrd
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {rendezvous.Handshake.RidToRrd} RidToRrd
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            RidToRrd.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.rendezvous.Handshake.RidToRrd();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            RidToRrd.AuthHello = (function() {

                /**
                 * Properties of an AuthHello.
                 * @memberof rendezvous.Handshake.RidToRrd
                 * @interface IAuthHello
                 * @property {Uint8Array|null} [response] AuthHello response
                 * @property {Uint8Array|null} [challenge] AuthHello challenge
                 * @property {Uint8Array|null} [etk] AuthHello etk
                 */

                /**
                 * Constructs a new AuthHello.
                 * @memberof rendezvous.Handshake.RidToRrd
                 * @classdesc Represents an AuthHello.
                 * @implements IAuthHello
                 * @constructor
                 * @param {rendezvous.Handshake.RidToRrd.IAuthHello=} [properties] Properties to set
                 */
                function AuthHello(properties) {
                    if (properties)
                        for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                            if (properties[keys[i]] != null)
                                this[keys[i]] = properties[keys[i]];
                }

                /**
                 * AuthHello response.
                 * @member {Uint8Array} response
                 * @memberof rendezvous.Handshake.RidToRrd.AuthHello
                 * @instance
                 */
                AuthHello.prototype.response = $util.newBuffer([]);

                /**
                 * AuthHello challenge.
                 * @member {Uint8Array} challenge
                 * @memberof rendezvous.Handshake.RidToRrd.AuthHello
                 * @instance
                 */
                AuthHello.prototype.challenge = $util.newBuffer([]);

                /**
                 * AuthHello etk.
                 * @member {Uint8Array} etk
                 * @memberof rendezvous.Handshake.RidToRrd.AuthHello
                 * @instance
                 */
                AuthHello.prototype.etk = $util.newBuffer([]);

                /**
                 * Encodes the specified AuthHello message. Does not implicitly {@link rendezvous.Handshake.RidToRrd.AuthHello.verify|verify} messages.
                 * @function encode
                 * @memberof rendezvous.Handshake.RidToRrd.AuthHello
                 * @static
                 * @param {rendezvous.Handshake.RidToRrd.AuthHello} message AuthHello message or plain object to encode
                 * @param {$protobuf.Writer} [writer] Writer to encode to
                 * @returns {$protobuf.Writer} Writer
                 */
                AuthHello.encode = function encode(message, writer) {
                    if (!writer)
                        writer = $Writer.create();
                    if (message.response != null && Object.hasOwnProperty.call(message, "response"))
                        writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.response);
                    if (message.challenge != null && Object.hasOwnProperty.call(message, "challenge"))
                        writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.challenge);
                    if (message.etk != null && Object.hasOwnProperty.call(message, "etk"))
                        writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.etk);
                    return writer;
                };

                /**
                 * Decodes an AuthHello message from the specified reader or buffer.
                 * @function decode
                 * @memberof rendezvous.Handshake.RidToRrd.AuthHello
                 * @static
                 * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
                 * @param {number} [length] Message length if known beforehand
                 * @returns {rendezvous.Handshake.RidToRrd.AuthHello} AuthHello
                 * @throws {Error} If the payload is not a reader or valid buffer
                 * @throws {$protobuf.util.ProtocolError} If required fields are missing
                 */
                AuthHello.decode = function decode(reader, length) {
                    if (!(reader instanceof $Reader))
                        reader = $Reader.create(reader);
                    let end = length === undefined ? reader.len : reader.pos + length, message = new $root.rendezvous.Handshake.RidToRrd.AuthHello();
                    while (reader.pos < end) {
                        let tag = reader.uint32();
                        switch (tag >>> 3) {
                        case 1: {
                                message.response = reader.bytes();
                                break;
                            }
                        case 2: {
                                message.challenge = reader.bytes();
                                break;
                            }
                        case 3: {
                                message.etk = reader.bytes();
                                break;
                            }
                        default:
                            reader.skipType(tag & 7);
                            break;
                        }
                    }
                    return message;
                };

                return AuthHello;
            })();

            return RidToRrd;
        })();

        return Handshake;
    })();

    rendezvous.Nominate = (function() {

        /**
         * Properties of a Nominate.
         * @memberof rendezvous
         * @interface INominate
         */

        /**
         * Constructs a new Nominate.
         * @memberof rendezvous
         * @classdesc Represents a Nominate.
         * @implements INominate
         * @constructor
         * @param {rendezvous.INominate=} [properties] Properties to set
         */
        function Nominate(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified Nominate message. Does not implicitly {@link rendezvous.Nominate.verify|verify} messages.
         * @function encode
         * @memberof rendezvous.Nominate
         * @static
         * @param {rendezvous.Nominate} message Nominate message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Nominate.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes a Nominate message from the specified reader or buffer.
         * @function decode
         * @memberof rendezvous.Nominate
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {rendezvous.Nominate} Nominate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Nominate.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.rendezvous.Nominate();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return Nominate;
    })();

    return rendezvous;
})();

export const d2m = $root.d2m = (() => {

    /**
     * Namespace d2m.
     * @exports d2m
     * @namespace
     */
    const d2m = {};

    /**
     * ProtocolVersion enum.
     * @name d2m.ProtocolVersion
     * @enum {number}
     * @property {number} INITIAL=0 INITIAL value
     */
    d2m.ProtocolVersion = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "INITIAL"] = 0;
        return values;
    })();

    d2m.ClientUrlInfo = (function() {

        /**
         * Properties of a ClientUrlInfo.
         * @memberof d2m
         * @interface IClientUrlInfo
         * @property {Uint8Array|null} [deviceGroupId] ClientUrlInfo deviceGroupId
         * @property {string|null} [serverGroup] ClientUrlInfo serverGroup
         */

        /**
         * Constructs a new ClientUrlInfo.
         * @memberof d2m
         * @classdesc Represents a ClientUrlInfo.
         * @implements IClientUrlInfo
         * @constructor
         * @param {d2m.IClientUrlInfo=} [properties] Properties to set
         */
        function ClientUrlInfo(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ClientUrlInfo deviceGroupId.
         * @member {Uint8Array} deviceGroupId
         * @memberof d2m.ClientUrlInfo
         * @instance
         */
        ClientUrlInfo.prototype.deviceGroupId = $util.newBuffer([]);

        /**
         * ClientUrlInfo serverGroup.
         * @member {string} serverGroup
         * @memberof d2m.ClientUrlInfo
         * @instance
         */
        ClientUrlInfo.prototype.serverGroup = "";

        /**
         * Encodes the specified ClientUrlInfo message. Does not implicitly {@link d2m.ClientUrlInfo.verify|verify} messages.
         * @function encode
         * @memberof d2m.ClientUrlInfo
         * @static
         * @param {d2m.ClientUrlInfo} message ClientUrlInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ClientUrlInfo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.deviceGroupId != null && Object.hasOwnProperty.call(message, "deviceGroupId"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.deviceGroupId);
            if (message.serverGroup != null && Object.hasOwnProperty.call(message, "serverGroup"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.serverGroup);
            return writer;
        };

        /**
         * Decodes a ClientUrlInfo message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.ClientUrlInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.ClientUrlInfo} ClientUrlInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ClientUrlInfo.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.ClientUrlInfo();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.deviceGroupId = reader.bytes();
                        break;
                    }
                case 3: {
                        message.serverGroup = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return ClientUrlInfo;
    })();

    d2m.ServerHello = (function() {

        /**
         * Properties of a ServerHello.
         * @memberof d2m
         * @interface IServerHello
         * @property {number|null} [version] ServerHello version
         * @property {Uint8Array|null} [esk] ServerHello esk
         * @property {Uint8Array|null} [challenge] ServerHello challenge
         */

        /**
         * Constructs a new ServerHello.
         * @memberof d2m
         * @classdesc Represents a ServerHello.
         * @implements IServerHello
         * @constructor
         * @param {d2m.IServerHello=} [properties] Properties to set
         */
        function ServerHello(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ServerHello version.
         * @member {number} version
         * @memberof d2m.ServerHello
         * @instance
         */
        ServerHello.prototype.version = 0;

        /**
         * ServerHello esk.
         * @member {Uint8Array} esk
         * @memberof d2m.ServerHello
         * @instance
         */
        ServerHello.prototype.esk = $util.newBuffer([]);

        /**
         * ServerHello challenge.
         * @member {Uint8Array} challenge
         * @memberof d2m.ServerHello
         * @instance
         */
        ServerHello.prototype.challenge = $util.newBuffer([]);

        /**
         * Encodes the specified ServerHello message. Does not implicitly {@link d2m.ServerHello.verify|verify} messages.
         * @function encode
         * @memberof d2m.ServerHello
         * @static
         * @param {d2m.ServerHello} message ServerHello message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ServerHello.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.version);
            if (message.esk != null && Object.hasOwnProperty.call(message, "esk"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.esk);
            if (message.challenge != null && Object.hasOwnProperty.call(message, "challenge"))
                writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.challenge);
            return writer;
        };

        /**
         * Decodes a ServerHello message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.ServerHello
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.ServerHello} ServerHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ServerHello.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.ServerHello();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.version = reader.uint32();
                        break;
                    }
                case 2: {
                        message.esk = reader.bytes();
                        break;
                    }
                case 3: {
                        message.challenge = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return ServerHello;
    })();

    /**
     * DeviceSlotExpirationPolicy enum.
     * @name d2m.DeviceSlotExpirationPolicy
     * @enum {number}
     * @property {number} VOLATILE=0 VOLATILE value
     * @property {number} PERSISTENT=1 PERSISTENT value
     */
    d2m.DeviceSlotExpirationPolicy = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "VOLATILE"] = 0;
        values[valuesById[1] = "PERSISTENT"] = 1;
        return values;
    })();

    /**
     * DeviceSlotState enum.
     * @name d2m.DeviceSlotState
     * @enum {number}
     * @property {number} NEW=0 NEW value
     * @property {number} EXISTING=1 EXISTING value
     */
    d2m.DeviceSlotState = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "NEW"] = 0;
        values[valuesById[1] = "EXISTING"] = 1;
        return values;
    })();

    d2m.ClientHello = (function() {

        /**
         * Properties of a ClientHello.
         * @memberof d2m
         * @interface IClientHello
         * @property {number|null} [version] ClientHello version
         * @property {Uint8Array|null} [response] ClientHello response
         * @property {Long|null} [deviceId] ClientHello deviceId
         * @property {d2m.ClientHello.DeviceSlotsExhaustedPolicy|null} [deviceSlotsExhaustedPolicy] ClientHello deviceSlotsExhaustedPolicy
         * @property {d2m.DeviceSlotExpirationPolicy|null} [deviceSlotExpirationPolicy] ClientHello deviceSlotExpirationPolicy
         * @property {d2m.DeviceSlotState|null} [expectedDeviceSlotState] ClientHello expectedDeviceSlotState
         * @property {Uint8Array|null} [encryptedDeviceInfo] ClientHello encryptedDeviceInfo
         */

        /**
         * Constructs a new ClientHello.
         * @memberof d2m
         * @classdesc Represents a ClientHello.
         * @implements IClientHello
         * @constructor
         * @param {d2m.IClientHello=} [properties] Properties to set
         */
        function ClientHello(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ClientHello version.
         * @member {number} version
         * @memberof d2m.ClientHello
         * @instance
         */
        ClientHello.prototype.version = 0;

        /**
         * ClientHello response.
         * @member {Uint8Array} response
         * @memberof d2m.ClientHello
         * @instance
         */
        ClientHello.prototype.response = $util.newBuffer([]);

        /**
         * ClientHello deviceId.
         * @member {Long} deviceId
         * @memberof d2m.ClientHello
         * @instance
         */
        ClientHello.prototype.deviceId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * ClientHello deviceSlotsExhaustedPolicy.
         * @member {d2m.ClientHello.DeviceSlotsExhaustedPolicy} deviceSlotsExhaustedPolicy
         * @memberof d2m.ClientHello
         * @instance
         */
        ClientHello.prototype.deviceSlotsExhaustedPolicy = 0;

        /**
         * ClientHello deviceSlotExpirationPolicy.
         * @member {d2m.DeviceSlotExpirationPolicy} deviceSlotExpirationPolicy
         * @memberof d2m.ClientHello
         * @instance
         */
        ClientHello.prototype.deviceSlotExpirationPolicy = 0;

        /**
         * ClientHello expectedDeviceSlotState.
         * @member {d2m.DeviceSlotState} expectedDeviceSlotState
         * @memberof d2m.ClientHello
         * @instance
         */
        ClientHello.prototype.expectedDeviceSlotState = 0;

        /**
         * ClientHello encryptedDeviceInfo.
         * @member {Uint8Array} encryptedDeviceInfo
         * @memberof d2m.ClientHello
         * @instance
         */
        ClientHello.prototype.encryptedDeviceInfo = $util.newBuffer([]);

        /**
         * Encodes the specified ClientHello message. Does not implicitly {@link d2m.ClientHello.verify|verify} messages.
         * @function encode
         * @memberof d2m.ClientHello
         * @static
         * @param {d2m.ClientHello} message ClientHello message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ClientHello.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.version);
            if (message.response != null && Object.hasOwnProperty.call(message, "response"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.response);
            if (message.deviceId != null && Object.hasOwnProperty.call(message, "deviceId"))
                writer.uint32(/* id 3, wireType 1 =*/25).fixed64(message.deviceId);
            if (message.deviceSlotsExhaustedPolicy != null && Object.hasOwnProperty.call(message, "deviceSlotsExhaustedPolicy"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.deviceSlotsExhaustedPolicy);
            if (message.deviceSlotExpirationPolicy != null && Object.hasOwnProperty.call(message, "deviceSlotExpirationPolicy"))
                writer.uint32(/* id 5, wireType 0 =*/40).int32(message.deviceSlotExpirationPolicy);
            if (message.encryptedDeviceInfo != null && Object.hasOwnProperty.call(message, "encryptedDeviceInfo"))
                writer.uint32(/* id 6, wireType 2 =*/50).bytes(message.encryptedDeviceInfo);
            if (message.expectedDeviceSlotState != null && Object.hasOwnProperty.call(message, "expectedDeviceSlotState"))
                writer.uint32(/* id 7, wireType 0 =*/56).int32(message.expectedDeviceSlotState);
            return writer;
        };

        /**
         * Decodes a ClientHello message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.ClientHello
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.ClientHello} ClientHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ClientHello.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.ClientHello();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.version = reader.uint32();
                        break;
                    }
                case 2: {
                        message.response = reader.bytes();
                        break;
                    }
                case 3: {
                        message.deviceId = reader.fixed64();
                        break;
                    }
                case 4: {
                        message.deviceSlotsExhaustedPolicy = reader.int32();
                        break;
                    }
                case 5: {
                        message.deviceSlotExpirationPolicy = reader.int32();
                        break;
                    }
                case 7: {
                        message.expectedDeviceSlotState = reader.int32();
                        break;
                    }
                case 6: {
                        message.encryptedDeviceInfo = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * DeviceSlotsExhaustedPolicy enum.
         * @name d2m.ClientHello.DeviceSlotsExhaustedPolicy
         * @enum {number}
         * @property {number} REJECT=0 REJECT value
         * @property {number} DROP_LEAST_RECENT=1 DROP_LEAST_RECENT value
         */
        ClientHello.DeviceSlotsExhaustedPolicy = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "REJECT"] = 0;
            values[valuesById[1] = "DROP_LEAST_RECENT"] = 1;
            return values;
        })();

        return ClientHello;
    })();

    d2m.ServerInfo = (function() {

        /**
         * Properties of a ServerInfo.
         * @memberof d2m
         * @interface IServerInfo
         * @property {Long|null} [currentTime] ServerInfo currentTime
         * @property {number|null} [maxDeviceSlots] ServerInfo maxDeviceSlots
         * @property {d2m.DeviceSlotState|null} [deviceSlotState] ServerInfo deviceSlotState
         * @property {Uint8Array|null} [encryptedSharedDeviceData] ServerInfo encryptedSharedDeviceData
         * @property {number|null} [reflectionQueueLength] ServerInfo reflectionQueueLength
         */

        /**
         * Constructs a new ServerInfo.
         * @memberof d2m
         * @classdesc Represents a ServerInfo.
         * @implements IServerInfo
         * @constructor
         * @param {d2m.IServerInfo=} [properties] Properties to set
         */
        function ServerInfo(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ServerInfo currentTime.
         * @member {Long} currentTime
         * @memberof d2m.ServerInfo
         * @instance
         */
        ServerInfo.prototype.currentTime = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * ServerInfo maxDeviceSlots.
         * @member {number} maxDeviceSlots
         * @memberof d2m.ServerInfo
         * @instance
         */
        ServerInfo.prototype.maxDeviceSlots = 0;

        /**
         * ServerInfo deviceSlotState.
         * @member {d2m.DeviceSlotState} deviceSlotState
         * @memberof d2m.ServerInfo
         * @instance
         */
        ServerInfo.prototype.deviceSlotState = 0;

        /**
         * ServerInfo encryptedSharedDeviceData.
         * @member {Uint8Array} encryptedSharedDeviceData
         * @memberof d2m.ServerInfo
         * @instance
         */
        ServerInfo.prototype.encryptedSharedDeviceData = $util.newBuffer([]);

        /**
         * ServerInfo reflectionQueueLength.
         * @member {number} reflectionQueueLength
         * @memberof d2m.ServerInfo
         * @instance
         */
        ServerInfo.prototype.reflectionQueueLength = 0;

        /**
         * Encodes the specified ServerInfo message. Does not implicitly {@link d2m.ServerInfo.verify|verify} messages.
         * @function encode
         * @memberof d2m.ServerInfo
         * @static
         * @param {d2m.ServerInfo} message ServerInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ServerInfo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.maxDeviceSlots != null && Object.hasOwnProperty.call(message, "maxDeviceSlots"))
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.maxDeviceSlots);
            if (message.deviceSlotState != null && Object.hasOwnProperty.call(message, "deviceSlotState"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.deviceSlotState);
            if (message.encryptedSharedDeviceData != null && Object.hasOwnProperty.call(message, "encryptedSharedDeviceData"))
                writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.encryptedSharedDeviceData);
            if (message.currentTime != null && Object.hasOwnProperty.call(message, "currentTime"))
                writer.uint32(/* id 4, wireType 0 =*/32).uint64(message.currentTime);
            if (message.reflectionQueueLength != null && Object.hasOwnProperty.call(message, "reflectionQueueLength"))
                writer.uint32(/* id 5, wireType 0 =*/40).uint32(message.reflectionQueueLength);
            return writer;
        };

        /**
         * Decodes a ServerInfo message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.ServerInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.ServerInfo} ServerInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ServerInfo.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.ServerInfo();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 4: {
                        message.currentTime = reader.uint64();
                        break;
                    }
                case 1: {
                        message.maxDeviceSlots = reader.uint32();
                        break;
                    }
                case 2: {
                        message.deviceSlotState = reader.int32();
                        break;
                    }
                case 3: {
                        message.encryptedSharedDeviceData = reader.bytes();
                        break;
                    }
                case 5: {
                        message.reflectionQueueLength = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return ServerInfo;
    })();

    d2m.ReflectionQueueDry = (function() {

        /**
         * Properties of a ReflectionQueueDry.
         * @memberof d2m
         * @interface IReflectionQueueDry
         */

        /**
         * Constructs a new ReflectionQueueDry.
         * @memberof d2m
         * @classdesc Represents a ReflectionQueueDry.
         * @implements IReflectionQueueDry
         * @constructor
         * @param {d2m.IReflectionQueueDry=} [properties] Properties to set
         */
        function ReflectionQueueDry(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified ReflectionQueueDry message. Does not implicitly {@link d2m.ReflectionQueueDry.verify|verify} messages.
         * @function encode
         * @memberof d2m.ReflectionQueueDry
         * @static
         * @param {d2m.ReflectionQueueDry} message ReflectionQueueDry message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ReflectionQueueDry.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes a ReflectionQueueDry message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.ReflectionQueueDry
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.ReflectionQueueDry} ReflectionQueueDry
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ReflectionQueueDry.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.ReflectionQueueDry();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return ReflectionQueueDry;
    })();

    d2m.RolePromotedToLeader = (function() {

        /**
         * Properties of a RolePromotedToLeader.
         * @memberof d2m
         * @interface IRolePromotedToLeader
         */

        /**
         * Constructs a new RolePromotedToLeader.
         * @memberof d2m
         * @classdesc Represents a RolePromotedToLeader.
         * @implements IRolePromotedToLeader
         * @constructor
         * @param {d2m.IRolePromotedToLeader=} [properties] Properties to set
         */
        function RolePromotedToLeader(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified RolePromotedToLeader message. Does not implicitly {@link d2m.RolePromotedToLeader.verify|verify} messages.
         * @function encode
         * @memberof d2m.RolePromotedToLeader
         * @static
         * @param {d2m.RolePromotedToLeader} message RolePromotedToLeader message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        RolePromotedToLeader.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes a RolePromotedToLeader message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.RolePromotedToLeader
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.RolePromotedToLeader} RolePromotedToLeader
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        RolePromotedToLeader.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.RolePromotedToLeader();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return RolePromotedToLeader;
    })();

    d2m.GetDevicesInfo = (function() {

        /**
         * Properties of a GetDevicesInfo.
         * @memberof d2m
         * @interface IGetDevicesInfo
         */

        /**
         * Constructs a new GetDevicesInfo.
         * @memberof d2m
         * @classdesc Represents a GetDevicesInfo.
         * @implements IGetDevicesInfo
         * @constructor
         * @param {d2m.IGetDevicesInfo=} [properties] Properties to set
         */
        function GetDevicesInfo(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified GetDevicesInfo message. Does not implicitly {@link d2m.GetDevicesInfo.verify|verify} messages.
         * @function encode
         * @memberof d2m.GetDevicesInfo
         * @static
         * @param {d2m.GetDevicesInfo} message GetDevicesInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GetDevicesInfo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes a GetDevicesInfo message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.GetDevicesInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.GetDevicesInfo} GetDevicesInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GetDevicesInfo.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.GetDevicesInfo();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return GetDevicesInfo;
    })();

    d2m.DevicesInfo = (function() {

        /**
         * Properties of a DevicesInfo.
         * @memberof d2m
         * @interface IDevicesInfo
         * @property {Object.<string,d2m.DevicesInfo.AugmentedDeviceInfo>|null} [augmentedDeviceInfo] DevicesInfo augmentedDeviceInfo
         */

        /**
         * Constructs a new DevicesInfo.
         * @memberof d2m
         * @classdesc Represents a DevicesInfo.
         * @implements IDevicesInfo
         * @constructor
         * @param {d2m.IDevicesInfo=} [properties] Properties to set
         */
        function DevicesInfo(properties) {
            this.augmentedDeviceInfo = {};
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DevicesInfo augmentedDeviceInfo.
         * @member {Object.<string,d2m.DevicesInfo.AugmentedDeviceInfo>} augmentedDeviceInfo
         * @memberof d2m.DevicesInfo
         * @instance
         */
        DevicesInfo.prototype.augmentedDeviceInfo = $util.emptyObject;

        /**
         * Encodes the specified DevicesInfo message. Does not implicitly {@link d2m.DevicesInfo.verify|verify} messages.
         * @function encode
         * @memberof d2m.DevicesInfo
         * @static
         * @param {d2m.DevicesInfo} message DevicesInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DevicesInfo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.augmentedDeviceInfo != null && Object.hasOwnProperty.call(message, "augmentedDeviceInfo"))
                for (let keys = Object.keys(message.augmentedDeviceInfo), i = 0; i < keys.length; ++i) {
                    writer.uint32(/* id 1, wireType 2 =*/10).fork().uint32(/* id 1, wireType 1 =*/9).fixed64(keys[i]);
                    $root.d2m.DevicesInfo.AugmentedDeviceInfo.encode(message.augmentedDeviceInfo[keys[i]], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim().ldelim();
                }
            return writer;
        };

        /**
         * Decodes a DevicesInfo message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.DevicesInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.DevicesInfo} DevicesInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DevicesInfo.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.DevicesInfo(), key, value;
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        if (message.augmentedDeviceInfo === $util.emptyObject)
                            message.augmentedDeviceInfo = {};
                        let end2 = reader.uint32() + reader.pos;
                        key = 0;
                        value = null;
                        while (reader.pos < end2) {
                            let tag2 = reader.uint32();
                            switch (tag2 >>> 3) {
                            case 1:
                                key = reader.fixed64();
                                break;
                            case 2:
                                value = $root.d2m.DevicesInfo.AugmentedDeviceInfo.decode(reader, reader.uint32());
                                break;
                            default:
                                reader.skipType(tag2 & 7);
                                break;
                            }
                        }
                        message.augmentedDeviceInfo[typeof key === "object" ? $util.longToHash(key) : key] = value;
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        DevicesInfo.AugmentedDeviceInfo = (function() {

            /**
             * Properties of an AugmentedDeviceInfo.
             * @memberof d2m.DevicesInfo
             * @interface IAugmentedDeviceInfo
             * @property {Uint8Array|null} [encryptedDeviceInfo] AugmentedDeviceInfo encryptedDeviceInfo
             * @property {Long|null} [lastLoginAt] AugmentedDeviceInfo lastLoginAt
             * @property {d2m.DeviceSlotExpirationPolicy|null} [deviceSlotExpirationPolicy] AugmentedDeviceInfo deviceSlotExpirationPolicy
             */

            /**
             * Constructs a new AugmentedDeviceInfo.
             * @memberof d2m.DevicesInfo
             * @classdesc Represents an AugmentedDeviceInfo.
             * @implements IAugmentedDeviceInfo
             * @constructor
             * @param {d2m.DevicesInfo.IAugmentedDeviceInfo=} [properties] Properties to set
             */
            function AugmentedDeviceInfo(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * AugmentedDeviceInfo encryptedDeviceInfo.
             * @member {Uint8Array} encryptedDeviceInfo
             * @memberof d2m.DevicesInfo.AugmentedDeviceInfo
             * @instance
             */
            AugmentedDeviceInfo.prototype.encryptedDeviceInfo = $util.newBuffer([]);

            /**
             * AugmentedDeviceInfo lastLoginAt.
             * @member {Long} lastLoginAt
             * @memberof d2m.DevicesInfo.AugmentedDeviceInfo
             * @instance
             */
            AugmentedDeviceInfo.prototype.lastLoginAt = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

            /**
             * AugmentedDeviceInfo deviceSlotExpirationPolicy.
             * @member {d2m.DeviceSlotExpirationPolicy} deviceSlotExpirationPolicy
             * @memberof d2m.DevicesInfo.AugmentedDeviceInfo
             * @instance
             */
            AugmentedDeviceInfo.prototype.deviceSlotExpirationPolicy = 0;

            /**
             * Encodes the specified AugmentedDeviceInfo message. Does not implicitly {@link d2m.DevicesInfo.AugmentedDeviceInfo.verify|verify} messages.
             * @function encode
             * @memberof d2m.DevicesInfo.AugmentedDeviceInfo
             * @static
             * @param {d2m.DevicesInfo.AugmentedDeviceInfo} message AugmentedDeviceInfo message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            AugmentedDeviceInfo.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.encryptedDeviceInfo != null && Object.hasOwnProperty.call(message, "encryptedDeviceInfo"))
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.encryptedDeviceInfo);
                if (message.lastLoginAt != null && Object.hasOwnProperty.call(message, "lastLoginAt"))
                    writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.lastLoginAt);
                if (message.deviceSlotExpirationPolicy != null && Object.hasOwnProperty.call(message, "deviceSlotExpirationPolicy"))
                    writer.uint32(/* id 3, wireType 0 =*/24).int32(message.deviceSlotExpirationPolicy);
                return writer;
            };

            /**
             * Decodes an AugmentedDeviceInfo message from the specified reader or buffer.
             * @function decode
             * @memberof d2m.DevicesInfo.AugmentedDeviceInfo
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {d2m.DevicesInfo.AugmentedDeviceInfo} AugmentedDeviceInfo
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            AugmentedDeviceInfo.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.DevicesInfo.AugmentedDeviceInfo();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.encryptedDeviceInfo = reader.bytes();
                            break;
                        }
                    case 2: {
                            message.lastLoginAt = reader.uint64();
                            break;
                        }
                    case 3: {
                            message.deviceSlotExpirationPolicy = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return AugmentedDeviceInfo;
        })();

        return DevicesInfo;
    })();

    d2m.DropDevice = (function() {

        /**
         * Properties of a DropDevice.
         * @memberof d2m
         * @interface IDropDevice
         * @property {Long|null} [deviceId] DropDevice deviceId
         */

        /**
         * Constructs a new DropDevice.
         * @memberof d2m
         * @classdesc Represents a DropDevice.
         * @implements IDropDevice
         * @constructor
         * @param {d2m.IDropDevice=} [properties] Properties to set
         */
        function DropDevice(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DropDevice deviceId.
         * @member {Long} deviceId
         * @memberof d2m.DropDevice
         * @instance
         */
        DropDevice.prototype.deviceId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Encodes the specified DropDevice message. Does not implicitly {@link d2m.DropDevice.verify|verify} messages.
         * @function encode
         * @memberof d2m.DropDevice
         * @static
         * @param {d2m.DropDevice} message DropDevice message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DropDevice.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.deviceId != null && Object.hasOwnProperty.call(message, "deviceId"))
                writer.uint32(/* id 1, wireType 1 =*/9).fixed64(message.deviceId);
            return writer;
        };

        /**
         * Decodes a DropDevice message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.DropDevice
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.DropDevice} DropDevice
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DropDevice.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.DropDevice();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.deviceId = reader.fixed64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return DropDevice;
    })();

    d2m.DropDeviceAck = (function() {

        /**
         * Properties of a DropDeviceAck.
         * @memberof d2m
         * @interface IDropDeviceAck
         * @property {Long|null} [deviceId] DropDeviceAck deviceId
         */

        /**
         * Constructs a new DropDeviceAck.
         * @memberof d2m
         * @classdesc Represents a DropDeviceAck.
         * @implements IDropDeviceAck
         * @constructor
         * @param {d2m.IDropDeviceAck=} [properties] Properties to set
         */
        function DropDeviceAck(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DropDeviceAck deviceId.
         * @member {Long} deviceId
         * @memberof d2m.DropDeviceAck
         * @instance
         */
        DropDeviceAck.prototype.deviceId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Encodes the specified DropDeviceAck message. Does not implicitly {@link d2m.DropDeviceAck.verify|verify} messages.
         * @function encode
         * @memberof d2m.DropDeviceAck
         * @static
         * @param {d2m.DropDeviceAck} message DropDeviceAck message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DropDeviceAck.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.deviceId != null && Object.hasOwnProperty.call(message, "deviceId"))
                writer.uint32(/* id 1, wireType 1 =*/9).fixed64(message.deviceId);
            return writer;
        };

        /**
         * Decodes a DropDeviceAck message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.DropDeviceAck
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.DropDeviceAck} DropDeviceAck
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DropDeviceAck.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.DropDeviceAck();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.deviceId = reader.fixed64();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return DropDeviceAck;
    })();

    d2m.SetSharedDeviceData = (function() {

        /**
         * Properties of a SetSharedDeviceData.
         * @memberof d2m
         * @interface ISetSharedDeviceData
         * @property {Uint8Array|null} [encryptedSharedDeviceData] SetSharedDeviceData encryptedSharedDeviceData
         */

        /**
         * Constructs a new SetSharedDeviceData.
         * @memberof d2m
         * @classdesc Represents a SetSharedDeviceData.
         * @implements ISetSharedDeviceData
         * @constructor
         * @param {d2m.ISetSharedDeviceData=} [properties] Properties to set
         */
        function SetSharedDeviceData(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SetSharedDeviceData encryptedSharedDeviceData.
         * @member {Uint8Array} encryptedSharedDeviceData
         * @memberof d2m.SetSharedDeviceData
         * @instance
         */
        SetSharedDeviceData.prototype.encryptedSharedDeviceData = $util.newBuffer([]);

        /**
         * Encodes the specified SetSharedDeviceData message. Does not implicitly {@link d2m.SetSharedDeviceData.verify|verify} messages.
         * @function encode
         * @memberof d2m.SetSharedDeviceData
         * @static
         * @param {d2m.SetSharedDeviceData} message SetSharedDeviceData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SetSharedDeviceData.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.encryptedSharedDeviceData != null && Object.hasOwnProperty.call(message, "encryptedSharedDeviceData"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.encryptedSharedDeviceData);
            return writer;
        };

        /**
         * Decodes a SetSharedDeviceData message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.SetSharedDeviceData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.SetSharedDeviceData} SetSharedDeviceData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SetSharedDeviceData.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.SetSharedDeviceData();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.encryptedSharedDeviceData = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return SetSharedDeviceData;
    })();

    d2m.BeginTransaction = (function() {

        /**
         * Properties of a BeginTransaction.
         * @memberof d2m
         * @interface IBeginTransaction
         * @property {Uint8Array|null} [encryptedScope] BeginTransaction encryptedScope
         * @property {number|null} [ttl] BeginTransaction ttl
         */

        /**
         * Constructs a new BeginTransaction.
         * @memberof d2m
         * @classdesc Represents a BeginTransaction.
         * @implements IBeginTransaction
         * @constructor
         * @param {d2m.IBeginTransaction=} [properties] Properties to set
         */
        function BeginTransaction(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BeginTransaction encryptedScope.
         * @member {Uint8Array} encryptedScope
         * @memberof d2m.BeginTransaction
         * @instance
         */
        BeginTransaction.prototype.encryptedScope = $util.newBuffer([]);

        /**
         * BeginTransaction ttl.
         * @member {number} ttl
         * @memberof d2m.BeginTransaction
         * @instance
         */
        BeginTransaction.prototype.ttl = 0;

        /**
         * Encodes the specified BeginTransaction message. Does not implicitly {@link d2m.BeginTransaction.verify|verify} messages.
         * @function encode
         * @memberof d2m.BeginTransaction
         * @static
         * @param {d2m.BeginTransaction} message BeginTransaction message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BeginTransaction.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.encryptedScope != null && Object.hasOwnProperty.call(message, "encryptedScope"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.encryptedScope);
            if (message.ttl != null && Object.hasOwnProperty.call(message, "ttl"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.ttl);
            return writer;
        };

        /**
         * Decodes a BeginTransaction message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.BeginTransaction
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.BeginTransaction} BeginTransaction
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BeginTransaction.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.BeginTransaction();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.encryptedScope = reader.bytes();
                        break;
                    }
                case 2: {
                        message.ttl = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return BeginTransaction;
    })();

    d2m.BeginTransactionAck = (function() {

        /**
         * Properties of a BeginTransactionAck.
         * @memberof d2m
         * @interface IBeginTransactionAck
         */

        /**
         * Constructs a new BeginTransactionAck.
         * @memberof d2m
         * @classdesc Represents a BeginTransactionAck.
         * @implements IBeginTransactionAck
         * @constructor
         * @param {d2m.IBeginTransactionAck=} [properties] Properties to set
         */
        function BeginTransactionAck(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified BeginTransactionAck message. Does not implicitly {@link d2m.BeginTransactionAck.verify|verify} messages.
         * @function encode
         * @memberof d2m.BeginTransactionAck
         * @static
         * @param {d2m.BeginTransactionAck} message BeginTransactionAck message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BeginTransactionAck.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes a BeginTransactionAck message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.BeginTransactionAck
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.BeginTransactionAck} BeginTransactionAck
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BeginTransactionAck.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.BeginTransactionAck();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return BeginTransactionAck;
    })();

    d2m.CommitTransaction = (function() {

        /**
         * Properties of a CommitTransaction.
         * @memberof d2m
         * @interface ICommitTransaction
         */

        /**
         * Constructs a new CommitTransaction.
         * @memberof d2m
         * @classdesc Represents a CommitTransaction.
         * @implements ICommitTransaction
         * @constructor
         * @param {d2m.ICommitTransaction=} [properties] Properties to set
         */
        function CommitTransaction(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified CommitTransaction message. Does not implicitly {@link d2m.CommitTransaction.verify|verify} messages.
         * @function encode
         * @memberof d2m.CommitTransaction
         * @static
         * @param {d2m.CommitTransaction} message CommitTransaction message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CommitTransaction.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes a CommitTransaction message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.CommitTransaction
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.CommitTransaction} CommitTransaction
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CommitTransaction.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.CommitTransaction();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return CommitTransaction;
    })();

    d2m.CommitTransactionAck = (function() {

        /**
         * Properties of a CommitTransactionAck.
         * @memberof d2m
         * @interface ICommitTransactionAck
         */

        /**
         * Constructs a new CommitTransactionAck.
         * @memberof d2m
         * @classdesc Represents a CommitTransactionAck.
         * @implements ICommitTransactionAck
         * @constructor
         * @param {d2m.ICommitTransactionAck=} [properties] Properties to set
         */
        function CommitTransactionAck(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Encodes the specified CommitTransactionAck message. Does not implicitly {@link d2m.CommitTransactionAck.verify|verify} messages.
         * @function encode
         * @memberof d2m.CommitTransactionAck
         * @static
         * @param {d2m.CommitTransactionAck} message CommitTransactionAck message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CommitTransactionAck.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Decodes a CommitTransactionAck message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.CommitTransactionAck
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.CommitTransactionAck} CommitTransactionAck
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CommitTransactionAck.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.CommitTransactionAck();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return CommitTransactionAck;
    })();

    d2m.TransactionRejected = (function() {

        /**
         * Properties of a TransactionRejected.
         * @memberof d2m
         * @interface ITransactionRejected
         * @property {Long|null} [deviceId] TransactionRejected deviceId
         * @property {Uint8Array|null} [encryptedScope] TransactionRejected encryptedScope
         */

        /**
         * Constructs a new TransactionRejected.
         * @memberof d2m
         * @classdesc Represents a TransactionRejected.
         * @implements ITransactionRejected
         * @constructor
         * @param {d2m.ITransactionRejected=} [properties] Properties to set
         */
        function TransactionRejected(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TransactionRejected deviceId.
         * @member {Long} deviceId
         * @memberof d2m.TransactionRejected
         * @instance
         */
        TransactionRejected.prototype.deviceId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * TransactionRejected encryptedScope.
         * @member {Uint8Array} encryptedScope
         * @memberof d2m.TransactionRejected
         * @instance
         */
        TransactionRejected.prototype.encryptedScope = $util.newBuffer([]);

        /**
         * Encodes the specified TransactionRejected message. Does not implicitly {@link d2m.TransactionRejected.verify|verify} messages.
         * @function encode
         * @memberof d2m.TransactionRejected
         * @static
         * @param {d2m.TransactionRejected} message TransactionRejected message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TransactionRejected.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.deviceId != null && Object.hasOwnProperty.call(message, "deviceId"))
                writer.uint32(/* id 1, wireType 1 =*/9).fixed64(message.deviceId);
            if (message.encryptedScope != null && Object.hasOwnProperty.call(message, "encryptedScope"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.encryptedScope);
            return writer;
        };

        /**
         * Decodes a TransactionRejected message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.TransactionRejected
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.TransactionRejected} TransactionRejected
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TransactionRejected.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.TransactionRejected();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.deviceId = reader.fixed64();
                        break;
                    }
                case 2: {
                        message.encryptedScope = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return TransactionRejected;
    })();

    d2m.TransactionEnded = (function() {

        /**
         * Properties of a TransactionEnded.
         * @memberof d2m
         * @interface ITransactionEnded
         * @property {Long|null} [deviceId] TransactionEnded deviceId
         * @property {Uint8Array|null} [encryptedScope] TransactionEnded encryptedScope
         */

        /**
         * Constructs a new TransactionEnded.
         * @memberof d2m
         * @classdesc Represents a TransactionEnded.
         * @implements ITransactionEnded
         * @constructor
         * @param {d2m.ITransactionEnded=} [properties] Properties to set
         */
        function TransactionEnded(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TransactionEnded deviceId.
         * @member {Long} deviceId
         * @memberof d2m.TransactionEnded
         * @instance
         */
        TransactionEnded.prototype.deviceId = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * TransactionEnded encryptedScope.
         * @member {Uint8Array} encryptedScope
         * @memberof d2m.TransactionEnded
         * @instance
         */
        TransactionEnded.prototype.encryptedScope = $util.newBuffer([]);

        /**
         * Encodes the specified TransactionEnded message. Does not implicitly {@link d2m.TransactionEnded.verify|verify} messages.
         * @function encode
         * @memberof d2m.TransactionEnded
         * @static
         * @param {d2m.TransactionEnded} message TransactionEnded message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TransactionEnded.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.deviceId != null && Object.hasOwnProperty.call(message, "deviceId"))
                writer.uint32(/* id 1, wireType 1 =*/9).fixed64(message.deviceId);
            if (message.encryptedScope != null && Object.hasOwnProperty.call(message, "encryptedScope"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.encryptedScope);
            return writer;
        };

        /**
         * Decodes a TransactionEnded message from the specified reader or buffer.
         * @function decode
         * @memberof d2m.TransactionEnded
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {d2m.TransactionEnded} TransactionEnded
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TransactionEnded.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.d2m.TransactionEnded();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.deviceId = reader.fixed64();
                        break;
                    }
                case 2: {
                        message.encryptedScope = reader.bytes();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return TransactionEnded;
    })();

    return d2m;
})();

export const callsignaling = $root.callsignaling = (() => {

    /**
     * Namespace callsignaling.
     * @exports callsignaling
     * @namespace
     */
    const callsignaling = {};

    callsignaling.Envelope = (function() {

        /**
         * Properties of an Envelope.
         * @memberof callsignaling
         * @interface IEnvelope
         * @property {Uint8Array|null} [padding] Envelope padding
         * @property {callsignaling.VideoQualityProfile|null} [videoQualityProfile] Envelope videoQualityProfile
         * @property {callsignaling.CaptureState|null} [captureStateChange] Envelope captureStateChange
         */

        /**
         * Constructs a new Envelope.
         * @memberof callsignaling
         * @classdesc Represents an Envelope.
         * @implements IEnvelope
         * @constructor
         * @param {callsignaling.IEnvelope=} [properties] Properties to set
         */
        function Envelope(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Envelope padding.
         * @member {Uint8Array} padding
         * @memberof callsignaling.Envelope
         * @instance
         */
        Envelope.prototype.padding = $util.newBuffer([]);

        /**
         * Envelope videoQualityProfile.
         * @member {callsignaling.VideoQualityProfile|null|undefined} videoQualityProfile
         * @memberof callsignaling.Envelope
         * @instance
         */
        Envelope.prototype.videoQualityProfile = null;

        /**
         * Envelope captureStateChange.
         * @member {callsignaling.CaptureState|null|undefined} captureStateChange
         * @memberof callsignaling.Envelope
         * @instance
         */
        Envelope.prototype.captureStateChange = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * Envelope content.
         * @member {"videoQualityProfile"|"captureStateChange"|undefined} content
         * @memberof callsignaling.Envelope
         * @instance
         */
        Object.defineProperty(Envelope.prototype, "content", {
            get: $util.oneOfGetter($oneOfFields = ["videoQualityProfile", "captureStateChange"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Encodes the specified Envelope message. Does not implicitly {@link callsignaling.Envelope.verify|verify} messages.
         * @function encode
         * @memberof callsignaling.Envelope
         * @static
         * @param {callsignaling.Envelope} message Envelope message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Envelope.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.padding != null && Object.hasOwnProperty.call(message, "padding"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.padding);
            if (message.videoQualityProfile != null && Object.hasOwnProperty.call(message, "videoQualityProfile"))
                $root.callsignaling.VideoQualityProfile.encode(message.videoQualityProfile, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.captureStateChange != null && Object.hasOwnProperty.call(message, "captureStateChange"))
                $root.callsignaling.CaptureState.encode(message.captureStateChange, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes an Envelope message from the specified reader or buffer.
         * @function decode
         * @memberof callsignaling.Envelope
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {callsignaling.Envelope} Envelope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Envelope.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.callsignaling.Envelope();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.padding = reader.bytes();
                        break;
                    }
                case 2: {
                        message.videoQualityProfile = $root.callsignaling.VideoQualityProfile.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.captureStateChange = $root.callsignaling.CaptureState.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        return Envelope;
    })();

    callsignaling.VideoQualityProfile = (function() {

        /**
         * Properties of a VideoQualityProfile.
         * @memberof callsignaling
         * @interface IVideoQualityProfile
         * @property {callsignaling.VideoQualityProfile.QualityProfile|null} [profile] VideoQualityProfile profile
         * @property {number|null} [maxBitrateKbps] VideoQualityProfile maxBitrateKbps
         * @property {common.Resolution|null} [maxResolution] VideoQualityProfile maxResolution
         * @property {number|null} [maxFps] VideoQualityProfile maxFps
         */

        /**
         * Constructs a new VideoQualityProfile.
         * @memberof callsignaling
         * @classdesc Represents a VideoQualityProfile.
         * @implements IVideoQualityProfile
         * @constructor
         * @param {callsignaling.IVideoQualityProfile=} [properties] Properties to set
         */
        function VideoQualityProfile(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * VideoQualityProfile profile.
         * @member {callsignaling.VideoQualityProfile.QualityProfile} profile
         * @memberof callsignaling.VideoQualityProfile
         * @instance
         */
        VideoQualityProfile.prototype.profile = 0;

        /**
         * VideoQualityProfile maxBitrateKbps.
         * @member {number} maxBitrateKbps
         * @memberof callsignaling.VideoQualityProfile
         * @instance
         */
        VideoQualityProfile.prototype.maxBitrateKbps = 0;

        /**
         * VideoQualityProfile maxResolution.
         * @member {common.Resolution|null|undefined} maxResolution
         * @memberof callsignaling.VideoQualityProfile
         * @instance
         */
        VideoQualityProfile.prototype.maxResolution = null;

        /**
         * VideoQualityProfile maxFps.
         * @member {number} maxFps
         * @memberof callsignaling.VideoQualityProfile
         * @instance
         */
        VideoQualityProfile.prototype.maxFps = 0;

        /**
         * Encodes the specified VideoQualityProfile message. Does not implicitly {@link callsignaling.VideoQualityProfile.verify|verify} messages.
         * @function encode
         * @memberof callsignaling.VideoQualityProfile
         * @static
         * @param {callsignaling.VideoQualityProfile} message VideoQualityProfile message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        VideoQualityProfile.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.profile != null && Object.hasOwnProperty.call(message, "profile"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.profile);
            if (message.maxBitrateKbps != null && Object.hasOwnProperty.call(message, "maxBitrateKbps"))
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.maxBitrateKbps);
            if (message.maxResolution != null && Object.hasOwnProperty.call(message, "maxResolution"))
                $root.common.Resolution.encode(message.maxResolution, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.maxFps != null && Object.hasOwnProperty.call(message, "maxFps"))
                writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.maxFps);
            return writer;
        };

        /**
         * Decodes a VideoQualityProfile message from the specified reader or buffer.
         * @function decode
         * @memberof callsignaling.VideoQualityProfile
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {callsignaling.VideoQualityProfile} VideoQualityProfile
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        VideoQualityProfile.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.callsignaling.VideoQualityProfile();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.profile = reader.int32();
                        break;
                    }
                case 2: {
                        message.maxBitrateKbps = reader.uint32();
                        break;
                    }
                case 3: {
                        message.maxResolution = $root.common.Resolution.decode(reader, reader.uint32());
                        break;
                    }
                case 4: {
                        message.maxFps = reader.uint32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * QualityProfile enum.
         * @name callsignaling.VideoQualityProfile.QualityProfile
         * @enum {number}
         * @property {number} MAX=0 MAX value
         * @property {number} HIGH=1 HIGH value
         * @property {number} LOW=2 LOW value
         */
        VideoQualityProfile.QualityProfile = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "MAX"] = 0;
            values[valuesById[1] = "HIGH"] = 1;
            values[valuesById[2] = "LOW"] = 2;
            return values;
        })();

        return VideoQualityProfile;
    })();

    callsignaling.CaptureState = (function() {

        /**
         * Properties of a CaptureState.
         * @memberof callsignaling
         * @interface ICaptureState
         * @property {callsignaling.CaptureState.Mode|null} [state] CaptureState state
         * @property {callsignaling.CaptureState.CaptureDevice|null} [device] CaptureState device
         */

        /**
         * Constructs a new CaptureState.
         * @memberof callsignaling
         * @classdesc Represents a CaptureState.
         * @implements ICaptureState
         * @constructor
         * @param {callsignaling.ICaptureState=} [properties] Properties to set
         */
        function CaptureState(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * CaptureState state.
         * @member {callsignaling.CaptureState.Mode} state
         * @memberof callsignaling.CaptureState
         * @instance
         */
        CaptureState.prototype.state = 0;

        /**
         * CaptureState device.
         * @member {callsignaling.CaptureState.CaptureDevice} device
         * @memberof callsignaling.CaptureState
         * @instance
         */
        CaptureState.prototype.device = 0;

        /**
         * Encodes the specified CaptureState message. Does not implicitly {@link callsignaling.CaptureState.verify|verify} messages.
         * @function encode
         * @memberof callsignaling.CaptureState
         * @static
         * @param {callsignaling.CaptureState} message CaptureState message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CaptureState.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.state != null && Object.hasOwnProperty.call(message, "state"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.state);
            if (message.device != null && Object.hasOwnProperty.call(message, "device"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.device);
            return writer;
        };

        /**
         * Decodes a CaptureState message from the specified reader or buffer.
         * @function decode
         * @memberof callsignaling.CaptureState
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {callsignaling.CaptureState} CaptureState
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CaptureState.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.callsignaling.CaptureState();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.state = reader.int32();
                        break;
                    }
                case 2: {
                        message.device = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Mode enum.
         * @name callsignaling.CaptureState.Mode
         * @enum {number}
         * @property {number} OFF=0 OFF value
         * @property {number} ON=1 ON value
         */
        CaptureState.Mode = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "OFF"] = 0;
            values[valuesById[1] = "ON"] = 1;
            return values;
        })();

        /**
         * CaptureDevice enum.
         * @name callsignaling.CaptureState.CaptureDevice
         * @enum {number}
         * @property {number} CAMERA=0 CAMERA value
         * @property {number} RESERVED_FOR_SCREEN_SHARE=1 RESERVED_FOR_SCREEN_SHARE value
         * @property {number} MICROPHONE=2 MICROPHONE value
         */
        CaptureState.CaptureDevice = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "CAMERA"] = 0;
            values[valuesById[1] = "RESERVED_FOR_SCREEN_SHARE"] = 1;
            values[valuesById[2] = "MICROPHONE"] = 2;
            return values;
        })();

        return CaptureState;
    })();

    return callsignaling;
})();

export const url = $root.url = (() => {

    /**
     * Namespace url.
     * @exports url
     * @namespace
     */
    const url = {};

    url.GroupInvite = (function() {

        /**
         * Properties of a GroupInvite.
         * @memberof url
         * @interface IGroupInvite
         * @property {string|null} [adminIdentity] GroupInvite adminIdentity
         * @property {Uint8Array|null} [token] GroupInvite token
         * @property {url.GroupInvite.ConfirmationMode|null} [confirmationMode] GroupInvite confirmationMode
         * @property {string|null} [groupName] GroupInvite groupName
         */

        /**
         * Constructs a new GroupInvite.
         * @memberof url
         * @classdesc Represents a GroupInvite.
         * @implements IGroupInvite
         * @constructor
         * @param {url.IGroupInvite=} [properties] Properties to set
         */
        function GroupInvite(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * GroupInvite adminIdentity.
         * @member {string} adminIdentity
         * @memberof url.GroupInvite
         * @instance
         */
        GroupInvite.prototype.adminIdentity = "";

        /**
         * GroupInvite token.
         * @member {Uint8Array} token
         * @memberof url.GroupInvite
         * @instance
         */
        GroupInvite.prototype.token = $util.newBuffer([]);

        /**
         * GroupInvite confirmationMode.
         * @member {url.GroupInvite.ConfirmationMode} confirmationMode
         * @memberof url.GroupInvite
         * @instance
         */
        GroupInvite.prototype.confirmationMode = 0;

        /**
         * GroupInvite groupName.
         * @member {string} groupName
         * @memberof url.GroupInvite
         * @instance
         */
        GroupInvite.prototype.groupName = "";

        /**
         * Encodes the specified GroupInvite message. Does not implicitly {@link url.GroupInvite.verify|verify} messages.
         * @function encode
         * @memberof url.GroupInvite
         * @static
         * @param {url.GroupInvite} message GroupInvite message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        GroupInvite.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.adminIdentity != null && Object.hasOwnProperty.call(message, "adminIdentity"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.adminIdentity);
            if (message.token != null && Object.hasOwnProperty.call(message, "token"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.token);
            if (message.confirmationMode != null && Object.hasOwnProperty.call(message, "confirmationMode"))
                writer.uint32(/* id 3, wireType 0 =*/24).int32(message.confirmationMode);
            if (message.groupName != null && Object.hasOwnProperty.call(message, "groupName"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.groupName);
            return writer;
        };

        /**
         * Decodes a GroupInvite message from the specified reader or buffer.
         * @function decode
         * @memberof url.GroupInvite
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {url.GroupInvite} GroupInvite
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        GroupInvite.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.url.GroupInvite();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.adminIdentity = reader.string();
                        break;
                    }
                case 2: {
                        message.token = reader.bytes();
                        break;
                    }
                case 3: {
                        message.confirmationMode = reader.int32();
                        break;
                    }
                case 4: {
                        message.groupName = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * ConfirmationMode enum.
         * @name url.GroupInvite.ConfirmationMode
         * @enum {number}
         * @property {number} AUTOMATIC=0 AUTOMATIC value
         * @property {number} MANUAL=1 MANUAL value
         */
        GroupInvite.ConfirmationMode = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "AUTOMATIC"] = 0;
            values[valuesById[1] = "MANUAL"] = 1;
            return values;
        })();

        return GroupInvite;
    })();

    url.DeviceGroupJoinRequestOrOffer = (function() {

        /**
         * Properties of a DeviceGroupJoinRequestOrOffer.
         * @memberof url
         * @interface IDeviceGroupJoinRequestOrOffer
         * @property {url.DeviceGroupJoinRequestOrOffer.Version|null} [version] DeviceGroupJoinRequestOrOffer version
         * @property {url.DeviceGroupJoinRequestOrOffer.Variant|null} [variant] DeviceGroupJoinRequestOrOffer variant
         * @property {rendezvous.RendezvousInit|null} [rendezvousInit] DeviceGroupJoinRequestOrOffer rendezvousInit
         */

        /**
         * Constructs a new DeviceGroupJoinRequestOrOffer.
         * @memberof url
         * @classdesc Represents a DeviceGroupJoinRequestOrOffer.
         * @implements IDeviceGroupJoinRequestOrOffer
         * @constructor
         * @param {url.IDeviceGroupJoinRequestOrOffer=} [properties] Properties to set
         */
        function DeviceGroupJoinRequestOrOffer(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DeviceGroupJoinRequestOrOffer version.
         * @member {url.DeviceGroupJoinRequestOrOffer.Version} version
         * @memberof url.DeviceGroupJoinRequestOrOffer
         * @instance
         */
        DeviceGroupJoinRequestOrOffer.prototype.version = 0;

        /**
         * DeviceGroupJoinRequestOrOffer variant.
         * @member {url.DeviceGroupJoinRequestOrOffer.Variant|null|undefined} variant
         * @memberof url.DeviceGroupJoinRequestOrOffer
         * @instance
         */
        DeviceGroupJoinRequestOrOffer.prototype.variant = null;

        /**
         * DeviceGroupJoinRequestOrOffer rendezvousInit.
         * @member {rendezvous.RendezvousInit|null|undefined} rendezvousInit
         * @memberof url.DeviceGroupJoinRequestOrOffer
         * @instance
         */
        DeviceGroupJoinRequestOrOffer.prototype.rendezvousInit = null;

        /**
         * Encodes the specified DeviceGroupJoinRequestOrOffer message. Does not implicitly {@link url.DeviceGroupJoinRequestOrOffer.verify|verify} messages.
         * @function encode
         * @memberof url.DeviceGroupJoinRequestOrOffer
         * @static
         * @param {url.DeviceGroupJoinRequestOrOffer} message DeviceGroupJoinRequestOrOffer message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DeviceGroupJoinRequestOrOffer.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.version);
            if (message.variant != null && Object.hasOwnProperty.call(message, "variant"))
                $root.url.DeviceGroupJoinRequestOrOffer.Variant.encode(message.variant, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.rendezvousInit != null && Object.hasOwnProperty.call(message, "rendezvousInit"))
                $root.rendezvous.RendezvousInit.encode(message.rendezvousInit, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Decodes a DeviceGroupJoinRequestOrOffer message from the specified reader or buffer.
         * @function decode
         * @memberof url.DeviceGroupJoinRequestOrOffer
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {url.DeviceGroupJoinRequestOrOffer} DeviceGroupJoinRequestOrOffer
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeviceGroupJoinRequestOrOffer.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.url.DeviceGroupJoinRequestOrOffer();
            while (reader.pos < end) {
                let tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.version = reader.int32();
                        break;
                    }
                case 2: {
                        message.variant = $root.url.DeviceGroupJoinRequestOrOffer.Variant.decode(reader, reader.uint32());
                        break;
                    }
                case 3: {
                        message.rendezvousInit = $root.rendezvous.RendezvousInit.decode(reader, reader.uint32());
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Version enum.
         * @name url.DeviceGroupJoinRequestOrOffer.Version
         * @enum {number}
         * @property {number} V1_0=0 V1_0 value
         */
        DeviceGroupJoinRequestOrOffer.Version = (function() {
            const valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "V1_0"] = 0;
            return values;
        })();

        DeviceGroupJoinRequestOrOffer.Variant = (function() {

            /**
             * Properties of a Variant.
             * @memberof url.DeviceGroupJoinRequestOrOffer
             * @interface IVariant
             * @property {common.Unit|null} [requestToJoin] Variant requestToJoin
             * @property {common.Unit|null} [offerToJoin] Variant offerToJoin
             */

            /**
             * Constructs a new Variant.
             * @memberof url.DeviceGroupJoinRequestOrOffer
             * @classdesc Represents a Variant.
             * @implements IVariant
             * @constructor
             * @param {url.DeviceGroupJoinRequestOrOffer.IVariant=} [properties] Properties to set
             */
            function Variant(properties) {
                if (properties)
                    for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Variant requestToJoin.
             * @member {common.Unit|null|undefined} requestToJoin
             * @memberof url.DeviceGroupJoinRequestOrOffer.Variant
             * @instance
             */
            Variant.prototype.requestToJoin = null;

            /**
             * Variant offerToJoin.
             * @member {common.Unit|null|undefined} offerToJoin
             * @memberof url.DeviceGroupJoinRequestOrOffer.Variant
             * @instance
             */
            Variant.prototype.offerToJoin = null;

            // OneOf field names bound to virtual getters and setters
            let $oneOfFields;

            /**
             * Variant type.
             * @member {"requestToJoin"|"offerToJoin"|undefined} type
             * @memberof url.DeviceGroupJoinRequestOrOffer.Variant
             * @instance
             */
            Object.defineProperty(Variant.prototype, "type", {
                get: $util.oneOfGetter($oneOfFields = ["requestToJoin", "offerToJoin"]),
                set: $util.oneOfSetter($oneOfFields)
            });

            /**
             * Encodes the specified Variant message. Does not implicitly {@link url.DeviceGroupJoinRequestOrOffer.Variant.verify|verify} messages.
             * @function encode
             * @memberof url.DeviceGroupJoinRequestOrOffer.Variant
             * @static
             * @param {url.DeviceGroupJoinRequestOrOffer.Variant} message Variant message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Variant.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.requestToJoin != null && Object.hasOwnProperty.call(message, "requestToJoin"))
                    $root.common.Unit.encode(message.requestToJoin, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
                if (message.offerToJoin != null && Object.hasOwnProperty.call(message, "offerToJoin"))
                    $root.common.Unit.encode(message.offerToJoin, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
                return writer;
            };

            /**
             * Decodes a Variant message from the specified reader or buffer.
             * @function decode
             * @memberof url.DeviceGroupJoinRequestOrOffer.Variant
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {url.DeviceGroupJoinRequestOrOffer.Variant} Variant
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Variant.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                let end = length === undefined ? reader.len : reader.pos + length, message = new $root.url.DeviceGroupJoinRequestOrOffer.Variant();
                while (reader.pos < end) {
                    let tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.requestToJoin = $root.common.Unit.decode(reader, reader.uint32());
                            break;
                        }
                    case 2: {
                            message.offerToJoin = $root.common.Unit.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            return Variant;
        })();

        return DeviceGroupJoinRequestOrOffer;
    })();

    return url;
})();

export { $root as default };
