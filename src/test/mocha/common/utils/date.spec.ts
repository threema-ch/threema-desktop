import {expect} from 'chai';

import {durationToString, durationToUnits} from '~/common/utils/date';

export function run(): void {
    describe('utils::date', function () {
        describe('durationToUnits', function () {
            it('0 seconds', function () {
                expect(durationToUnits(0)).to.deep.equal({hours: 0, minutes: 0, seconds: 0});
            });

            it('negative values', function () {
                expect(durationToUnits(-99)).to.deep.equal({hours: 0, minutes: 0, seconds: 0});
            });

            it('59 seconds', function () {
                expect(durationToUnits(59)).to.deep.equal({hours: 0, minutes: 0, seconds: 59});
            });

            it('60 seconds', function () {
                expect(durationToUnits(60)).to.deep.equal({hours: 0, minutes: 1, seconds: 0});
            });

            it('3599 seconds', function () {
                expect(durationToUnits(3599)).to.deep.equal({hours: 0, minutes: 59, seconds: 59});
            });

            it('3600 seconds', function () {
                expect(durationToUnits(3600)).to.deep.equal({hours: 1, minutes: 0, seconds: 0});
            });

            it('259262 seconds', function () {
                expect(durationToUnits(259262)).to.deep.equal({hours: 72, minutes: 1, seconds: 2});
            });
        });

        describe('durationToUnits', function () {
            it('0 seconds', function () {
                expect(durationToString(0)).to.equal('00:00');
            });

            it('negative values', function () {
                expect(durationToString(-99)).to.equal('00:00');
            });

            it('59 seconds', function () {
                expect(durationToString(59)).to.equal('00:59');
            });

            it('60 seconds', function () {
                expect(durationToString(60)).to.equal('01:00');
            });

            it('3599 seconds', function () {
                expect(durationToString(3599)).to.equal('59:59');
            });

            it('3600 seconds', function () {
                expect(durationToString(3600)).to.equal('01:00:00');
            });

            it('259262 seconds', function () {
                expect(durationToString(259262)).to.equal('72:01:02');
            });

            it('442800 seconds', function () {
                expect(durationToString(442800)).to.equal('123:00:00');
            });
        });
    });
}
