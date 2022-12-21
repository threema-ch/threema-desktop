import {expect} from 'chai';

import {ParseError} from '~/common/error';
import {type Location, parseLocation} from '~/common/network/protocol/task/common/location';

/**
 * Config tests.
 */
export function run(): void {
    describe('Location', function () {
        function assertParsedLocation(locationString: string, expected: Location): void {
            const parsed = parseLocation(locationString);
            const coordinateDelta = 0.00001;
            expect(parsed.coordinates.lat).to.be.closeTo(expected.coordinates.lat, coordinateDelta);
            expect(parsed.coordinates.lon).to.be.closeTo(expected.coordinates.lon, coordinateDelta);
            if (expected.coordinates.accuracy !== undefined) {
                expect(parsed.coordinates.accuracy).to.be.closeTo(
                    expected.coordinates.accuracy,
                    coordinateDelta,
                );
            } else {
                expect(parsed.coordinates.accuracy).to.be.undefined;
            }
            expect(parsed.address).to.equal(expected.address);
            expect(parsed.name).to.equal(expected.name);
        }

        it('parse a 3-line location message', function () {
            assertParsedLocation(
                '47.201973,8.787087,0.000000\nPizzeria Da Franco\nChurerstrasse 109 Pfäffikon, 8808 Freienbach, Switzerland',
                {
                    coordinates: {
                        lat: 47.201973,
                        lon: 8.787087,
                        accuracy: 0.0,
                    },
                    name: 'Pizzeria Da Franco',
                    address: 'Churerstrasse 109 Pfäffikon, 8808 Freienbach, Switzerland',
                },
            );
        });

        it('parse a 2-line location message', function () {
            assertParsedLocation('47.228524,8.787622,50.123\nZurich, Switzerland', {
                coordinates: {
                    lat: 47.228524,
                    lon: 8.787622,
                    accuracy: 50.123,
                },
                name: undefined,
                address: 'Zurich, Switzerland',
            });
        });

        it('parse coordinates without accuracy', function () {
            assertParsedLocation('47.228524,8.787622\nZurich, Switzerland', {
                coordinates: {
                    lat: 47.228524,
                    lon: 8.787622,
                    accuracy: undefined,
                },
                name: undefined,
                address: 'Zurich, Switzerland',
            });
        });

        it('parse a location message with more than 3 lines', function () {
            assertParsedLocation(
                '47.228524,8.787622\nA mysterious POI\nZurich, Switzerland\nRandom stuff at the end',
                {
                    coordinates: {
                        lat: 47.228524,
                        lon: 8.787622,
                    },
                    name: 'A mysterious POI',
                    address: 'Zurich, Switzerland',
                },
            );
        });

        it('parse a location messages with only 1 line', function () {
            assertParsedLocation('47.228524,8.787622', {
                coordinates: {
                    lat: 47.228524,
                    lon: 8.787622,
                },
                name: undefined,
                address: undefined,
            });
        });

        it('parse a location messages with only 1 line and a newline', function () {
            assertParsedLocation('47.228524,8.787622\n', {
                coordinates: {
                    lat: 47.228524,
                    lon: 8.787622,
                },
                name: undefined,
                address: undefined,
            });
        });

        it('parse a location messages with missing coordinates', function () {
            expect(() => parseLocation('47.228524\nZurich, Switzerland')).to.throw(ParseError);
        });

        it('parse a location messages with invalid coordinates', function () {
            expect(() => parseLocation('47.228524,q.787622\nZurich, Switzerland')).to.throw(
                ParseError,
            );
        });

        it('parse a location messages with invalid accuracy', function () {
            assertParsedLocation('47.2,8.7,quatsch\nZurich, Switzerland', {
                coordinates: {
                    lat: 47.2,
                    lon: 8.7,
                    accuracy: undefined,
                },
                address: 'Zurich, Switzerland',
            });
        });
    });
}
