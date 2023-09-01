import {expect} from 'chai';

import {WORK_DATA_SYNC_RESPONSE_SCHEMA} from '~/common/dom/network/protocol/work-sync';

export function run(): void {
    describe('work data sync', function () {
        it('validates a valid sync response', function () {
            expect(
                WORK_DATA_SYNC_RESPONSE_SCHEMA.parse({
                    checkInterval: 234234,
                    contacts: [
                        {
                            id: 'ECHOECHO',
                            first: 'Aria',
                            last: 'Reverb',
                            pk: 'ZWNob2VjaG9lY2hvZWNob2VjaG9lY2hvZWNob2VjaG8',
                        },
                    ],
                    directory: {
                        enabled: false,
                    },
                    logo: {
                        dark: 'https://example.com/dark.png',
                        light: 'https://example.com/light.png',
                    },
                    mdm: {
                        override: true,
                        params: {
                            property1: 'string',
                            property2: true,
                        },
                    },
                    org: {
                        name: 'Reynholm Industries',
                    },
                    support: 'https://example.com/support/',
                }),
            ).to.deep.equal({
                checkInterval: 234234,
                contacts: [
                    {
                        id: 'ECHOECHO',
                        first: 'Aria',
                        last: 'Reverb',
                        pk: new Uint8Array([
                            101, 99, 104, 111, 101, 99, 104, 111, 101, 99, 104, 111, 101, 99, 104,
                            111, 101, 99, 104, 111, 101, 99, 104, 111, 101, 99, 104, 111, 101, 99,
                            104, 111,
                        ]),
                    },
                ],
                directory: {
                    enabled: false,
                },
                logo: {
                    dark: 'https://example.com/dark.png',
                    light: 'https://example.com/light.png',
                },
                mdm: {
                    override: true,
                    params: {
                        property1: 'string',
                        property2: true,
                    },
                },
                org: {
                    name: 'Reynholm Industries',
                },
                support: 'https://example.com/support/',
            });
        });
    });
}

run();
