import {ParseError} from '~/common/error';
import type {f64} from '~/common/types';
import {unwrap} from '~/common/utils/assert';
import {splitAtLeast} from '~/common/utils/string';

export interface Coordinates {
    readonly lat: f64;
    readonly lon: f64;
    readonly accuracy?: f64;
}

export interface Location {
    readonly coordinates: Coordinates;
    readonly name?: string;
    readonly address?: string;
}

function parseCoordinates(line: string): Location['coordinates'] {
    let parts, rest;
    try {
        ({items: parts, rest} = splitAtLeast(line.trim(), ',', 2));
    } catch {
        throw new ParseError('Could not parse location: Did not find two coordinates');
    }
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lon)) {
        throw new ParseError('Could not parse location: Coordinates are not valid numbers');
    }
    let accuracy;
    if (rest.length > 0) {
        const parsed = parseFloat(unwrap(rest[0]));
        if (!isNaN(parsed)) {
            accuracy = parsed;
        }
    }
    return {lat, lon, accuracy};
}

/**
 * Parse a location string.
 *
 * @returns either a {@link Location} instance
 * @throws {ParseError} if the location could not be parsed
 */
export function parseLocation(location: string): Location {
    // Split lines
    const lines = location.trim().split('\n');

    // Parse coordinates
    const coordinates = parseCoordinates(unwrap(lines[0]));

    // Parse name and address
    let name;
    let address;
    if (lines.length === 2) {
        address = unwrap(lines[1]).trim();
    } else if (lines.length >= 3) {
        name = unwrap(lines[1]).trim();
        address = unwrap(lines[2]).trim();
    }

    return {
        coordinates,
        name,
        address,
    };
}

/**
 * Return a temporary text representation of a location.
 *
 * TODO(DESK-248): Remove
 */
export function getTextForLocation(location: Location): string {
    return `📍 _Location:_ ${
        location.name ??
        location.address ??
        `${location.coordinates.lat},${location.coordinates.lon}`
    }\nhttps://www.openstreetmap.org/?mlat=${location.coordinates.lat}&mlon=${
        location.coordinates.lon
    }&zoom=15`;
}
