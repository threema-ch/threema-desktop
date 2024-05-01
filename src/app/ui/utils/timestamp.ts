import type {I18nType} from '~/app/ui/i18n-types';
import type {u53} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {isToday, isWithinCurrentYear, isWithinLastWeek, isYesterday} from '~/common/utils/date';

/**
 * Format a date as a "fluent", localized string, while choosing the appropriate length
 * automatically (e.g., the year will only be included if it is different than current).
 *
 * Format variant:
 *  - `auto`: Shortest representation possible (relative to now).
 *  - `time`: Only display time.
 *  - `extended`: Longer, more detailed, and unambiguous display of date and time.
 *
 * @param date Date to format.
 * @param i18n Translation provider.
 * @param format Format variant to use (see above).
 * @param use24hTimeFormat Whether or not to use 24h time format. Defaults to true.
 * @returns Formatted date.
 */
export function formatDateLocalized(
    date: Date,
    i18n: I18nType,
    format: 'auto' | 'time' | 'extended' = 'auto',
    use24hTimeFormat = true,
): string {
    // Note: Be careful when changing these options. With some options (e.g. `{hourCycle: 'h23',
    // hour12: false}`), the format will silently revert to h24 (which does funny things like the
    // time "24:13").
    const formatOptionsOverrides: Intl.DateTimeFormatOptions = use24hTimeFormat
        ? {hourCycle: 'h23'}
        : {hour12: true};

    switch (format) {
        case 'auto':
            return formatDateLocalizedAuto(date, i18n, formatOptionsOverrides);

        case 'time':
            return formatDateLocalizedTime(date, i18n, formatOptionsOverrides);

        case 'extended':
            return formatDateLocalizedExtended(date, i18n, formatOptionsOverrides);

        default:
            return unreachable(format);
    }
}

function formatDateLocalizedTime(
    date: Date,
    i18n: I18nType,
    formatOptionsOverrides?: Intl.DateTimeFormatOptions,
): string {
    return new Intl.DateTimeFormat(i18n.locale, {
        hour: 'numeric',
        minute: '2-digit',
        ...formatOptionsOverrides,
    }).format(date);
}

function formatDateLocalizedExtended(
    date: Date,
    i18n: I18nType,
    formatOptionsOverrides?: Intl.DateTimeFormatOptions,
): string {
    return new Intl.DateTimeFormat(i18n.locale, {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        ...formatOptionsOverrides,
    }).format(date);
}

function formatDateLocalizedAuto(
    date: Date,
    i18n: I18nType,
    formatOptionsOverrides?: Intl.DateTimeFormatOptions,
): string {
    const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        ...formatOptionsOverrides,
    };

    if (isToday(date)) {
        const formatter = new Intl.DateTimeFormat(i18n.locale, timeOptions);

        // Example EN: "1:44 PM"
        // Example DE: "13:44"
        return formatter.format(date);
    }

    if (isYesterday(date)) {
        const formatter = new Intl.DateTimeFormat(i18n.locale, timeOptions);

        // Example EN: "Yesterday 1:44 PM"
        // Example DE: "Gestern, 13:44"
        return i18n.t('messaging.label--timestamp-yesterday', 'Yesterday {time}', {
            time: formatter.format(date),
        });
    }

    if (isWithinLastWeek(date)) {
        const formatter = new Intl.DateTimeFormat(i18n.locale, {
            weekday: 'long',
            ...timeOptions,
        });

        // Example EN: "Monday 1:44 PM"
        // Example DE: "Montag, 13:44"
        return formatter.format(date);
    }

    if (isWithinCurrentYear(date)) {
        const formatter = new Intl.DateTimeFormat(i18n.locale, {
            month: 'short',
            day: 'numeric',
            ...timeOptions,
        });

        // Example EN: "Jul 7, 1:44 PM"
        // Example DE: "7. Jul 13:44"
        return formatter.format(date);
    }

    const formatter = new Intl.DateTimeFormat(i18n.locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...timeOptions,
    });

    // Example EN: "Jul 7, 2023, 1:44 PM"
    // Example DE: "7. Jul 2023, 13:44"
    return formatter.format(date);
}

/**
 * Format the difference between two `Date`s as `DD:HH:MM:SS`. Note: Units that are larger than
 * needed to format the difference will be cut off (e.g., a difference of 9 minutes will result in
 * `"9:00"`, not `"00:00:09:00"`).
 *
 * @param from `Date` that denotes the start of the duration.
 * @param to `Date` that denotes the end of the duration.
 * @returns Formatted duration as a string.
 */
export function formatDurationBetween(from: Date, to: Date): string {
    const totalMs = to.getTime() - from.getTime();
    const totalMsAbs = Math.abs(totalMs);
    const isNegative = totalMs <= -1000;

    const days = Math.trunc(totalMsAbs / 86400000);
    const hours = Math.trunc(totalMsAbs / 3600000) % 24;
    const minutes = Math.trunc(totalMsAbs / 60000) % 60;
    const seconds = Math.trunc(totalMsAbs / 1000) % 60;

    if (days > 0) {
        return `${isNegative ? '-' : ''}${days}:${padDurationComponent(hours)}:${padDurationComponent(minutes)}:${padDurationComponent(seconds)}`;
    } else if (hours > 0) {
        return `${isNegative ? '-' : ''}${hours}:${padDurationComponent(minutes)}:${padDurationComponent(seconds)}`;
    }

    return `${isNegative ? '-' : ''}${minutes}:${padDurationComponent(seconds)}`;
}

/**
 * Converts the given value to a string and adds leading zeroes to reach the given length.
 *
 * @param value The value to pad.
 * @param length Length of the resulting string.
 * @returns The padded string of the given length.
 */
function padDurationComponent(value: u53, length: u53 = 2): string {
    const s = value.toString();
    const zeroes = length - s.length + 1;

    return new Array(zeroes).join('0').concat(s);
}
