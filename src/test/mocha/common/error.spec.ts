import {expect} from 'chai';

import {extractErrorMessage} from '~/common/error';

export class CustomError extends Error {
    public constructor(message: string, options?: ErrorOptions) {
        super(message, options);
    }
}

export function run(): void {
    describe('errors', function () {
        describe('extractErrorMessage', function () {
            it('handles errors without cause', () => {
                const short = extractErrorMessage(new Error('oh no'), 'short');
                const long = extractErrorMessage(new Error('oh no'), 'long');
                expect(short).to.equal('Error: oh no');
                expect(long).to.equal('Error: oh no');
            });

            it('handles errors with 1 cause', () => {
                const error = new Error('oh no', {cause: new Error('this is why')});
                const short = extractErrorMessage(error, 'short');
                const long = extractErrorMessage(error, 'long');
                expect(short).to.equal('Error: oh no | Caused by: Error: this is why');
                expect(long).to.equal('Error: oh no\n  Caused by: Error: this is why');
            });

            it('handles errors with recursive cause', () => {
                const e3 = new Error('innermost');
                const e2 = new Error('middle', {cause: e3});
                const e1 = new Error('outermost', {cause: e2});
                const short = extractErrorMessage(e1, 'short');
                const long = extractErrorMessage(e1, 'long');
                expect(short).to.equal(
                    'Error: outermost | Caused by: Error: middle | Caused by: Error: innermost',
                );
                expect(long).to.equal(
                    'Error: outermost\n  Caused by: Error: middle\n  Caused by: Error: innermost',
                );
            });

            it('handles custom error types', () => {
                const message = extractErrorMessage(
                    new CustomError('an erreur', {cause: new Error('errare humanum est')}),
                    'short',
                );
                expect(message).to.equal(
                    'CustomError: an erreur | Caused by: Error: errare humanum est',
                );
            });
        });
    });
}
