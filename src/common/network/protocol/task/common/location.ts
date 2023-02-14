import {ParseError} from '~/common/error';
import {type f64} from '~/common/types';

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
    const coordParts = lines[0].trim().split(',');
    if (coordParts.length < 2) {
        throw new ParseError('Could not parse location: Did not find two coordinates');
    }
    const lat = parseFloat(coordParts[0]);
    const lon = parseFloat(coordParts[1]);
    if (isNaN(lat) || isNaN(lon)) {
        throw new ParseError('Could not parse location: Coordinates are not valid numbers');
    }
    let accuracy;
    if (coordParts.length > 2) {
        const parsed = parseFloat(coordParts[2]);
        if (!isNaN(parsed)) {
            accuracy = parsed;
        }
    }

    // Parse name and address
    let name;
    let address;
    if (lines.length === 2) {
        address = lines[1].trim();
    } else if (lines.length >= 3) {
        name = lines[1].trim();
        address = lines[2].trim();
    }

    return {
        coordinates: {
            lat,
            lon,
            accuracy,
        },
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
