/**
 * @param threemaId
 * @returns boolean
 */
export function isThreemaId(threemaId: string): boolean {
    return threemaId.match(/^(?<id>(?<work>#[A-Z0-9]{7})|(?<private>[A-Z0-9]{8}))$/u) !== null;
}
