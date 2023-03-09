import {expect} from 'chai';

import {getSanitizedFileNameDetails} from '~/common/utils/file';

/**
 * Test Svelte utils.
 */
export function run(): void {
    describe('Svelte utils', function () {
        describe('getSanitizedFileNameDetails', function () {
            it('returns sanitized extension filename details', function () {
                const expectations = [
                    {
                        input: {name: 'image.jpeg', type: 'image/jpeg'},
                        expected: {
                            name: 'image.jpeg',
                            basename: 'image',
                            extension: 'jpeg',
                            displayType: 'jpeg',
                        },
                    },
                    {
                        input: {name: 'image.jpg', type: 'image/jpeg'},
                        expected: {
                            name: 'image.jpg',
                            basename: 'image',
                            extension: 'jpg',
                            displayType: 'jpeg',
                        },
                    },
                    {
                        input: {name: 'image.png', type: 'image/png'},
                        expected: {
                            name: 'image.png',
                            basename: 'image',
                            extension: 'png',
                            displayType: 'png',
                        },
                    },
                    {
                        input: {name: 'image', type: 'image/png'},
                        expected: {
                            name: 'image.png',
                            basename: 'image',
                            extension: 'png',
                            displayType: 'png',
                        },
                    },
                    {
                        input: {name: 'image.', type: 'image/png'},
                        expected: {
                            name: 'image.png',
                            basename: 'image',
                            extension: 'png',
                            displayType: 'png',
                        },
                    },
                    {
                        input: {name: 'image..', type: 'image/png'},
                        expected: {
                            name: 'image.png',
                            basename: 'image',
                            extension: 'png',
                            displayType: 'png',
                        },
                    },
                    {
                        input: {name: 'image.abc', type: 'image/png'},
                        expected: {
                            name: 'image.abc.png',
                            basename: 'image.abc',
                            extension: 'png',
                            displayType: 'png',
                        },
                    },
                    {
                        input: {name: 'image.abc', type: 'unlisted/type'},
                        expected: {
                            name: 'image.abc',
                            basename: 'image',
                            extension: 'abc',
                            displayType: 'abc',
                        },
                    },
                    {
                        input: {name: 'image.', type: 'unlisted/type'},
                        expected: {
                            name: 'image.',
                            basename: 'image.',
                            extension: '',
                            displayType: undefined,
                        },
                    },
                    {
                        input: {name: 'image', type: 'unlisted/type'},
                        expected: {
                            name: 'image',
                            basename: 'image',
                            extension: '',
                            displayType: undefined,
                        },
                    },
                    {
                        input: {name: '', type: 'unlisted/type'},
                        expected: {name: '', basename: '', extension: '', displayType: undefined},
                    },
                    {
                        input: {name: '', type: 'image/png'},
                        expected: {name: '', basename: '', extension: '', displayType: 'png'},
                    },
                    {
                        input: {name: 'Screenshot 2023-01-02', type: 'image/png'},
                        expected: {
                            name: 'Screenshot 2023-01-02.png',
                            basename: 'Screenshot 2023-01-02',
                            extension: 'png',
                            displayType: 'png',
                        },
                    },
                    {
                        input: {name: 'Screenshot 2023.01.02', type: 'image/png'},
                        expected: {
                            name: 'Screenshot 2023.01.02.png',
                            basename: 'Screenshot 2023.01.02',
                            extension: 'png',
                            displayType: 'png',
                        },
                    },
                    {
                        input: {name: 'Screenshot 2023.01.02', type: 'unlisted/type'},
                        expected: {
                            name: 'Screenshot 2023.01.02',
                            basename: 'Screenshot 2023.01',
                            extension: '02',
                            displayType: '02',
                        },
                    },
                    {
                        input: {name: 'Screenshot 2023.01.02.', type: 'unlisted/type'},
                        expected: {
                            name: 'Screenshot 2023.01.02.',
                            basename: 'Screenshot 2023.01.02.',
                            extension: '',
                            displayType: undefined,
                        },
                    },
                    {
                        input: {name: 'Screenshot 2023-01-02', type: 'unlisted/type'},
                        expected: {
                            name: 'Screenshot 2023-01-02',
                            basename: 'Screenshot 2023-01-02',
                            extension: '',
                            displayType: undefined,
                        },
                    },
                ];

                for (const {input, expected} of expectations) {
                    expect(getSanitizedFileNameDetails(input)).to.eql(
                        expected,
                        `Failed for name: ${input.name}, type: ${input.type}`,
                    );
                }
            });
        });
    });
}
