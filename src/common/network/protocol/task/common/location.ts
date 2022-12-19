import {type f64} from '~/common/types';

export interface Coordinates {
    readonly lat: f64;
    readonly lon: f64;
    readonly accuracy?: f64;
}

export interface Location {
    readonly coordinates: Coordinates;
    readonly name?: string;
    readonly address: string;
}

/**
 * Parse a location string.
 *
 * @returns either a {@link Location} instance, or `undefined` if the location could not be parsed.
 */
export function parseLocation(location: string): Location | undefined {
    // Split lines
    const lines = location.trim().split('\n');
    if (lines.length < 2) {
        return undefined;
    }

    // Parse coordinates
    const coordParts = lines[0].trim().split(',');
    if (coordParts.length < 2) {
        return undefined;
    }
    const lat = parseFloat(coordParts[0]);
    const lon = parseFloat(coordParts[1]);
    if (isNaN(lat) || isNaN(lon)) {
        return undefined;
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
    if (lines.length >= 3) {
        name = lines[1].trim();
        address = lines[2].trim();
    } else {
        address = lines[1].trim();
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
