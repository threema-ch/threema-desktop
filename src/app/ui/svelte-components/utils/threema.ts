/**
 * Returns whether the given `string` is a syntactically correct Threema ID. Note: This doesn't
 * verify if the ID is actually valid.
 */
export function isThreemaId(threemaId: string): boolean {
    return threemaId.match(/^(?<id>(?<work>#[A-Z0-9]{7})|(?<private>[A-Z0-9]{8}))$/u) !== null;
}
