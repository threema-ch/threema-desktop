/**
 * Create a valita object schema for a structbuf message, guaranteeing that the schema parses all
 * properties available on the structbuf message.
 *
 * This prevents property mismatches due to typos or when a property has been renamed in the
 * protocol.
 *
 * IMPORTANT: This only inspects the provided object on the first level!
 */
export function validator<
    TStruct,
    TSchema extends {
        [K in Exclude<
            keyof TStruct,
            'snapshot' | 'clone'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        >]: any;
    },
>(structbuf: TStruct, schema: TSchema): TSchema {
    return schema;
}
