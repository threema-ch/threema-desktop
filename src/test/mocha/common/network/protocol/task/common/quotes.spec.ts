import {expect} from 'chai';

import {
    parsePossibleTextQuote,
    serializeQuoteText,
} from '~/common/network/protocol/task/common/quotes';
import {randomMessageId} from '~/common/network/protocol/utils';
import {ensureMessageId, type MessageId} from '~/common/network/types';
import {hexLeToU64} from '~/common/utils/number';
import {StringLogger} from '~/test/mocha/common/backend-mocks';
import {pseudoRandomBytes} from '~/test/mocha/common/utils';

// Minimal crypto backend
const crypto = {randomBytes: pseudoRandomBytes};

/**
 * Config tests.
 */
export function run(): void {
    describe('Quotes', function () {
        const log = new StringLogger();
        describe('parsePossibleTextQuote', function () {
            function parse(
                text: string,
                messageId?: MessageId,
            ): {readonly quotedMessageId: MessageId; readonly comment: string} | undefined {
                return parsePossibleTextQuote(text, log, messageId ?? randomMessageId(crypto));
            }

            it('handles text without quotes', function () {
                const parsed = parse('hello world');
                expect(parsed).to.be.undefined;
            });

            it('handles empty text', function () {
                const parsed = parse('');
                expect(parsed).to.be.undefined;
            });

            it('handles quotes v2', function () {
                const parsed = parse('> quote #00112233ccddeeff\n\nThis is the comment');
                expect(parsed).not.to.be.undefined;
                expect(parsed?.quotedMessageId).to.equal(
                    ensureMessageId(hexLeToU64('00112233ccddeeff')),
                );
                expect(parsed?.comment).to.equal('This is the comment');
            });

            it('rejects recursive quotes', function () {
                const text = '> quote #00112233ccddeeff\n\nComment';
                const messageId1 = ensureMessageId(hexLeToU64('00112233ccddeeff'));
                const messageId2 = ensureMessageId(hexLeToU64('ffffffffffffffff'));
                expect(parse(text, messageId1)).to.be.undefined;
                expect(parse(text, messageId2)).not.to.be.undefined;
            });
        });

        describe('serializeQuoteText', function () {
            const messageId1 = ensureMessageId(hexLeToU64('00112233ccddeeff'));

            it('creates quotes v2 quote', function () {
                const comment = 'This is the comment';

                const serializedQuote = serializeQuoteText(messageId1, comment);
                expect(serializedQuote).to.equal(
                    '> quote #00112233ccddeeff\n\nThis is the comment',
                );
            });

            it('creates quote with empty comment', function () {
                const serializedQuote = serializeQuoteText(messageId1, '');
                expect(serializedQuote).to.equal('> quote #00112233ccddeeff\n\n');
            });
        });
    });
}
