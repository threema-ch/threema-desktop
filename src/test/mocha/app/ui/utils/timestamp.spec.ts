import {expect} from 'chai';

import {formatDurationBetween} from '~/app/ui/utils/timestamp';

export function run(): void {
    describe('Timestamp utils', function () {
        it('correctly formats duration between two dates', function () {
            // Units
            const MILLISECOND = 1;
            const SECOND = 1000 * MILLISECOND;
            const MINUTE = 60 * SECOND;
            const HOUR = 60 * MINUTE;
            const DAY = 24 * HOUR;

            // Dates
            const now = new Date();
            const nowInMilliseconds = now.getTime();

            // Expectations
            expect(formatDurationBetween(now, now)).to.equal(
                '0:00',
                `A duration of 0 needs to be formatted as "0:00"`,
            );

            // One millisecond.
            expect(formatDurationBetween(new Date(nowInMilliseconds - MILLISECOND), now)).to.equal(
                '0:00',
                `A duration of 1 millisecond needs to be rounded down and formatted as "0:00"`,
            );

            // One Second.
            expect(formatDurationBetween(new Date(nowInMilliseconds - SECOND), now)).to.equal(
                '0:01',
                `A duration of 1 second needs to be formatted as "0:01"`,
            );

            // One second, one millisecond.
            expect(
                formatDurationBetween(new Date(nowInMilliseconds - SECOND - MILLISECOND), now),
            ).to.equal(
                '0:01',
                `A duration of 1 second and 1 millisecond needs to be rounded down and formatted as "0:01"`,
            );

            // One minute.
            expect(formatDurationBetween(new Date(nowInMilliseconds - MINUTE), now)).to.equal(
                '1:00',
                `A duration of 1 minute needs to be formatted as "1:00"`,
            );

            // One minute, one second.
            expect(
                formatDurationBetween(new Date(nowInMilliseconds - MINUTE - SECOND), now),
            ).to.equal(
                '1:01',
                `A duration of 1 minute and 1 second needs to be formatted as "1:01"`,
            );

            // One hour.
            expect(formatDurationBetween(new Date(nowInMilliseconds - HOUR), now)).to.equal(
                '1:00:00',
                `A duration of 1 hour needs to be formatted as "1:00:00"`,
            );

            // One hour, one minute, one second.
            expect(
                formatDurationBetween(new Date(nowInMilliseconds - HOUR - MINUTE - SECOND), now),
            ).to.equal(
                '1:01:01',
                `A duration of 1 hour, 1 minute and 1 second needs to be formatted as "1:01:01"`,
            );

            // One second to a day.
            expect(formatDurationBetween(new Date(nowInMilliseconds - DAY + SECOND), now)).to.equal(
                '23:59:59',
                `A duration of 1 day needs to be formatted as "23:59:59"`,
            );

            // One day.
            expect(formatDurationBetween(new Date(nowInMilliseconds - DAY), now)).to.equal(
                '1:00:00:00',
                `A duration of 1 day needs to be formatted as "1:00:00:00"`,
            );

            // One day, one hour.
            expect(formatDurationBetween(new Date(nowInMilliseconds - DAY - HOUR), now)).to.equal(
                '1:01:00:00',
                `A duration of 1 day and 1 hour needs to be formatted as "1:01:00:00"`,
            );

            // 365 days.
            expect(formatDurationBetween(new Date(nowInMilliseconds - 365 * DAY), now)).to.equal(
                '365:00:00:00',
                `A duration of 365 days needs to be formatted as "365:00:00:00"`,
            );
        });
    });
}
