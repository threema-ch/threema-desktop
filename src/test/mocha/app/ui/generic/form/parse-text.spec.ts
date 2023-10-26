import {expect} from 'chai';

import {
    type SanitizedHtml,
    parseHighlights,
    parseLinks,
    parseMentions,
    sanitizeAndParseTextToHtml,
} from '~/app/ui/utils/text';
import type {DbContact, DbContactUid} from '~/common/db';
import {ReceiverType} from '~/common/enum';
import {ensureIdentityString} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import type {Mention} from '~/common/viewmodel/utils/mentions';

function mockedT(key: string, defaultValue: string): string {
    return defaultValue;
}

export function run(): void {
    describe('Formatted message text parsing', function () {
        const testContactId = 'ECHOECHO' as const;
        const testAllId = '@@@@@@@@' as const;

        const testMentions: {
            self: Mention & {type: 'self'};
            all: Mention & {type: 'all'};
            other: Mention & {type: 'other'};
        } = {
            self: {
                type: 'self',
                identity: ensureIdentityString(testContactId),
                nickname: 'Test',
            },
            all: {
                type: 'all',
                identity: testAllId,
            },
            other: {
                type: 'other',
                identity: ensureIdentityString(testContactId),
                displayName: 'Test',
                lookup: {
                    type: ReceiverType.CONTACT,
                    uid: BigInt(0) as DbContactUid,
                },
            },
        };

        function markupHtmlTemplate({
            text,
            formatting,
        }: {
            text: string;
            formatting: 'bold' | 'italic' | 'strike';
        }): string {
            return `<span class="md-${formatting}">${text}</span>`;
        }

        function mentionHtmlTemplate(
            props:
                | {type: 'all'}
                | {type: 'self'; nickname: string | undefined; identity: string}
                | {
                      type: 'other';
                      displayName: string;
                      lookup: Pick<DbContact, 'type' | 'uid'>;
                      linkMentions?: boolean;
                  },
        ): string {
            switch (props.type) {
                case 'all':
                    return `<span class="mention all">@All</span>`;
                case 'self':
                    return `<span class="mention me">@${props.nickname ?? 'Me'}</span>`;
                case 'other':
                    return props.linkMentions === false
                        ? `<span class="mention">@${props.displayName}</span>`
                        : `<a href="#/conversation/${props.lookup.type}/${props.lookup.uid}/" draggable="false" class="mention">@${props.displayName}</a>`;
                default:
                    return unreachable(props);
            }
        }

        function highlightHtmlTemplate(text: string): string {
            return `<span class="parsed-text-highlight">${text}</span>`;
        }

        function linkHtmlTemplate({url, text}: {url: string; text: string}): string {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        }

        describe('parseMentions', function () {
            it('should replace mentions of type "self" in text with HTML (using nickname if set)', function () {
                const parsedText = parseMentions(
                    mockedT,
                    `Hello, @[${testContactId}]!` as SanitizedHtml,
                    testMentions.self,
                    true,
                );
                const expected = `Hello, ${mentionHtmlTemplate(testMentions.self)}!`;

                expect(parsedText).to.equal(expected);
            });

            it('should replace mentions of type "self" in text with HTML (using id if nickname is missing)', function () {
                const testMentionWithoutName = {
                    ...testMentions.self,
                    name: testMentions.self.identity,
                };
                const parsedText = parseMentions(
                    mockedT,
                    `Hello, @[${testContactId}]!` as SanitizedHtml,
                    testMentionWithoutName,
                    true,
                );
                const expected = `Hello, ${mentionHtmlTemplate(testMentionWithoutName)}!`;

                expect(parsedText).to.equal(expected);
            });

            it('should replace mentions of type "all" in text with HTML', function () {
                const parsedText = parseMentions(
                    mockedT,
                    `Hello, @[${testAllId}]!` as SanitizedHtml,
                    testMentions.all,
                    true,
                );
                const expected = `Hello, ${mentionHtmlTemplate({type: 'all'})}!`;

                expect(parsedText).to.equal(expected);
            });

            it('should replace mentions of type "other" in text with HTML', function () {
                const parsedText = parseMentions(
                    mockedT,
                    `Hello, @[${testContactId}]!` as SanitizedHtml,
                    testMentions.other,
                    true,
                );
                const expected = `Hello, ${mentionHtmlTemplate(testMentions.other)}!`;

                expect(parsedText).to.equal(expected);
            });

            it('should replace multiple, differing mentions', function () {
                const parsedText = parseMentions(
                    mockedT,
                    `Hello, @[${testAllId}] and @[${testContactId}]!` as SanitizedHtml,
                    [testMentions.all, testMentions.other],
                    true,
                );
                const expected = `Hello, ${mentionHtmlTemplate({
                    type: 'all',
                })} and ${mentionHtmlTemplate(testMentions.other)}!`;

                expect(parsedText).to.equal(expected);
            });
        });

        describe('parseHighlights', function () {
            const testSearchString = 'Test' as const;

            it('should replace all search string occurrences in text with HTML (case-insensitive)', function () {
                const parsedText = parseHighlights(
                    'Testgroup of adventurous testers' as SanitizedHtml,
                    testSearchString,
                );
                const expected = `${highlightHtmlTemplate(
                    'Test',
                )}group of adventurous ${highlightHtmlTemplate('test')}ers`;

                expect(parsedText).to.equal(expected);
            });
        });

        describe('parseLinks', function () {
            const testCases = [
                {
                    description: 'link without url scheme',
                    input: 'threema.ch' as SanitizedHtml,
                    expected: linkHtmlTemplate({url: 'https://threema.ch', text: 'threema.ch'}),
                },
                {
                    description: 'link with "http" url scheme',
                    input: 'http://threema.ch' as SanitizedHtml,
                    expected: linkHtmlTemplate({
                        url: 'http://threema.ch',
                        text: 'http://threema.ch',
                    }),
                },
                {
                    description: 'link with "https" url scheme',
                    input: 'https://threema.ch' as SanitizedHtml,
                    expected: linkHtmlTemplate({
                        url: 'https://threema.ch',
                        text: 'https://threema.ch',
                    }),
                },
            ];

            for (const {description, input, expected} of testCases) {
                it(`should detect and replace ${description} with HTML`, function () {
                    const parsedText = parseLinks(input);

                    expect(parsedText).to.equal(expected);
                });
            }
        });

        describe('parseText', function () {
            const testCases: readonly {
                skipped?: boolean;
                description: string;
                input: string;
                features: {
                    markup: boolean;
                    mentions: Mention | Mention[] | false;
                    highlights: string | false;
                    links: boolean;
                    linkMentions?: boolean;
                };
                expected: string;
            }[] = [
                {
                    description:
                        'should parse multiple occurrences of markup, mentions, highlights, and links',
                    input: 'Hello, @[ECHOECHO]! Hello, *world*. Lorem *ipsum*, @[ECHOECHO] dolor: threema.ch or https://threema.ch.',
                    features: {
                        markup: true,
                        mentions: testMentions.other,
                        highlights: 'hello',
                        links: true,
                    },
                    expected: `${highlightHtmlTemplate('Hello')}, ${mentionHtmlTemplate(
                        testMentions.other,
                    )}! ${highlightHtmlTemplate('Hello')}, ${markupHtmlTemplate({
                        text: 'world',
                        formatting: 'bold',
                    })}. Lorem ${markupHtmlTemplate({
                        text: 'ipsum',
                        formatting: 'bold',
                    })}, ${mentionHtmlTemplate(testMentions.other)} dolor: ${linkHtmlTemplate({
                        url: 'https://threema.ch',
                        text: 'threema.ch',
                    })} or ${linkHtmlTemplate({
                        url: 'https://threema.ch',
                        text: 'https://threema.ch',
                    })}.`,
                },
                {
                    description: 'should allow mentions to be formatted with markup',
                    input: 'Hello, *@[ECHOECHO]*!',
                    features: {
                        markup: true,
                        mentions: testMentions.other,
                        highlights: false,
                        links: true,
                    },
                    expected: `Hello, ${markupHtmlTemplate({
                        text: mentionHtmlTemplate(testMentions.other),
                        formatting: 'bold',
                    })}!`,
                },
                // TODO(DESK-1069): The following test case currently fails and is skipped. Make it
                // pass.
                {
                    skipped: true,
                    description: 'should ignore markup tokens in mention ids',
                    input: 'Hello, @[*SUPPORT]!*',
                    features: {
                        markup: true,
                        mentions: {
                            ...testMentions.other,
                            identity: ensureIdentityString('*SUPPORT'),
                        },
                        highlights: false,
                        links: false,
                    },
                    expected: `Hello, ${mentionHtmlTemplate(testMentions.other)}!*`,
                },
                {
                    description: 'should ignore markup tokens in mention names',
                    input: 'Hello, @[ECHOECHO]!',
                    features: {
                        markup: true,
                        mentions: {
                            ...testMentions.other,
                            displayName: '*Test*',
                        },
                        highlights: false,
                        links: false,
                    },
                    expected: `Hello, ${mentionHtmlTemplate({
                        ...testMentions.other,
                        displayName: '*Test*',
                    })}!`,
                },
                // TODO(DESK-1069): The following test case currently fails and is skipped. Make it
                // pass.
                {
                    skipped: true,
                    description: 'should only parse highlights in visible text',
                    input: 'Hello, *@[ECHOECHO]*!',
                    features: {
                        markup: true,
                        mentions: testMentions.other,
                        highlights: 'conversation',
                        links: true,
                    },
                    expected: `Hello, ${markupHtmlTemplate({
                        text: mentionHtmlTemplate(testMentions.other),
                        formatting: 'bold',
                    })}!`,
                },
                // TODO(DESK-1069): The following test case currently fails and is skipped. Make it
                // pass.
                {
                    skipped: true,
                    description: 'highlight parsing should not break up links',
                    input: 'More on threema.ch',
                    features: {
                        markup: false,
                        mentions: false,
                        highlights: 'ee',
                        links: true,
                    },
                    expected: `More on ${linkHtmlTemplate({
                        url: 'https://threema.ch',
                        text: 'threema.ch',
                    })}`,
                },
                // TODO(DESK-1069): The following test case currently fails and is skipped. Make it
                // pass.
                {
                    skipped: true,
                    description: 'highlight parsing should not break up markup',
                    input: 'Hello, *bold* world!',
                    features: {
                        markup: true,
                        mentions: false,
                        highlights: '<span class="md-bold">bo',
                        links: false,
                    },
                    expected: `Hello, ${markupHtmlTemplate({
                        text: 'bold',
                        formatting: 'bold',
                    })} world!`,
                },
                // The following test only works because the mention itself is already replaced with
                // an `<a>` tag and `autolinker.js` seems to correctly prevent nested `<a>` tags,
                // i.e. it doesn't parse links in mention names if they are of type `other`.
                {
                    description: 'should ignore links in mention names (type "other")',
                    input: 'Hello, @[ECHOECHO]!',
                    features: {
                        markup: false,
                        mentions: {
                            ...testMentions.other,
                            displayName: 'https://threema.ch',
                        },
                        highlights: false,
                        links: true,
                    },
                    expected: `Hello, ${mentionHtmlTemplate({
                        ...testMentions.other,
                        displayName: 'https://threema.ch',
                    })}!`,
                },
                {
                    description:
                        'should ignore links in mention names (type "other"), even when mention is not linked',
                    input: 'Hello, @[ECHOECHO]!',
                    features: {
                        markup: false,
                        mentions: {
                            ...testMentions.other,
                            displayName: 'https://threema.ch',
                        },
                        highlights: false,
                        links: true,
                        linkMentions: false,
                    },
                    expected: `Hello, ${mentionHtmlTemplate({
                        ...testMentions.other,
                        displayName: 'https://threema.ch',
                        linkMentions: false,
                    })}!`,
                },
            ];

            for (const {
                skipped,
                description,
                input,
                features: {markup, mentions, highlights, links, linkMentions},
                expected,
            } of testCases) {
                const extraArgs = {
                    mentions: mentions === false ? undefined : mentions,
                    highlights: highlights === false ? undefined : highlights,
                    shouldLinkMentions: linkMentions,
                    shouldParseMarkup: markup,
                    shouldParseLinks: links,
                } as const;

                if (skipped === true) {
                    it.skip(description, function () {
                        const parsedText = sanitizeAndParseTextToHtml(input, mockedT, {
                            ...extraArgs,
                        });

                        expect(parsedText).to.equal(expected);
                    });
                } else {
                    it(description, function () {
                        const parsedText = sanitizeAndParseTextToHtml(input, mockedT, {
                            ...extraArgs,
                        });

                        expect(parsedText).to.equal(expected);
                    });
                }
            }
        });
    });
}
